# Component Patterns - Motionify PM Portal

**Purpose**: Standard patterns for React components

**Reference Examples**:
- `/src/lib/portal/components/TaskItem.tsx` - Complex component with state
- `/src/lib/portal/components/ProjectOverview.tsx` - Data display component
- `/src/lib/portal/components/NotificationBell.tsx` - Interactive component

---

## Standard Component Structure

```typescript
// 1. IMPORTS
import React, { useState, useEffect, useContext } from 'react';
import { IconName } from 'lucide-react';
import { TypeName } from '../types';
import { utilityFunction } from '../utils/helpers';

// 2. INTERFACE
interface ComponentNameProps {
  requiredProp: string;
  optionalProp?: number;
  onAction: (data: TypeName) => void;
}

// 3. COMPONENT FUNCTION
export function ComponentName({
  requiredProp,
  optionalProp = 0,
  onAction
}: ComponentNameProps) {

  // 4. HOOKS
  const [localState, setLocalState] = useState<string>('');
  const { globalState } = useContext(SomeContext);

  useEffect(() => {
    // side effects
  }, [dependencies]);

  // 5. EVENT HANDLERS
  const handleClick = () => {
    setLocalState('new value');
    onAction(someData);
  };

  // 6. HELPER FUNCTIONS (if simple)
  const formatValue = (val: string) => {
    return val.toUpperCase();
  };

  // 7. EARLY RETURNS
  if (!requiredProp) {
    return <div>Loading...</div>;
  }

  // 8. RENDER
  return (
    <div className="p-4">
      {/* JSX */}
    </div>
  );
}
```

---

## Component Types

### 1. Data Display Components

**Purpose**: Show information, minimal interaction

**Example**: `ProjectOverview.tsx`

**Pattern**:
```typescript
interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="space-y-6">
      <h1>{project.name}</h1>
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Client" value={project.client} />
        <InfoCard label="Status" value={project.status} />
      </div>
    </div>
  );
}
```

**Characteristics**:
- No local state (or minimal)
- Receives data via props
- Focuses on layout and presentation
- Uses sub-components for reusability

---

### 2. Interactive Components

**Purpose**: Handle user input, manage local state

**Example**: `TaskItem.tsx`

**Pattern**:
```typescript
interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export function TaskItem({ task, onUpdate }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdate({ ...task, status: newStatus });
  };

  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {task.title}
      </button>
      {isExpanded && (
        <div>
          {/* expanded content */}
        </div>
      )}
    </div>
  );
}
```

**Characteristics**:
- Local state for UI state (expanded, editing, etc.)
- Callbacks for data changes
- Validation before calling callbacks
- Optimistic updates

---

### 3. Container Components

**Purpose**: Connect global state to presentation

**Example**: `ProjectManagerDashboard.tsx`

**Pattern**:
```typescript
export function ProjectManagerDashboard() {
  const { projects, createProject } = useContext(ProjectContext);
  const { user } = useContext(UserContext);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateProject = (data: CreateProjectData) => {
    createProject(data);
    setShowCreateModal(false);
  };

  return (
    <div>
      <ProjectList projects={projects} />
      {showCreateModal && (
        <CreateProjectModal onSubmit={handleCreateProject} />
      )}
    </div>
  );
}
```

**Characteristics**:
- Manages modal/dialog state
- Connects context to child components
- Handles data flow between components
- Minimal presentation logic

---

## Common Patterns

### Conditional Rendering

```typescript
// ✅ GOOD - Clear conditions
if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

if (!data) {
  return <EmptyState />;
}

return <DataView data={data} />;

// ❌ AVOID - Nested ternaries
return isLoading ? <Loading /> : error ? <Error /> : <Data />;
```

### Lists & Keys

```typescript
// ✅ GOOD - Use unique IDs
{tasks.map(task => (
  <TaskItem key={task.id} task={task} />
))}

// ❌ WRONG - Index as key (unless list is static)
{tasks.map((task, index) => (
  <TaskItem key={index} task={task} />
))}
```

### Event Handlers

```typescript
// ✅ GOOD - Inline arrow for simple cases
<button onClick={() => setOpen(true)}>Open</button>

// ✅ GOOD - Named function for complex logic
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  // complex logic
};
<form onSubmit={handleSubmit}>

// ❌ WRONG - Creating function in render
<button onClick={function() { /* ... */ }}>Click</button>
```

### Optional Chaining & Nullish Coalescing

```typescript
// ✅ GOOD
const assignee = task?.assignee?.name ?? 'Unassigned';
const tags = project?.tags ?? [];

// ❌ RISKY
const assignee = task.assignee.name || 'Unassigned';
// Problem: fails if task is undefined
```

---

## Styling Patterns

### Layout Classes

```typescript
// ✅ GOOD - Organized, readable
<div className="
  flex items-center justify-between
  p-4 gap-3
  bg-white border border-gray-200 rounded-lg
  hover:bg-gray-50 transition-colors
">
  {/* content */}
</div>
```

### Conditional Classes

```typescript
// ✅ GOOD - Template literals
<div className={`
  px-3 py-1 rounded-full text-sm
  ${status === 'completed' ? 'bg-green-100 text-green-800' : ''}
  ${status === 'pending' ? 'bg-gray-100 text-gray-800' : ''}
`}>
  {status}
</div>

// ✅ BETTER - Helper function for complex cases
const getStatusClasses = (status: TaskStatus) => {
  const base = 'px-3 py-1 rounded-full text-sm';
  const variants = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
  };
  return `${base} ${variants[status]}`;
};

<div className={getStatusClasses(task.status)}>
```

---

## Form Patterns

### Controlled Inputs

```typescript
const [formData, setFormData] = useState({
  title: '',
  description: '',
});

const handleChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

<input
  value={formData.title}
  onChange={(e) => handleChange('title', e.target.value)}
/>
```

### Form Submission

```typescript
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();

  // Validation
  if (!formData.title.trim()) {
    setError('Title is required');
    return;
  }

  // Submit
  onSubmit(formData);

  // Reset
  setFormData({ title: '', description: '' });
};

<form onSubmit={handleSubmit}>
  {/* inputs */}
  <button type="submit">Submit</button>
</form>
```

---

## Modal Patterns

### Modal Component

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

### Usage

```typescript
const [showModal, setShowModal] = useState(false);

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Create Task"
>
  <TaskForm onSubmit={handleSubmit} />
</Modal>
```

---

## Loading & Empty States

### Loading State

```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
```

### Empty State

```typescript
if (tasks.length === 0) {
  return (
    <div className="text-center p-8 text-gray-500">
      <p>No tasks yet</p>
      <button onClick={onCreateTask}>Create First Task</button>
    </div>
  );
}
```

---

## Performance Patterns

### useMemo for Expensive Calculations

```typescript
const filteredTasks = useMemo(() => {
  return tasks.filter(task => {
    if (filter === 'my-tasks') return task.assigneeId === user.id;
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });
}, [tasks, filter, user.id]);
```

### useCallback for Passed Callbacks

```typescript
const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
  setTasks(prev => prev.map(t =>
    t.id === taskId ? { ...t, ...updates } : t
  ));
}, []);

// Now this callback won't cause child re-renders
<TaskItem task={task} onUpdate={handleTaskUpdate} />
```

---

## Accessibility Patterns

### Buttons

```typescript
<button
  type="button"
  aria-label="Close modal"
  onClick={onClose}
>
  <X size={20} />
</button>
```

### Forms

```typescript
<label htmlFor="task-title">
  Task Title
  <input
    id="task-title"
    type="text"
    aria-required="true"
    aria-invalid={!!error}
  />
</label>
{error && (
  <div role="alert" className="text-red-600">
    {error}
  </div>
)}
```

---

**Last Updated**: 2025-11-06
**Reference**: See actual components in `/src/lib/portal/components/`
**Maintained By**: Claude