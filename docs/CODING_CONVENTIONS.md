# Coding Conventions - Motionify PM Portal

**Purpose**: Rules and patterns Claude must follow when writing code

**How to Update**: Run `/update-conventions` to add new rules

---

## TypeScript

### Type Safety

**DO**:
- ✅ Define interfaces in `types.ts` for all data structures
- ✅ Use proper types for function parameters and return values
- ✅ Use type guards when necessary (`typeof`, `instanceof`)
- ✅ Export types for reuse across files

**DON'T**:
- ❌ Use `any` type - always define proper types
- ❌ Use `@ts-ignore` - fix the actual type issue
- ❌ Define types inline - add to `types.ts`
- ❌ Use implicit `any` (e.g., `function foo(x)` instead of `function foo(x: string)`)

**Example**:
```typescript
// ✅ CORRECT
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

function updateTask(task: Task): void {
  // implementation
}

// ❌ WRONG
function updateTask(task: any) {
  // implementation
}
```

---

## React Components

### Component Structure

**Standard Order**:
1. Imports (React, icons, types, utils)
2. Interface/type definitions
3. Component function
4. Hooks (useState, useEffect, useContext)
5. Event handlers
6. Helper functions
7. Return/JSX

**Example**:
```typescript
import React, { useState, useContext } from 'react';
import { Check } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { canTransition } from '../utils/taskStateTransitions';

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export function TaskItem({ task, onUpdate }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useContext(UserContext);

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (canTransition(task.status, newStatus, user.role)) {
      onUpdate({ ...task, status: newStatus });
    }
  };

  return (
    <div>{/* JSX */}</div>
  );
}
```

### Naming Conventions

**DO**:
- ✅ PascalCase for components: `TaskItem`, `ProjectDashboard`
- ✅ camelCase for functions: `handleSubmit`, `updateTask`
- ✅ camelCase for variables: `isLoading`, `taskList`
- ✅ UPPER_CASE for constants: `MAX_FILE_SIZE`, `DEFAULT_REVISIONS`
- ✅ Descriptive names: `handleTaskStatusChange` not `handleChange`

**DON'T**:
- ❌ Generic names: `data`, `item`, `temp`
- ❌ Abbreviations: `usr`, `proj`, `idx`
- ❌ Single letters except loop counters: `i`, `j`

---

## State Management

### Use Existing Context

**DO**:
- ✅ Use `ProjectContext` for project data
- ✅ Use `UserContext` for user/auth data
- ✅ Import from `AppRoot.tsx`

**DON'T**:
- ❌ Create new Context providers without discussion
- ❌ Duplicate state across components
- ❌ Store API response data directly in state (use derived state)

### Immutable Updates

**DO**:
- ✅ Use spread operator for objects: `{ ...obj, newProp: value }`
- ✅ Use map/filter for arrays: `arr.map(item => ...)`
- ✅ Create new references, don't mutate

**DON'T**:
- ❌ Mutate state directly: `obj.prop = value`
- ❌ Push to arrays: `arr.push(item)`
- ❌ Use array index as key unless list is static

**Example**:
```typescript
// ✅ CORRECT
setTasks(tasks.map(t =>
  t.id === task.id ? { ...t, status: 'completed' } : t
));

// ❌ WRONG
const task = tasks.find(t => t.id === taskId);
task.status = 'completed';
setTasks(tasks);
```

---

## Task Management

### State Transitions

**ALWAYS**:
- ✅ Use `taskStateTransitions.ts` for validation
- ✅ Check `canTransition(from, to, role)` before updating
- ✅ Show error if transition invalid

**NEVER**:
- ❌ Bypass state machine
- ❌ Allow direct status updates without validation
- ❌ Hard-code transition logic in components

**Example**:
```typescript
import { canTransition } from '../utils/taskStateTransitions';

const handleStatusChange = (newStatus: TaskStatus) => {
  if (!canTransition(task.status, newStatus, user.role)) {
    alert('Invalid status transition');
    return;
  }
  updateTask({ ...task, status: newStatus });
};
```

---

## Styling & Design

### Tailwind CSS

**DO**:
- ✅ Use Tailwind utility classes
- ✅ Follow 8pt grid: `p-2` (8px), `p-4` (16px), `p-6` (24px)
- ✅ Use design tokens from `design-ui-notes.md`
- ✅ Keep classes organized (layout → spacing → colors → typography)

**DON'T**:
- ❌ Use inline styles unless absolutely necessary
- ❌ Create custom CSS files (use Tailwind)
- ❌ Use arbitrary values excessively (`p-[13px]`)

### Todoist Aesthetic

**DO**:
- ✅ Minimal UI - only necessary elements
- ✅ Generous whitespace
- ✅ Subtle shadows: `shadow-sm`, `shadow-md`
- ✅ Neutral colors + 1 brand color
- ✅ Clean borders: `border border-gray-200`

**DON'T**:
- ❌ Heavy shadows or gradients
- ❌ Too many colors
- ❌ Decorative elements
- ❌ Complex animations

---

## Icons

**ALWAYS**:
- ✅ Use Lucide React icons (per user preference)
- ✅ Import from `lucide-react`
- ✅ Consistent size: `size={20}` or `className="w-5 h-5"`

**NEVER**:
- ❌ Use other icon libraries
- ❌ Mix icon styles
- ❌ Use emoji as icons

**Example**:
```typescript
import { Check, X, ChevronRight } from 'lucide-react';

<Check size={20} className="text-green-600" />
```

---

## File Organization

### Imports

**Order**:
1. React imports
2. Third-party imports
3. Local type imports
4. Local component imports
5. Local utility imports

**Example**:
```typescript
import React, { useState, useContext } from 'react';
import { Check } from 'lucide-react';
import { Task, TaskStatus, User } from '../types';
import { TaskItem } from './TaskItem';
import { canTransition } from '../utils/taskStateTransitions';
```

### File Names

**DO**:
- ✅ PascalCase for components: `TaskItem.tsx`, `ProjectDashboard.tsx`
- ✅ camelCase for utilities: `taskStateTransitions.ts`, `activityLogger.ts`
- ✅ Match component name to file name

**DON'T**:
- ❌ kebab-case: `task-item.tsx`
- ❌ Multiple components per file (except small, related ones)

---

## Error Handling

**DO**:
- ✅ Use optional chaining: `data?.property`
- ✅ Provide fallbacks: `data?.items ?? []`
- ✅ Show user-friendly error messages
- ✅ Log errors for debugging

**DON'T**:
- ❌ Let app crash on undefined
- ❌ Show technical error messages to users
- ❌ Silently swallow errors

**Example**:
```typescript
// ✅ CORRECT
const taskTitle = task?.title ?? 'Untitled';
const comments = task?.comments ?? [];

// ❌ WRONG
const taskTitle = task.title; // crashes if task is undefined
```

---

## Comments & Documentation

### When to Comment

**DO Comment**:
- ✅ Complex business logic
- ✅ Non-obvious workarounds
- ✅ Important TODOs
- ✅ Regex patterns
- ✅ Magic numbers

**DON'T Comment**:
- ❌ Obvious code
- ❌ What code does (write clear code instead)
- ❌ Old commented-out code (delete it)

**Example**:
```typescript
// ✅ GOOD - explains WHY
// Client must accept terms before accessing project (US-025)
if (!project.termsAccepted && user.role === 'client') {
  return <OnboardingAgreement />;
}

// ❌ BAD - explains WHAT (already obvious)
// Check if terms accepted
if (!project.termsAccepted) {
  ...
}
```

---

## Performance

**DO**:
- ✅ Use `useMemo` for expensive computations
- ✅ Use `useCallback` for passed-down callbacks
- ✅ Lazy load large components
- ✅ Debounce search inputs

**DON'T**:
- ❌ Premature optimization
- ❌ Over-use memoization (measure first)
- ❌ Create functions inside render (use `useCallback`)

---

## Testing (Future)

**When Backend is Built**:
- ✅ Write unit tests for utilities
- ✅ Write integration tests for critical flows
- ✅ Test state machine transitions
- ✅ Test role-based permissions

---

## Git Commits

**Format**:
```
type: brief description

- Detailed change 1
- Detailed change 2

Files changed:
- path/to/file.tsx
- path/to/another.ts
```

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructure
- `docs:` - Documentation
- `style:` - Design/styling changes
- `test:` - Tests
- `chore:` - Build, config, etc.

---

**Last Updated**: 2025-11-06
**How to Add**: Run `/update-conventions <rule>`
**Maintained By**: Claude