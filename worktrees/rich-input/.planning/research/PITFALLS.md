# Domain Pitfalls: Real-Time Comment Thread Systems

**Domain:** Real-time comment/thread systems for 1:1 conversations
**Research Date:** January 20, 2026
**Project Context:** Adding comment feature to existing proposal management app (serverless, authenticated users)
**Confidence Level:** HIGH

## Executive Summary

This document catalogs critical pitfalls specific to implementing real-time comment thread systems, with particular attention to the Motionify context: existing production app, 1:1 conversation model (client ↔ superadmin), and serverless infrastructure. The most dangerous pitfalls fall into three categories: real-time synchronization failures during network instability, database schema design for threaded conversations at scale, and file attachment security vulnerabilities that can lead to server compromise. Each pitfall includes warning signs, prevention strategies, and phase mapping for when the issue should be addressed during roadmap execution.

---

## Critical Pitfalls

Mistakes that cause complete system failures, data loss, or security breaches. These require proactive prevention before implementation begins.

### 1. Thundering Herd on WebSocket Reconnection

**What Goes Wrong:** When the WebSocket server restarts (deployment, crash, network blip), thousands of clients attempt to reconnect simultaneously. This creates a massive CPU and memory spike that often crashes the newly restarted server before it can handle the load.

**Why It Happens:** Clients use naive reconnection logic with fixed intervals (e.g., "retry every 5 seconds"). When a deployment affects all clients at once, they all reconnect at the exact same millisecond, creating a coordinated load spike.

**Real-World Example:** After a deployment, 50,000 clients hit the `/ws` endpoint simultaneously. The server exhausts its connection pool and file descriptors immediately, crashing before it can accept any connections.

**Motionify-Specific Risk:** Medium. If the real-time system serves many concurrent users and deployment causes simultaneous disconnections, this could impact availability during the transition period.

**Warning Signs:**
- Server crashes or connection timeouts immediately after deployments
- Monitoring shows 100% CPU usage on WebSocket servers
- Connection pool exhaustion errors in logs
- Users report inability to reconnect after brief network issues

**Prevention Strategy:**
1. **Implement Exponential Backoff with Jitter:** Client reconnection should use a formula like `base_delay * 2^n + random_jitter`. Start with 1 second, then 2-3 seconds, then 5-10 seconds with random variance to spread reconnections over time.
2. **Connection Rate Limiting:** Configure the WebSocket server to gracefully reject excess connections with a "try again later" response rather than crashing.
3. **Staged Rollouts:** Deploy WebSocket server changes gradually across instances rather than all at once.
4. **Connection State Persistence:** Use Redis or another distributed store to track connection state so reconnecting clients can resume quickly.

**Phase to Address:** Infrastructure Setup (Phase 1) - WebSocket infrastructure should include proper reconnection logic from day one.

**Sources:**
- WebSocket scalability documentation confirms thundering herd is a well-known issue at scale
- Socket.IO troubleshooting guide covers reconnection patterns
- Disqus real-time architecture case study

---

### 2. Race Conditions in Optimistic Comment Updates

**What Goes Wrong:** Modern UIs show comments instantly (optimistic update) before server confirmation. If users post multiple comments rapidly or edit and post simultaneously, comments arrive at the server out of order. The UI shows [B, A] but the server processes A, then B, creating permanent ordering discrepancies. Worse, if Comment B references a parent ID from Comment A that hasn't been committed yet, the server rejects B entirely.

**Why It Happens:** Client-side optimistic updates don't account for network latency variance. Two rapid clicks on "Post" result in two HTTP requests that may arrive in reverse order. The UI displays them locally in click order, but the server has them in arrival order.

**Real-World Example:** User clicks "Reply" on Comment A twice (double-click). Comment B (second click) arrives before Comment A (first click). Comment B references `parent_id: A` which doesn't exist yet. Server returns 400 error. UI shows B temporarily, then removes it. User is confused and posts B again, causing duplicates.

**Warning Signs:**
- Users report "missing" comments that they definitely posted
- Comments appear in wrong order after page refresh
- "Comment not found" errors referencing parent comments that exist
- Server logs show 400 errors on valid-looking requests

**Prevention Strategy:**
1. **Client-Side Request Queueing:** Implement a mutation queue that ensures requests are sent sequentially, even if the user clicks rapidly. The second click waits for the first request to complete.
2. **Client-Generated UUIDs:** Generate comment IDs on the client before sending. The server accepts and acknowledges the pre-assigned ID, eliminating race conditions.
3. **Sequence Numbers:** Use client-incrementing sequence numbers that the server enforces ordering against.
4. **React 19 useOptimistic:** For React implementations, use the `useOptimistic` hook with request-level IDs to discard stale server responses.
5. **Parent ID Validation:** When receiving a reply, validate parent ID exists in database (not just in-flight). If not found, queue the reply until parent is committed.

**Phase to Address:** Core Comment Feature (Phase 2) - Optimistic UI patterns should be designed alongside the backend API.

---

### 3. Duplicate Message Delivery on WebSocket Reconnection

**What Goes Wrong:** When a WebSocket connection drops and reconnects, clients receive duplicate messages. This happens because subscription handlers registered during reconnection create duplicate subscriptions to the same channel, causing each message to be delivered multiple times.

**Why It Happens:** The connection lifecycle event (e.g., `onConnect`) calls `.subscribe()` which creates new subscriptions. Old subscriptions from the previous connection persist but aren't cleaned up properly. When messages arrive, both old and new subscriptions receive them.

**Real-World Example:** User disconnects for 5 seconds due to network flicker. Reconnects. The chat room receives a new message, but the user sees it 3 times because they now have 3 subscription handlers for the same room.

**Warning Signs:**
- Users report seeing the same comment 2-3 times
- WebSocket logs show multiple subscription events per connection
- Connection logs show frequent disconnects/reconnects
- Memory growth on client-side from accumulating subscription handlers

**Prevention Strategy:**
1. **Unsubscribe Before Resubscribe:** When reconnecting, explicitly call `.unsubscribe()` on stored subscription references before creating new ones.
2. **Connection State Tracking:** Maintain a `connectionId` that the server acknowledges. Only process messages with a connectionId that matches the current connection.
3. **Deduplication Layer:** Implement client-side message deduplication using a Set of seen message IDs.
4. **Socket.IO Acknowledgements:** Use Socket.IO's built-in duplicate detection with `clientOffset` and UNIQUE constraints on the server.

**Phase to Address:** Real-time Infrastructure (Phase 1-2) - WebSocket implementation must include proper cleanup and deduplication.

**Sources:**
- Socket.IO troubleshooting documentation explicitly covers duplicate event registration
- STOMP-js library has documented issues with duplicate subscriptions on auto-reconnect
- Supabase Realtime debugging guide covers duplicate topic handling

---

### 4. Deep Nesting Recursive Query Performance

**What Goes Wrong:** Using a simple `parent_id` adjacency list for threaded comments requires recursive queries or multiple self-joins. As threads grow deep (50+ levels), query time degrades exponentially. A thread with 1,000 replies takes 2+ seconds to load because the database performs 50-level recursive joins.

**Why It Happens:** Adjacency lists (parent_id) are intuitive but require recursive CTEs (Common Table Expressions) to reconstruct the tree. PostgreSQL recursive CTEs have performance characteristics that degrade with depth. Each level adds computational cost.

**Real-World Example:** A "Reddit-style" discussion on a proposal goes 50 levels deep. Each user loads the page and waits 5 seconds for comments to appear. Users complain about performance. Database CPU spikes to 100% during peak usage.

**Warning Signs:**
- Page load time increases as threads grow deeper
- Database query analysis shows recursive CTE scans on comments table
- Database CPU usage correlates with comment thread depth
- Users in active threads report slow loading

**Prevention Strategy:**
1. **Materialized Path Pattern:** Store a `path` column (e.g., `1.5.23`) that encodes the tree hierarchy. Fetch entire subtrees with a single `LIKE '1.5.%'` query using the PostgreSQL `ltree` extension.
2. **Closure Tables:** Use a separate table to store all ancestor-descendant relationships. Subtree retrieval becomes O(1) at the cost of O(N²) space.
3. **Limit Nesting Depth:** Cap thread depth at a reasonable level (e.g., 10 levels) and flatten deeper replies into a flat view.
4. **Pagination with Cursor:** For very long threads, load comments in batches using cursor-based pagination instead of loading the entire tree at once.

**Phase to Address:** Database Schema (Phase 1) - Choose the tree storage pattern before implementing the comment table.

---

### 5. File Upload Remote Code Execution (Critical Security)

**What Goes Wrong:** Comment file attachments allow unauthenticated attackers to upload malicious files (PHP shells, web shells) that execute on the server, leading to complete server compromise. The wpDiscuz WordPress plugin vulnerability (CVE-2020-24186) allowed this on 70,000+ sites.

**Why It Happens:** File type validation relies on easily spoofed `Content-Type` headers or file extensions. Attackers upload PHP files disguised as images by changing the extension (e.g., `shell.php.jpg`) or the Content-Type header. Server executes the file when accessed.

**Real-World Example:** Attacker posts a comment on a public proposal with an attachment. The attachment is `reverseshell.php` with Content-Type: `image/jpeg`. The application saves it to the web-accessible uploads folder. Attacker requests the file directly, getting a shell on the server.

**Warning Signs:**
- File uploads accept any extension without validation
- Uploaded files are served from a web-accessible directory
- No virus/malware scanning on uploaded files
- Files are renamed but keep dangerous extensions hidden

**Prevention Strategy:**
1. **Magic Byte Validation:** Verify file content by checking magic bytes (file signatures), not just extensions or Content-Type headers.
2. **Strict Allowlist:** Only accept specific file types (e.g., images: jpg, png, gif; documents: pdf, docx). Block executable extensions absolutely (php, js, exe, sh).
3. **Store Outside Web Root:** Store uploaded files in S3/GCS or a directory not accessible via web URL. Serve files through an API endpoint that validates access before generating a presigned URL.
4. **Virus Scanning:** Run ClamAV or similar on all uploads before accepting them.
5. **Rename on Upload:** Generate new filenames (UUIDs) and strip original extensions. Re-add extension only after content validation.
6. **Image Processing Library:** Process images through a library (Sharp, ImageMagick) which will fail on non-image files.

**Phase to Address:** File Attachments Feature (Phase 3) - Security must be designed into file upload from the start, not retrofitted.

**Sources:**
- OWASP File Upload Cheat Sheet
- WordPress wpDiscuz CVE-2020-24186 vulnerability disclosure
- PortSwigger Web Security file upload vulnerabilities guide

---

### 6. Orphaned File Storage Rot

**What Goes Wrong:** When users delete comments, the associated files remain in cloud storage (S3, GCS) indefinitely. Storage costs accumulate, and "zombie files" consume budget without any visibility into what's active or orphaned.

**Why It Happens:** Comment deletion deletes the database record but doesn't trigger file deletion in storage. The storage layer has no knowledge of the application database. Files are only removed if explicitly deleted by the application.

**Real-World Example:** A user uploads 50MB videos to 100 comments over a year. They delete their account or remove the comments. The database shows no comments with attachments, but S3 contains 100 files totaling 5GB. Monthly storage bill includes $50 for orphaned files that will never be accessed.

**Warning Signs:**
- Storage bucket grows faster than the number of active attachments
- Attachment count in database doesn't match file count in storage
- No garbage collection job exists for attachments
- Deleted comments still show file references in logs

**Prevention Strategy:**
1. **Application Hooks:** Use database triggers or application-level hooks (e.g., `afterDestroy` in Sequelize) to delete files when comments are deleted.
2. **Garbage Collection Job:** Implement a daily background job that cross-references the storage bucket with the attachments table to find and delete unlinked files.
3. **Soft Delete for Files:** Mark files as `deleted` in the database and include them in cleanup queries. Actually delete from storage in batches.
4. **Lifecycle Policies:** Configure S3/GCS lifecycle rules to automatically delete files older than N days if they're never referenced.

**Phase to Address:** File Attachments Feature (Phase 3) - Include garbage collection infrastructure from the start.

---

### 7. Soft Delete Tree Breakers

**What Goes Wrong:** When a parent comment is "deleted" (hard delete), all child comments lose their place in the tree structure. They either disappear entirely or appear as orphaned top-level comments, breaking the conversation flow.

**Why It Happens:** Hard delete removes the row with the `parent_id`. Child comments still have `parent_id` pointing to a non-existent record. The application can't reconstruct the tree, so children are lost.

**Real-World Example:** User posts a top-level comment: "This proposal needs revision." 50 replies follow in the thread. The original commenter decides to delete their comment. All 50 replies vanish from the UI because they're now orphaned.

**Warning Signs:**
- Users report "disappearing" replies when parent comments are deleted
- Database queries for comments return null for valid parent_id values
- No `deleted_at` column on comment table
- Users complain about lost conversation context

**Prevention Strategy:**
1. **Always Use Soft Deletes:** Set `deleted_at` timestamp instead of removing the row. Keep the `parent_id` and `path` intact.
2. **UI Treatment:** Show `[deleted]` placeholder in the UI where the comment was, maintaining the tree structure and context for replies.
3. **Query Filtering:** Update queries to filter `WHERE deleted_at IS NULL` when displaying comments, but preserve the data.
4. **Content Scrubbing:** Null out `content` and `user_id` on soft delete to protect privacy while maintaining structure.

**Phase to Address:** Database Schema (Phase 1) - Soft delete pattern must be implemented from the start.

---

### 8. Async Context Tenant Bleeding

**What Goes Wrong:** In multi-tenant applications, tenant context stored in thread-local storage or shared variables "bleeds" between requests. A comment from Tenant A appears in Tenant B's dashboard because the async context swapped during an await.

**Why It Happens:** Node.js async/await doesn't preserve mutable context across await boundaries. If `currentTenantId` is stored in a variable, it can change between setting and using it if another request is processed in between.

**Real-World Example:** Tenant A (Client Corp) posts a comment. During the async operation to save the comment, the event loop processes Tenant B's (Competitor Inc) request. `currentTenantId` becomes Competitor Inc. The comment is saved with `tenant_id = Competitor Inc`. Client Corp's sensitive proposal comment appears in Competitor Inc's view.

**Warning Signs:**
- Comments from one client appear in another client's dashboard
- Audit logs show comments created by users who don't belong to that tenant
- Multi-tenancy tests fail intermittently
- Database queries return cross-tenant data

**Prevention Strategy:**
1. **AsyncLocalStorage:** Use Node.js `AsyncLocalStorage` to propagate tenant context safely across await boundaries.
2. **Row-Level Security (RLS):** Implement PostgreSQL RLS so that `SELECT` without a `tenant_id` filter is physically impossible.
3. **Pass Tenant Explicitly:** Pass `tenantId` as the first parameter to every function instead of relying on global context.
4. **Transaction Scoping:** Bind tenant context to the database transaction, not the request.

**Phase to Address:** Database Schema (Phase 1) - Multi-tenancy isolation must be built into the data model.

**Sources:**
- Developer discussions on async context bleeding in multi-tenant apps
- PostgreSQL Row-Level Security documentation

---

### 9. Client Time Sorting Chaos

**What Goes Wrong:** Using the client's clock for "Created At" timestamps causes incorrect sorting. Users with system clocks set to the future have their comments appear at the "top" of chronological lists forever, even as genuinely new comments are added.

**Why It Happens:** Client-side timestamps are trusted for sorting. A user with a clock 1 hour fast has all their comments timestamped 1 hour in the future. Sorted chronologically, they always appear at the top.

**Real-World Example:** User's system clock is wrong (set to 2077). They post 3 comments on a proposal. All comments show timestamps 50 years in the future. In the UI, these comments always sort to the top, regardless of when other users post.

**Warning Signs:**
- Comments appear out of order compared to expected chronological sequence
- Timestamps show unrealistic future dates
- Sorting behavior differs between users
- User-reported "weird ordering" issues

**Prevention Strategy:**
1. **Always Use Server Time:** Generate timestamps on the server using `TIMESTAMP WITH TIME ZONE` in UTC.
2. **Reject Client Timestamps:** Never accept `created_at` from the client. Always set it on the server.
3. **Client-Side Rendering Only:** Use client libraries only for rendering relative times ("5 minutes ago") from the server timestamp.
4. **Timezone Storage:** Store everything in UTC. If you need local time display, store the user's timezone separately and convert during rendering.

**Phase to Address:** Core Comment Feature (Phase 2) - API should enforce server-side timestamps.

---

### 10. Migration Non-Nullable Foreign Key Failures

**What Goes Wrong:** Adding a `NOT NULL` comment table to an existing app fails in production because existing records don't satisfy the new constraint. The migration locks the table or fails entirely, leaving the database in an inconsistent state.

**Why It Happens:** Standard migration tools try to add a column and immediately apply `NOT NULL` constraint. If existing rows don't have values, the constraint application fails or requires scanning all rows.

**Real-World Example:** Add `comment_id` column to `Proposals` table to track the "latest comment." Migration runs on production with 1 million existing proposals. The `NOT NULL` constraint can't be applied because existing proposals have no comment_id. Migration hangs, then fails. Proposals table is locked during the attempt, causing downtime.

**Warning Signs:**
- Migration times out on production database with existing data
- `NOT NULL` constraint fails to apply
- Table locks block production traffic during migration
- Existing records have NULL values for new required columns

**Prevention Strategy:**
1. **Three-Step Migration Pattern:**
   - Step 1: Add column as **Nullable** (no constraint)
   - Step 2: Run batch backfill script to populate default values
   - Step 3: Alter column to **NOT NULL** and add constraint
2. **Zero-Downtime Indexes:** Use `CREATE INDEX CONCURRENTLY` (PostgreSQL) to build indexes in the background without locking writes.
3. **Online Schema Tools:** Use `gh-ost`, `pgroll`, or similar tools for large table migrations.
4. **Test on Staging First:** Run the full migration script on a production-sized staging dataset to identify performance issues.

**Phase to Address:** Database Schema (Phase 1) - Migration strategy should be planned before schema implementation.

**Sources:**
- Retool database migration best practices guide
- PostgreSQL CONCURRENTLY index creation documentation
- GitLab database migration patterns

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience. These require attention during implementation but won't cause catastrophic failures.

### 11. Permission Leakage via Direct File URLs

**What Goes Wrong:** Files are served via public URLs or predictable paths that bypass comment-level permission checks. An admin shares a direct S3 URL of a private attachment, and regular users can access it even though they can't view the comment.

**Why It Happens:** Files are stored with predictable names (e.g., `comment-123-attachment.pdf`) in a public bucket. Anyone who guesses or receives the URL can access the file without authentication, regardless of their comment permissions.

**Real-World Example:** Admin comments on a client's proposal with a confidential attachment (audit report). The admin copies the S3 URL and emails it to the client. The client forwards the email to a colleague. The colleague accesses the URL directly from S3, viewing the confidential report without ever having access to the proposal.

**Warning Signs:**
- Attachments are accessible via direct URL without authentication
- S3/GCS bucket is configured as public or has weak ACLs
- No access logging on attachment downloads
- Users share "direct links" to attachments

**Prevention Strategy:**
1. **Presigned URLs Only:** Never serve attachments via public URLs. Use presigned URLs (S3/GCS) with short expiration (5-15 minutes) generated after verifying user access to the parent comment.
2. **Proxy Endpoint:** Serve all attachments through an authenticated API endpoint that validates permissions before streaming the file.
3. **Private Buckets:** Configure storage buckets to block public access entirely. Require authentication for all access.
4. **Audit Logging:** Log all attachment access with user ID, comment ID, and timestamp.

**Phase to Address:** File Attachments Feature (Phase 3) - Implement presigned URL pattern from the start.

---

### 12. Materialized Path Sorting Failures

**What Goes Wrong:** Materialized path columns (e.g., `1.5.23`) sort incorrectly when thread ID components exceed single digits. `1.10` sorts before `1.2` alphabetically, breaking the displayed order.

**Why It Happens:** Path components are stored as strings. String sorting compares character-by-character: "1.10" vs "1.2" → "1.1" < "1.2", so "1.10" comes before "1.2" even though 10 > 2.

**Real-World Example:** Thread has comments at paths: `1`, `1.1`, `1.2`, ..., `1.9`, `1.10`, `1.11`. String sorting puts them in order: `1, 1.1, 1.10, 1.11, 1.2, 1.3...`. Users see comment `1.10` appear before comment `1.2`, breaking the conversation flow.

**Warning Signs:**
- Comments appear out of order after reaching 10+ replies at a level
- Sorting behavior changes after reaching certain thresholds
- Users report "comments jumping around" in threads
- Path-based queries return unexpected ordering

**Prevention Strategy:**
1. **Zero-Padded Paths:** Store path components with fixed-width zero padding: `001.005.023` instead of `1.5.23`. This ensures string sorting matches numeric sorting.
2. **Use PostgreSQL ltree Extension:** The `ltree` extension handles path storage and sorting correctly with numeric semantics.
3. **Sort in Application Layer:** Fetch paths as strings but sort the resulting tree in application code using numeric comparison.
4. **Convert to Nested Set Model:** For very complex trees, consider the nested set model which maintains explicit left/right bounds for correct ordering.

**Phase to Address:** Database Schema (Phase 1) - Choose path storage strategy that handles sorting correctly.

---

### 13. Eventual Consistency Comment Visibility Delays

**What Goes Wrong:** Comments posted by one user aren't immediately visible to other users due to eventual consistency in distributed systems. This creates confusion and duplicate posting when users don't see their comments appear instantly.

**Why It Happens:** Write-back caching, database replication lag, or CDN caching means new comments may take milliseconds to seconds to propagate to all read replicas or edge caches.

**Real-World Example:** User A posts a comment on a proposal. User A sees it immediately (optimistic update + single read). User B refreshes the page and doesn't see it for 2 seconds (awaiting cache invalidation). User A thinks the comment failed and posts it again, creating a duplicate.

**Warning Signs:**
- Users report "missing" comments that they definitely posted
- Comments appear after a page refresh but not immediately
- Database replication lag metrics show delays
- Cache hit rates show stale data being served

**Prevention Strategy:**
1. **Aggressive Cache Invalidation:** Invalidate comment caches immediately on write, don't rely on TTL-based expiration.
2. **Broadcast on Write:** When a comment is created, broadcast the new comment to all connected clients via WebSocket before (or while) writing to the database.
3. **Read-Your-Writes Consistency:** Design the API so that the requesting user always sees their own writes immediately, even if other users see a delay.
4. **WebSocket Confirmation:** Send WebSocket message to the creating user confirming the comment is persisted, then show optimistic comment as "synced."

**Phase to Address:** Real-time Infrastructure (Phase 1-2) - Consistency model should be documented and tested.

---

### 14. Large File Upload Timeouts

**What Goes Wrong:** Large file uploads fail due to server-side timeouts, client-side memory limits, or network interruptions. Users on slow connections or uploading large attachments (videos, high-res images) experience failures without clear error messages.

**Why It Happens:** Single-request uploads transfer the entire file in one HTTP POST. Proxies, load balancers, and application servers have timeout limits. Large files exceed these limits, causing the connection to terminate mid-upload.

**Real-World Example:** Client wants to upload a 100MB video attachment to a comment. After 30 seconds, the upload fails with "Connection Reset." Client tries again, fails again, and eventually gives up. The proposal lacks critical context from the video.

**Warning Signs:**
- Upload failures correlate with file size
- Client reports "Connection Reset" or "Gateway Timeout" errors
- Server logs show requests timing out
- No progress indicator during upload

**Prevention Strategy:**
1. **Chunked Uploads:** Implement chunked upload protocol that splits files into smaller pieces (e.g., 5MB chunks). Reassemble on server.
2. **Resumable Uploads:** Support upload resumption so interrupted uploads can continue from the last successful chunk.
3. **Timeout Configuration:** Configure server timeouts appropriately for expected file sizes (e.g., 5 minutes for 100MB files).
4. **Client Progress Indicators:** Show upload progress so users know something is happening.
5. **Presigned Multipart Upload:** Use S3/GCS multipart upload APIs for large files with automatic retry on failure.

**Phase to Address:** File Attachments Feature (Phase 3) - Design upload strategy for expected file sizes.

---

### 15. Polymorphic Association Data Integrity

**What Goes Wrong:** Using polymorphic associations (e.g., `commentable_id` + `commentable_type`) for comments on different entities (proposals, users, tasks) breaks foreign key constraints. Orphaned comments accumulate when parent entities are deleted.

**Why It Happens:** Database foreign keys can only reference one table. Polymorphic associations use a generic ID that could reference multiple tables, so no foreign key can enforce integrity. When a parent is deleted, comments point to a non-existent ID.

**Real-World Example:** A proposal is deleted. The 50 comments with `commentable_id = proposal.id` and `commentable_type = 'Proposal'` now point to a non-existent proposal. Running queries that JOIN comments to proposals fails or returns null. Some comments become inaccessible.

**Warning Signs:**
- Database queries return null for valid-looking parent references
- No foreign key constraints on commentable columns
- Deleted entities leave behind orphaned comments
- JOIN queries between comments and parent entities have unexpected results

**Prevention Strategy:**
1. **Separate Foreign Keys:** Use separate columns for each parent type (`proposal_id`, `task_id`, `user_id`) with a `CHECK` constraint ensuring exactly one is set.
2. **Link Table Pattern:** Create a `comment_threads` table that acts as a join between comments and their parent entities.
3. **Application-Level Cleanup:** Implement strict cleanup hooks that delete comments when parents are deleted.
4. **Daily Integrity Checks:** Run a job to detect and report orphaned comments.

**Phase to Address:** Database Schema (Phase 1) - Choose association pattern that maintains integrity.

**Sources:**
- GitLab documentation advises against polymorphic associations
- Thoughtbot discussions on polymorphic uniqueness constraints

---

## Minor Pitfalls

Mistakes that cause annoyance, minor bugs, or require cleanup but are fixable without major refactoring.

### 16. Mobile Upload Issues

**What Goes Wrong:** File uploads from mobile devices fail due to network interruptions, browser limitations, or battery-saving features that terminate background processes.

**Why It Happens:** Mobile browsers have stricter memory limits, may terminate uploads when the app is backgrounded, and cellular networks have higher latency and more frequent interruptions.

**Warning Signs:**
- Upload failures are reported more frequently from mobile users
- Large files fail more often on mobile than desktop
- Users report uploads "getting stuck" on mobile
- Battery-saving modes correlate with upload failures

**Prevention Strategy:**
1. **Chunked Uploads with Recovery:** Implement chunked uploads that can resume from any chunk.
2. **Background Upload APIs:** Use native background upload APIs (iOS Background Tasks, Android WorkManager) for large uploads.
3. **Compression:** Automatically compress images on mobile before upload.
4. **Retry Logic:** Implement automatic retry with exponential backoff for transient network failures.

**Phase to Address:** File Attachments Feature (Phase 3) - Test uploads on mobile devices.

---

### 17. Duplicate Comment Prevention Failures

**What Goes Wrong:** Users post the same comment multiple times due to network issues, UI confusion, or button mashing. The system accepts all duplicates, creating spam.

**Why It Happens:** Without idempotency keys, duplicate requests are treated as separate comments. Network timeouts cause users to retry, creating duplicates. No server-side detection of "same content, same user, same parent, same time."

**Warning Signs:**
- Users report "I only posted once but it shows 3 times"
- Same comment content appears multiple times from the same user
- Rapid-fire identical comments from a single user
- No duplicate detection in the moderation system

**Prevention Strategy:**
1. **Idempotency Keys:** Accept an optional `idempotency_key` from the client. If the same key is seen again, return the original comment instead of creating a duplicate.
2. **Content Similarity Detection:** For rapid posts from the same user, compare new comment content against recent comments.
3. **Request Deduplication:** Use Redis to track recent requests and prevent duplicate processing within a time window.
4. **Disable Button on Submit:** Simple UI pattern - disable the submit button immediately on click and re-enable on response.

**Phase to Address:** Core Comment Feature (Phase 2) - Include idempotency in API design.

---

### 18. Preview Generation Performance Degradation

**What Goes Wrong:** Generating previews (thumbnails, PDF thumbnails, document previews) for comment attachments consumes excessive CPU and causes slow page loads.

**Why It Happens:** Preview generation is CPU-intensive. Doing it synchronously during comment load blocks the UI. Caching is inconsistent or absent, causing repeated generation.

**Warning Signs:**
- Page load time increases with number of attachments
- High CPU usage correlates with preview generation
- Users report "spinning" or slow loading when comments have attachments
- Preview generation logs show repeated work for the same files

**Prevention Strategy:**
1. **Async Preview Generation:** Generate previews asynchronously after upload, not during comment retrieval.
2. **Aggressive Caching:** Cache generated previews permanently. Regenerate only if source file changes.
3. **Lazy Loading:** Load previews only when they scroll into view.
4. **Queue-Based Processing:** Use a job queue (Bull, RQ) to process preview generation without blocking web requests.

**Phase to Address:** File Attachments Feature (Phase 3) - Design preview generation as async process.

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| **1: Database Schema** | Tree Storage | Deep nesting performance | Use materialized path (ltree) from start |
| **1: Database Schema** | Migration | Non-nullable constraint failures | Three-step migration with CONCURRENTLY |
| **1: Database Schema** | Multi-tenancy | Async context bleeding | AsyncLocalStorage + RLS |
| **1-2: Real-time Infra** | WebSocket | Thundering herd on reconnect | Exponential backoff with jitter |
| **1-2: Real-time Infra** | Sync | Duplicate messages | Subscription cleanup + deduplication |
| **2: Core Comments** | Optimistic UI | Race conditions | Client-side queue + UUIDs |
| **2: Core Comments** | Timestamps | Client time sorting | Server-side UTC timestamps |
| **3: File Attachments** | Security | Malicious file upload | Magic byte validation + presigned URLs |
| **3: File Attachments** | Storage | Orphaned files | Hook-based cleanup + garbage collector |

---

## Motionify-Specific Concerns

Based on the codebase analysis and this domain research, Motionify should pay special attention to:

### High Priority for Motionify

1. **Tenant Isolation (Pitfall #8):** The 1:1 conversation model (client ↔ superadmin) requires absolute tenant isolation. Context bleeding would expose client data across tenants, which is a critical compliance issue.

2. **File Upload Security (Pitfall #5):** Adding file attachments to existing comments is a common attack vector. The wpDiscuz vulnerability (70,000+ sites) demonstrates how catastrophic this can be. Motionify should implement magic byte validation and presigned URLs from day one.

3. **Migration Safety (Pitfall #10):** The existing production app means migrations must be zero-downtime. Use `CREATE INDEX CONCURRENTLY` and three-step nullable column additions.

4. **Date Handling (Pitfall #9):** Consistent UTC handling is critical for audit trails and legal compliance in proposal management. Server timestamps only.

### Medium Priority for Motionify

5. **WebSocket Reconnection (Pitfall #1):** If superadmins and clients both use real-time chat, deployment-related disconnections should be graceful.

6. **Soft Delete (Pitfall #7):** Proposals and their comments are audit-relevant. Soft delete preserves context even if a user requests deletion.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Real-time sync pitfalls | HIGH | Well-documented patterns, multiple authoritative sources |
| Database schema pitfalls | HIGH | Standard patterns from production systems |
| File attachment security | HIGH | OWASP guidelines and CVE analyses |
| Migration strategies | HIGH | PostgreSQL documentation and case studies |
| Motionify-specific concerns | MEDIUM | Applied domain knowledge to Motionify context |

---

## Sources

- WebSocket scalability documentation (websocket.org)
- Socket.IO troubleshooting and connection guides
- Disqus real-time architecture case study (highscalability.com)
- OWASP File Upload Cheat Sheet
- WordPress wpDiscuz CVE-2020-24186 vulnerability disclosure
- GitLab polymorphic association documentation
- PostgreSQL ltree extension documentation
- Retool database migration best practices
- Supabase Realtime debugging guide
- Socket.IO client delivery guarantees documentation
