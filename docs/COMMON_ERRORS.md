# Common Errors - Motionify PM Portal

**Purpose**: Document known issues and how to fix them

**How to Use**:
- Before fixing a bug, check if it's listed here
- After fixing a bug, add it here with `/add-error`
- Prevents repeating the same mistakes

---

## React / TypeScript Errors

### Error: "Cannot read property 'X' of undefined"

**Symptoms**: App crashes when accessing nested properties

**Cause**: Not checking if parent object exists before accessing properties

**Fix**: Use optional chaining

**Example**:
```typescript
// ❌ WRONG - crashes if task is undefined
const title = task.title;

// ✅ CORRECT - safe access
const title = task?.title ?? 'Untitled';
```

**Files to Check**: All components accessing props or context data

---

### Error: "Objects are not valid as a React child"

**Symptoms**: Error when trying to render an object

**Cause**: Trying to render object directly in JSX

**Fix**: Convert to string or render specific properties

**Example**:
```typescript
// ❌ WRONG
<div>{task}</div>

// ✅ CORRECT
<div>{task.title}</div>
<div>{JSON.stringify(task)}</div> // for debugging
```

---

### Error: "Maximum update depth exceeded"

**Symptoms**: Infinite render loop, browser freezes

**Cause**: Setting state inside render without conditions, or in useEffect without dependencies

**Fix**: Move state updates to event handlers or fix useEffect dependencies

**Example**:
```typescript
// ❌ WRONG - infinite loop
useEffect(() => {
  setCount(count + 1);
}); // no dependency array!

// ✅ CORRECT
useEffect(() => {
  // Only run once on mount
  fetchData();
}, []);

// ✅ CORRECT - event handler
const handleClick = () => {
  setCount(count + 1);
};
```

---

### Error: "React Hook useEffect has missing dependencies"

**Symptoms**: ESLint warning, possible stale data

**Cause**: useEffect uses variables not in dependency array

**Fix**: Add all dependencies, or use useCallback/useMemo

**Example**:
```typescript
// ❌ WRONG
useEffect(() => {
  if (taskId) {
    loadTask(taskId);
  }
}, []); // taskId is missing!

// ✅ CORRECT
useEffect(() => {
  if (taskId) {
    loadTask(taskId);
  }
}, [taskId]); // now it updates when taskId changes
```

---

### Error: "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined"

**Symptoms**: Runtime error when trying to render a component, component name shows as undefined

**Cause**: Component not exported from its file, or wrong import (default vs named)

**Fix**: Ensure component is properly exported and imported with correct syntax

**Example**:
```typescript
// ❌ WRONG - AppProvider not exported
// AppContext.tsx
export const AppContext = React.createContext(...);
// Missing: export function AppProvider() { ... }

// layout.tsx
import { AppProvider } from '@/lib/portal/AppContext';
<AppProvider>...</AppProvider> // ERROR: AppProvider is undefined

// ✅ CORRECT - export the component
// AppContext.tsx
export function AppProvider({ children }) {
  return <AppContext.Provider value={...}>{children}</AppContext.Provider>;
}

// layout.tsx
import { AppProvider } from '@/lib/portal/AppContext';
<AppProvider>...</AppProvider> // Works!
```

**Files**: `landing-page/src/lib/portal/AppContext.tsx`, any layout files using context providers

---

### Error: "Cannot read properties of undefined (reading 'reduce')" or similar array methods

**Symptoms**: Runtime error when calling array methods (reduce, map, filter) on undefined

**Cause**: Component receiving undefined prop instead of array, or prop not passed at all

**Fix**: Always pass required props, add safety checks, ensure context provides the data

**Example**:
```typescript
// ❌ WRONG - projects prop not passed
// DashboardPage.tsx
<ProjectManagerDashboard onSelectProject={handleSelect} />
// Missing: projects, currentUser, onUpdateProjectStatus, onAddProject

// ProjectManagerDashboard.tsx
const { inProgress } = useMemo(() => {
  return projects.reduce(...); // ERROR: projects is undefined
}, [projects]);

// ✅ CORRECT - pass all required props
// DashboardPage.tsx
const { projects, currentUser, updateProjectStatus, addProject } = useContext(AppContext);
<ProjectManagerDashboard 
  projects={projects}
  currentUser={currentUser}
  onSelectProject={handleSelect}
  onUpdateProjectStatus={updateProjectStatus}
  onAddProject={addProject}
/>

// ✅ ALSO CORRECT - add safety check in component
const { inProgress } = useMemo(() => {
  if (!projects || !Array.isArray(projects)) {
    return [];
  }
  return projects.reduce(...);
}, [projects]);
```

**Files**: Components receiving array props, especially from context (`ProjectManagerDashboard`, `Dashboard`, etc.)

---

## State Management Errors

### Error: State not updating after setState

**Symptoms**: Component doesn't re-render after state change

**Cause**: Mutating state directly instead of creating new reference

**Fix**: Use spread operator or array methods

**Example**:
```typescript
// ❌ WRONG - mutation
task.status = 'completed';
setTasks(tasks);

// ✅ CORRECT - immutable update
setTasks(tasks.map(t =>
  t.id === taskId ? { ...t, status: 'completed' } : t
));
```

**Reference**: See `CODING_CONVENTIONS.md` → State Management

---

### Error: Context value is undefined

**Symptoms**: `useContext` returns undefined

**Cause**: Component not wrapped in Provider, or Provider not in parent tree

**Fix**: Ensure component is child of Provider in `AppRoot.tsx`

**Example**:
```typescript
// ❌ WRONG - component outside Provider
<ComponentUsingContext />
<ProjectProvider>...</ProjectProvider>

// ✅ CORRECT - component inside Provider
<ProjectProvider>
  <ComponentUsingContext />
</ProjectProvider>
```

**Location**: Check `AppRoot.tsx` for Provider hierarchy

---

### Error: Context missing required properties

**Symptoms**: Component can't access properties from context (e.g., `projects`, `updateProjectStatus`)

**Cause**: Context type definition doesn't include the property, or context value doesn't provide it

**Fix**: Add property to context type definition and include it in context value

**Example**:
```typescript
// ❌ WRONG - property missing from context
// AppContext.tsx
export const AppContext = React.createContext<{
  project: Project | null;
  currentUser: User | null;
  // Missing: projects, updateProjectStatus, addProject
}>({...});

// DashboardPage.tsx
const { projects, updateProjectStatus } = useContext(AppContext);
// ERROR: properties don't exist on context type

// ✅ CORRECT - add to context type and value
// AppContext.tsx
export const AppContext = React.createContext<{
  project: Project | null;
  projects: Project[]; // Added
  currentUser: User | null;
  updateProjectStatus: (id: string, status: ProjectStatus) => void; // Added
  addProject: (data: {...}) => void; // Added
}>({...});

// In AppProvider:
const contextValue = useMemo(() => ({
  project: selectedProject,
  projects: projectsData, // Added
  currentUser,
  updateProjectStatus, // Added
  addProject, // Added
  // ... other values
}), [...]);
```

**Files**: `landing-page/src/lib/portal/AppContext.tsx`, components using context

---

## Task State Machine Errors

### Error: Invalid task status transition

**Symptoms**: Task status doesn't change, or shows error

**Cause**: Trying to transition to invalid state

**Fix**: Check `taskStateTransitions.ts` for valid transitions

**Example**:
```typescript
// ❌ WRONG - bypassing validation
setTask({ ...task, status: newStatus });

// ✅ CORRECT - validate first
import { canTransition } from '../utils/taskStateTransitions';

if (canTransition(task.status, newStatus, user.role)) {
  setTask({ ...task, status: newStatus });
} else {
  alert('Invalid status transition');
}
```

**Reference**: `landing-page/src/lib/portal/utils/taskStateTransitions.ts`

---

### Error: User can change task status they shouldn't be able to

**Symptoms**: Client can mark tasks "in progress", etc.

**Cause**: Not checking user role in `canTransition`

**Fix**: Always pass `user.role` to validation

**Example**:
```typescript
// ❌ WRONG - no role check
if (canTransition(from, to)) { ... }

// ✅ CORRECT - role-based validation
if (canTransition(from, to, user.role)) { ... }
```

---

## Styling Errors

### Error: Tailwind classes not applying

**Symptoms**: Styles don't appear in browser

**Cause**: Dynamic class names, purged by Tailwind

**Fix**: Use full class names, not string concatenation

**Example**:
```typescript
// ❌ WRONG - classes may be purged
const color = 'red';
<div className={`text-${color}-600`}>

// ✅ CORRECT - full class names
<div className={status === 'error' ? 'text-red-600' : 'text-gray-600'}>
```

---

### Error: Spacing inconsistent across components

**Symptoms**: Some elements use 12px padding, others 16px

**Cause**: Not following 8pt grid

**Fix**: Use Tailwind spacing: p-2 (8px), p-4 (16px), p-6 (24px)

**Example**:
```typescript
// ❌ WRONG - arbitrary values
<div className="p-[12px]">

// ✅ CORRECT - 8pt grid
<div className="p-4"> // 16px
```

**Reference**: `CODING_CONVENTIONS.md` → Styling & Design

---

## TypeScript Errors

### Error: Type 'string | undefined' is not assignable to type 'string'

**Symptoms**: TypeScript error when passing optional values

**Cause**: Not providing fallback for optional values

**Fix**: Use nullish coalescing operator

**Example**:
```typescript
// ❌ WRONG
const name: string = user.name; // might be undefined

// ✅ CORRECT
const name: string = user.name ?? 'Anonymous';
```

---

### Error: Property does not exist on type

**Symptoms**: TypeScript complains about accessing property

**Cause**: Type definition missing the property

**Fix**: Add property to interface in `types.ts`

**Example**:
```typescript
// ❌ WRONG - property not in interface
interface Task {
  id: string;
  title: string;
}
task.status // ERROR: property 'status' doesn't exist

// ✅ CORRECT - add to interface
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}
```

**Location**: `/landing-page/src/lib/portal/types.ts`

---

## Build / Development Errors

### Error: Module not found

**Symptoms**: Import fails, "cannot find module"

**Cause**: Wrong import path, file doesn't exist

**Fix**: Check file path, use correct relative path

**Example**:
```typescript
// ❌ WRONG - incorrect path
import { Task } from './types';

// ✅ CORRECT - relative to current file
import { Task } from '../types';
```

---

### Error: Unexpected token '<'

**Symptoms**: Build error, syntax error

**Cause**: JSX in .js file instead of .jsx/.tsx

**Fix**: Rename file with .tsx extension

---

## Common Gotchas

### Issue: Page refreshes and loses mock data

**Cause**: Mock data only in memory, not persisted

**Current Workaround**: User in localStorage (temporary)

**Future Fix**: Backend will persist all data

---

### Issue: State updates but UI doesn't

**Cause**: React doesn't detect change (same reference)

**Fix**: Create new object/array reference

**Example**:
```typescript
// ❌ WRONG - same reference
tasks[0].status = 'completed';
setTasks(tasks);

// ✅ CORRECT - new reference
setTasks([...tasks]); // force new array reference
```

---

### Issue: Icons not showing

**Cause**: Not imported from lucide-react

**Fix**: Always use Lucide React icons

**Example**:
```typescript
// ❌ WRONG
import CheckIcon from '@heroicons/react';

// ✅ CORRECT
import { Check } from 'lucide-react';
<Check size={20} />
```

---

### Issue: Infinite redirect loop between pages

**Symptoms**: Page keeps reloading/redirecting repeatedly, browser becomes unresponsive

**Cause**: 
1. Mismatch in localStorage keys (one page stores as 'key1', another checks 'key2')
2. Redirect logic in useEffect runs on every render without guards
3. Page A redirects to Page B, Page B redirects back to Page A

**Fix**: 
1. Use consistent localStorage keys across all pages
2. Add useRef guards to prevent multiple redirects
3. Check both possible keys for compatibility during migration

**Example**:
```typescript
// ❌ WRONG - redirect loop
// login/page.tsx
useEffect(() => {
  const user = localStorage.getItem('portal_user');
  if (user) {
    router.push('/portal'); // Always redirects
  }
}, [router]); // Runs on every render!

// portal/layout.tsx
useEffect(() => {
  const user = localStorage.getItem('currentUser'); // Different key!
  if (!user) {
    router.push('/login'); // Redirects back
  }
}, [router]);

// ✅ CORRECT - prevent loops
// login/page.tsx
const hasCheckedAuthRef = useRef(false);
useEffect(() => {
  if (hasCheckedAuthRef.current) return;
  hasCheckedAuthRef.current = true;
  
  // Check both keys for compatibility
  const user = localStorage.getItem('portal_user') || localStorage.getItem('currentUser');
  if (user) {
    router.push('/portal');
  }
}, [router]);

// portal/layout.tsx
const hasRedirectedRef = useRef(false);
useEffect(() => {
  if (hasRedirectedRef.current) return;
  
  // Check both keys for compatibility
  const user = localStorage.getItem('portal_user') || localStorage.getItem('currentUser');
  if (!user) {
    hasRedirectedRef.current = true;
    router.push('/login');
  }
}, [router]);
```

**Files**: `landing-page/src/app/login/page.tsx`, `landing-page/src/app/portal/layout.tsx`, `landing-page/src/app/portal/page.tsx`

---

## Template for New Errors

```markdown
### Error: [Error message or symptom]

**Symptoms**: [What you see when this happens]

**Cause**: [Why this error occurs]

**Fix**: [How to solve it]

**Example**:
```typescript
// ❌ WRONG
[code that causes error]

// ✅ CORRECT
[code that fixes it]
```

**Files**: [Which files commonly have this issue]

**Reference**: [Link to relevant docs if applicable]
```

---

**Last Updated**: 2025-01-27
**How to Add**: Run `/add-error` command when fixing a bug
**Maintained By**: Claude