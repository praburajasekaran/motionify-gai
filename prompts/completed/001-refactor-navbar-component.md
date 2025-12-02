<objective>
Refactor the navbar component in `components/Layout.tsx` to create a cleaner, more streamlined user interface by removing redundant elements and optimizing the search functionality.

This refactoring will improve the user experience by eliminating duplicate information, making the interface less cluttered, and optimizing space usage in the fixed header.
</objective>

<context>
The current navbar in the Motionify PM Portal has several redundancies and sizing issues:

1. **Duplicate project name**: The project title appears in the navbar but is also prominently displayed in the hero section directly below, making the navbar display redundant
2. **Missing label**: The RevisionBattery component shows "1 of 3" but lacks context - users need to see "Revisions" to understand what the numbers represent
3. **Oversized search bar**: The search input is `w-64` (256px) but only triggers a modal when clicked, so it doesn't need to be large
4. **Redundant button**: The "New Project" button appears in the navbar but is also available on the Projects list page

**File to modify**: `components/Layout.tsx`

**Tech stack**: React, TypeScript, Tailwind CSS, React Router
</context>

<requirements>
Make the following 4 changes to `components/Layout.tsx`:

### 1. Remove Project Name from Navbar
**Location**: Lines 217-222 (approximately)

Remove the project title display and its divider that appear in the navbar when viewing a project page:
```tsx
{/* Project Name */}
<span className="text-base font-semibold text-foreground hidden md:block">
  {currentProject.title}
</span>

{/* Divider */}
<div className="h-6 w-px bg-zinc-300 hidden md:block" />
```

**WHY**: The project name is already displayed prominently in the hero section below the fixed navbar, making this navbar display redundant and cluttering the header space.

### 2. Add "Revisions" Label to RevisionBattery Component
**Location**: Lines 46-70 (approximately) - within the `RevisionBattery` component

Update the component to include a "Revisions" label for better context. Change the display from just showing "1 of 3" to showing "Revisions" followed by "1 of 3".

Modify the structure to add a label before the count:
```tsx
<span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
  Revisions
</span>
<span className={cn("text-xs font-bold leading-none", textColor)}>
  {remaining} of {max}
</span>
```

Adjust the parent container's gap from `gap-2` to `gap-3` for better visual hierarchy and spacing.

**WHY**: Without the "Revisions" label, users may not immediately understand what the "1 of 3" numbers represent. The label provides essential context.

### 3. Make Search Bar Significantly Smaller
**Location**: Lines 266-279 (approximately)

Reduce the search input size substantially:
- Change width from `w-64` (256px) to `w-40` (160px)
- Optionally reduce height from `h-9` to `h-8` for even more space savings
- Keep the search icon and keyboard shortcut badges (⌘K) visible

**WHY**: Since clicking the search bar opens a command palette modal, it only needs to be discoverable and clickable - not large enough for actual typing. The current size wastes valuable navbar space.

### 4. Remove "New Project" Button from Navbar
**Location**: Lines 281-293 (approximately)

Remove both:
1. The divider before the button (line 281):
```tsx
<div className="h-6 w-px bg-zinc-200 hidden md:block" />
```

2. The entire Link and Button component (lines 288-293):
```tsx
<Link to="/projects/new">
  <Button size="sm" variant="gradient" className="hidden sm:flex gap-2 rounded-full px-5 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
    <Plus className="h-4 w-4" />
    New Project
  </Button>
</Link>
```

**WHY**: The "New Project" functionality is already prominently available on the Projects list page. Having it in the navbar is redundant and takes up valuable space that could be better used.
</requirements>

<implementation>
Work through the changes systematically:

1. First, read `components/Layout.tsx` to understand the current structure
2. Make each change carefully, ensuring proper syntax and maintaining the component's functionality
3. After removing elements, check if any parent container classes need adjustment (e.g., gap spacing)
4. Preserve all existing functionality - only remove/modify visual elements
5. Maintain responsive design considerations (hidden/block classes for different screen sizes)
</implementation>

<verification>
Before declaring the task complete, verify your changes:

1. **Read the modified file** to ensure all 4 changes were applied correctly
2. **Check syntax**: Ensure no JSX errors, unclosed tags, or TypeScript issues
3. **Verify line removals**: Confirm the project name, divider, and New Project button sections are completely removed
4. **Verify additions**: Confirm the "Revisions" label was added to RevisionBattery
5. **Verify modifications**: Confirm the search bar width was reduced from w-64 to w-40

Manual testing checklist (for user to verify):
- [ ] Navigate to `/projects/5823632` and verify project name is NOT in navbar
- [ ] Verify project name is still visible in the hero section below the navbar
- [ ] Verify "Revisions" label appears before the count in the battery component
- [ ] Verify search bar is noticeably smaller but still clickable
- [ ] Verify "New Project" button is removed from navbar
- [ ] Verify no layout breaks or alignment issues
- [ ] Test responsive behavior on mobile, tablet, and desktop sizes
</verification>

<success_criteria>
The task is complete when:
1. ✅ Project name and its divider are removed from the navbar (lines ~217-222 deleted)
2. ✅ "Revisions" label appears in the RevisionBattery component with proper styling
3. ✅ Search bar width is reduced from w-64 to w-40 (or similar smaller size)
4. ✅ "New Project" button and its divider are removed (lines ~281-293 deleted)
5. ✅ No syntax errors or TypeScript issues
6. ✅ All existing functionality remains intact
7. ✅ Responsive design is maintained across screen sizes
</success_criteria>
