# Testing Guide: Inline Video Comment Timeline

## Overview
This guide covers testing the new inline comment tooltip feature for video deliverables.

## Access the Feature

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```
   Server should be at: http://localhost:3000

2. **Navigate to the deliverables**:
   - Go to any project (e.g., `/projects/1`)
   - Click on the "Deliverables" tab
   - Find a video deliverable with "rejected" status (e.g., "Brand Animation Intro")
   - Click "Review" to open the deliverable

3. **Request a revision to see the video comment UI**:
   - Click "Request Revision" button
   - This opens the RevisionRequestForm with the VideoCommentTimeline component

## Test Scenarios

### ✅ Test 1: View Existing Comments
**Steps:**
1. Look at the video timeline (the progress bar at the bottom when you hover)
2. Existing comments show as amber circular markers on the timeline
3. Hover over a marker → should see tooltip with timestamp and first 50 chars of comment
4. Click on a marker → should see inline tooltip in top-right corner of video showing:
   - Timestamp badge (amber)
   - Full comment text
   - Delete button
   - Close (X) button

**Expected Result:**
- Tooltip appears smoothly (slide-in animation from right)
- White background with 2px amber border
- Video seeks to the comment timestamp when clicked
- Markers scale up on hover (125%)

### ✅ Test 2: Add New Comment
**Steps:**
1. Click on an EMPTY spot on the timeline (not on a marker)
2. Should see "Add comment at X:XX" form appear in top-right corner
3. Type a comment in the textarea
4. Click "Add Comment" button

**Expected Result:**
- Form appears with slide-in animation
- Textarea is auto-focused
- Video seeks to the clicked timestamp
- After submission:
  - New amber marker appears on timeline
  - Form closes automatically
  - Comment is added to the list

### ✅ Test 3: Delete Comment
**Steps:**
1. Click on an existing comment marker
2. In the tooltip, click "Delete comment" link (red text)
3. Confirm the marker disappears from timeline

**Expected Result:**
- Comment removed immediately
- Marker disappears from timeline
- Tooltip closes

### ✅ Test 4: Switch Between Comments
**Steps:**
1. Click on one comment marker → tooltip appears
2. Click on a DIFFERENT marker (without closing the first)
3. Should switch to showing the new comment

**Expected Result:**
- Tooltip content updates immediately
- Video seeks to new timestamp
- Only one tooltip visible at a time

### ✅ Test 5: Close Tooltip
**Steps:**
1. Open a comment tooltip or add comment form
2. Click the X button in top-right corner
3. Tooltip should close

**Expected Result:**
- Tooltip disappears
- Timeline remains interactive

### ✅ Test 6: Timeline Seeking
**Steps:**
1. Click on empty timeline space
2. Note the timestamp in the "Add comment at X:XX" message
3. Check if video seeks to that exact timestamp

**Expected Result:**
- Video playhead moves to clicked position
- Timestamp shown in form matches video position
- Accuracy within 0.1 seconds

### ✅ Test 7: Marker Visibility and Positioning
**Steps:**
1. Add comments at various timestamps (beginning, middle, end)
2. Check if markers are positioned correctly
3. Verify active marker (currently open tooltip) is larger and darker

**Expected Result:**
- Markers positioned accurately on timeline
- Active marker: 4x4px, amber-600
- Inactive markers: 3x3px, amber-500
- All markers have white border and shadow

### ✅ Test 8: Form Validation
**Steps:**
1. Click empty timeline to open add comment form
2. Try to submit with empty textarea
3. Button should be disabled

**Expected Result:**
- "Add Comment" button is disabled when textarea is empty
- Button enabled only when text is entered

### ✅ Test 9: Comment Count Badge
**Steps:**
1. Look below the video player
2. Should see amber pill badge showing comment count

**Expected Result:**
- Shows: "{N} timeline comment(s)"
- Helper text: "Click markers on timeline to view"
- Only appears when comments exist

### ✅ Test 10: Video Controls Integration
**Steps:**
1. Hover over video to show controls
2. Click timeline with controls visible
3. Play/pause video while tooltip is open

**Expected Result:**
- Tooltip doesn't interfere with video controls
- Controls remain visible on hover
- Tooltip positioned above controls (top-right corner)

## Edge Cases to Test

### 📋 Edge Case 1: Very Long Comments
1. Add a comment with 500+ characters
2. Check if tooltip handles overflow properly

**Current Behavior:** No max-height or scroll implemented
**Consider:** May need to add `max-h-[300px] overflow-y-auto` if this is an issue

### 📋 Edge Case 2: Multiple Comments Close Together
1. Add 3-4 comments within a 2-second window
2. Check if markers overlap or are distinguishable

**Current Behavior:** 10px click threshold helps, but visual clustering may occur
**Consider:** Stacking or offset markers if needed

### 📋 Edge Case 3: Mobile/Touch Interaction
1. Test on mobile viewport (resize browser to 375px width)
2. Try clicking markers with finger-sized touch targets

**Current Behavior:** 10px threshold should help
**Expected:** May need larger markers or touch targets on mobile

### 📋 Edge Case 4: Fullscreen Mode
1. Click fullscreen button on video
2. Add/view comments in fullscreen

**Current Behavior:** Should work but needs testing
**Expected:** Tooltip should remain visible and positioned correctly

### 📋 Edge Case 5: Video Loading States
1. Test with slow network (throttle in dev tools)
2. Try adding comments before video metadata loads

**Current Behavior:** Duration needed for positioning calculations
**Expected:** May need to disable timeline clicks until video loads

### 📋 Edge Case 6: Keyboard Accessibility
1. Try to tab to timeline markers
2. Try to close tooltip with ESC key
3. Try to navigate with arrow keys

**Current Behavior:** Not implemented
**Consider:** Add keyboard navigation for accessibility

## Visual Regression Checks

### 🎨 Design Consistency
- [ ] Amber color scheme matches rest of app (amber-500/600/400)
- [ ] Tooltip white background matches design system
- [ ] Border width (2px) is consistent
- [ ] Shadow depth matches other elevated elements
- [ ] Border radius matches design system (rounded-lg)
- [ ] Typography sizes match design system (text-sm, text-xs)

### 🎨 Animation Quality
- [ ] Slide-in animation is smooth (200ms duration)
- [ ] No janky or flickering transitions
- [ ] Marker hover scale is smooth
- [ ] No layout shifts when tooltip appears

## Performance Checks

### ⚡ Interaction Responsiveness
- [ ] Clicking timeline feels instant (< 100ms to show tooltip)
- [ ] No lag when switching between comments
- [ ] Video seeking doesn't freeze UI
- [ ] Adding/deleting comments is instant

### ⚡ Memory/Resources
- [ ] No memory leaks when opening/closing tooltips repeatedly
- [ ] Event listeners properly cleaned up (check React DevTools)

## Regression Tests

### 🔄 Ensure These Still Work
- [ ] Video play/pause
- [ ] Volume controls
- [ ] Fullscreen toggle
- [ ] Timeline seeking (without clicking markers)
- [ ] Keyboard shortcut: Space to play/pause
- [ ] Video watermark overlay displays correctly
- [ ] General feedback textarea in revision form (separate from timeline comments)

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Known Limitations

1. **No keyboard navigation** - Users cannot tab to markers or use arrow keys
2. **No ARIA labels** - Screen readers won't announce markers or comment count
3. **No max-height on tooltip** - Very long comments might make tooltip too tall
4. **No marker clustering** - Multiple comments close together may overlap
5. **No loading state** - No spinner while video metadata loads

## Success Criteria

The feature is working correctly if:
- ✅ All 10 main test scenarios pass
- ✅ No console errors appear
- ✅ Build completes without TypeScript errors
- ✅ Visual design matches specification (amber theme, top-right positioning)
- ✅ Performance is smooth (no lag or jank)
- ✅ No regression in existing video player features

## Quick Test Data

Use the mock deliverable "Brand Animation Intro" (del-003) which has 3 pre-existing comments:
- **2.5s**: "Logo reveal starts too slowly here - needs more energy"
- **5.0s**: "This blue color (#0052CC) should be updated to our new brand blue (#0066FF)"
- **8.0s**: "Consider adding a subtle sound effect for the logo lock-up"

Video URL: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4`

---

## Reporting Issues

If you find bugs, note:
1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Browser/device** (where it occurred)
5. **Console errors** (if any)
