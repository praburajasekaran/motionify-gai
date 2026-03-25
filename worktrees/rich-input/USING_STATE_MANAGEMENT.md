# 📘 Using State Management & API Contracts

## Overview

This project uses **TanStack Query** for state management and **Zod** for API contracts.

---

## 🎯 Quick Start

### 1. Setup QueryProvider in App.tsx

Already done! But here's what it looks like:

```typescript
import { QueryProvider } from '@/shared/providers/QueryProvider';

function App() {
  return (
    <QueryProvider>
      {/* Your app */}
    </QueryProvider>
  );
}
```

### 2. Use Hooks in Components

**Before (Manual Fetching)**:
```typescript
function InquiryList() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/.netlify/functions/inquiries')
      .then(res => res.json())
      .then(setInquiries)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{/* render */}</div>;
}
```

**After (TanStack Query)**:
```typescript
import { useInquiries } from '@/shared/hooks';

function InquiryList() {
  const { data: inquiries, isLoading } = useInquiries();

  if (isLoading) return <div>Loading...</div>;
  return <div>{/* render */}</div>;
}
```

---

## 🔥 Common Patterns

### Fetch List
```typescript
import { useInquiries } from '@/shared/hooks';

function InquiryDashboard() {
  const { data, isLoading, error } = useInquiries();
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <InquiryTable data={data} />;
}
```

### Fetch Single Item
```typescript
import { useInquiry } from '@/shared/hooks';

function InquiryDetail({ id }: { id: string }) {
  const { data: inquiry, isLoading } = useInquiry(id);
  
  if (isLoading) return <Spinner />;
  if (!inquiry) return <NotFound />;
  
  return <div>{inquiry.contactName}</div>;
}
```

### Create Item
```typescript
import { useCreateInquiry } from '@/shared/hooks';

function InquiryForm() {
  const createInquiry = useCreateInquiry();
  
  async function handleSubmit(data) {
    try {
      await createInquiry.mutateAsync(data);
      toast.success('Inquiry created!');
    } catch (error) {
      toast.error(error.message);
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={createInquiry.isPending}>
        {createInquiry.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Update Item (Optimistic Update)
```typescript
import { useUpdateInquiry } from '@/shared/hooks';

function StatusDropdown({ inquiry }) {
  const updateInquiry = useUpdateInquiry();
  
  function handleStatusChange(newStatus) {
    // UI updates instantly, then syncs with server
    updateInquiry.mutate({
      id: inquiry.id,
      data: { status: newStatus },
    });
  }
  
  return (
    <select 
      value={inquiry.status} 
      onChange={(e) => handleStatusChange(e.target.value)}
      disabled={updateInquiry.isPending}
    >
      <option value="new">New</option>
      <option value="reviewing">Reviewing</option>
    </select>
  );
}
```

---

## 🛡️ API Contracts with Zod

### Automatic Validation

All API calls are validated:

```typescript
import { api } from '@/shared/utils/api.client';

// ✅ Valid data passes through
const inquiry = await api.inquiries.create({
  contactName: 'John Doe',
  contactEmail: 'john@example.com',
  quizAnswers: { videoType: 'explainer', ... },
  recommendedVideoType: 'Explainer Video',
});

// ❌ Invalid data throws error
const inquiry = await api.inquiries.create({
  contactName: 'J', // Too short!
  contactEmail: 'invalid-email', // Invalid format!
});
// Throws: ZodError with details
```

### Type Safety

```typescript
import type { Inquiry, CreateInquiryDto } from '@/shared/contracts';

// TypeScript knows the exact shape
function processInquiry(inquiry: Inquiry) {
  console.log(inquiry.contactName); // ✅ Type-safe
  console.log(inquiry.invalidField); // ❌ TypeScript error
}
```

---

## 💡 Advanced Features

### Loading States
```typescript
const { data, isLoading, isFetching, isError, error } = useInquiries();

// isLoading: First load
// isFetching: Background refetch
// isError: Something went wrong
// error: Error object
```

### Refetch Data
```typescript
const { data, refetch } = useInquiries();

<button onClick={() => refetch()}>Refresh</button>
```

### Invalidate Cache
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { inquiryKeys } from '@/shared/hooks';

function SomeComponent() {
  const queryClient = useQueryClient();
  
  function refreshInquiries() {
    queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
  }
}
```

### Dependent Queries
```typescript
function ProposalDetail({ inquiryId }: { inquiryId: string }) {
  const { data: inquiry } = useInquiry(inquiryId);
  
  // Only fetch proposal after inquiry is loaded
  const { data: proposal } = useProposal(inquiry?.proposalId);
  
  return <div>{proposal?.description}</div>;
}
```

---

## 🎨 DevTools

Open React Query DevTools to inspect queries:

- Press the floating icon (bottom-left in dev mode)
- See all queries, their status, and data
- Manually refetch or invalidate queries
- View query timings

---

## 📚 Learn More

- **TanStack Query**: https://tanstack.com/query/latest
- **Zod**: https://zod.dev
- **React Query DevTools**: https://tanstack.com/query/latest/docs/react/devtools

---

**Happy coding! 🚀**
