# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Portal Work

### Portal
The authenticated Motionify Studio workspace where internal users and clients manage the lifecycle from inquiry through proposal, project execution, deliverable review, and payment.

### Landing Page
The public Motionify Studio website surface that introduces the studio and routes prospective clients into inquiry or work-request flows before they enter the Portal.

### Client
The customer-side user or organization receiving Motionify Studio work; clients can submit inquiries, review proposals, follow projects, and act on deliverables according to their role.

### Inquiry
A pre-project customer request that captures contact details, quiz answers, and desired video or creative work before Motionify Studio creates a proposal.

### Proposal
The offer Motionify Studio prepares from an inquiry or project request, describing the proposed work, pricing, and next action expected from the client.

### Proposal Comment
A conversation entry attached to a Proposal that must remain visible across proposal review, linked Project history, admin activity, and recipient notifications.

### Proposal Handoff
The transition from an accepted paid Proposal into a Project while preserving the source Inquiry, Proposal, Payment, and client context.

The handoff is complete only when the Project is persisted, linked records point at it, and authorized users can open it from the proposal journey.

### Proposal Revision Cycle
The negotiation loop where a client asks for changes to a Proposal and Motionify Studio updates the offer before sending it back for another client decision.

The cycle is not complete when feedback is received; it requires an internal update step before the revised Proposal is sent again.

### Accepted Paid Proposal
A Proposal that the client has accepted through the payment path and whose required advance payment has completed.

This is the state that makes Proposal Handoff eligible; acceptance alone is not enough when the payment requirement has not been satisfied.

### Payment
A financial obligation or completed transaction tied to a Proposal or Project, used to control whether paid handoffs, project access, or final deliverable release can proceed.

Payment records may exist before a Project is available, so payment views need proposal, project, and client context to explain what the payment is for.

### Project
The active workspace for approved client work after intake and proposal steps, containing team activity, tasks, deliverables, files, revisions, and client-visible progress.

### Task
A manually managed unit of project work inside a Project, owned by Motionify users rather than generated automatically by the system.

### Deliverable
A client-reviewable output within a project, such as a video, image, or document, that moves through review, approval, revision, payment, and final delivery states.
