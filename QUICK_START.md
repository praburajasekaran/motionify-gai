# ⚡ Quick Start Guide

Get up and running in 5 minutes!

---

## 📦 Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install landing page dependencies (happens automatically)
cd landing-page-new && npm install && cd ..
```

This will install:
- ✅ TanStack Query (state management)
- ✅ Zod (API validation)
- ✅ All other dependencies

---

## 🔧 Step 2: Setup Environment

Create `.env` in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@hostname/database?sslmode=require

# Razorpay Test Keys
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Email (Mailtrap for dev)
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=xxxxx
MAILTRAP_PASS=xxxxx
```

**Don't have these yet?**
- Database: Sign up at https://neon.tech (free tier)
- Razorpay: https://dashboard.razorpay.com (test mode keys)
- Email: https://mailtrap.io (free tier)

---

## 🗄️ Step 3: Setup Database

```bash
# Connect to your Neon database
psql $DATABASE_URL

# Run migrations
\i database/schema.sql

# Verify
\dt
```

You should see tables: `users`, `sessions`, `inquiries`, `proposals`, `projects`, `deliverables`, `payments`, `tasks`.

---

## 🚀 Step 4: Run Locally

```bash
# Run both apps simultaneously
npm run dev:all
```

**Access:**
- 🎨 **Portal**: http://localhost:5173 (Admin & Client dashboard)
- 🌐 **Landing**: http://localhost:5174 (Marketing + Quiz)
- ⚙️ **API**: http://localhost:8888/.netlify/functions

---

## 🧪 Step 5: Test It Works

### Test Landing Page
1. Go to http://localhost:5174
2. Should see the marketing page
3. Try the quiz form

### Test Portal
1. Go to http://localhost:5173
2. Should redirect to login
3. For dev: Use localStorage to mock login:
   ```javascript
   localStorage.setItem('mockUser', JSON.stringify({
     id: '1',
     email: 'admin@motionify.com',
     name: 'Admin User',
     role: 'super_admin'
   }));
   ```
4. Refresh page → You're in!

### Test API
```bash
# Test inquiries endpoint
curl http://localhost:8888/.netlify/functions/inquiries
```

---

## 🎯 What's New?

### State Management (TanStack Query)

Use custom hooks instead of manual fetching:

```typescript
// OLD way
const [inquiries, setInquiries] = useState([]);
useEffect(() => {
  fetch('/.netlify/functions/inquiries')
    .then(res => res.json())
    .then(setInquiries);
}, []);

// NEW way ✨
import { useInquiries } from '@/shared/hooks';
const { data: inquiries, isLoading } = useInquiries();
```

### API Validation (Zod)

All API calls are automatically validated:

```typescript
import { api } from '@/shared/utils/api.client';

// ✅ Valid data
await api.inquiries.create({
  contactName: 'John Doe',
  contactEmail: 'john@example.com',
  // ... required fields
});

// ❌ Invalid data throws error with details
await api.inquiries.create({
  contactName: 'J', // Too short!
  contactEmail: 'invalid', // Invalid format!
});
```

---

## 📚 Learn More

- **State Management**: See `USING_STATE_MANAGEMENT.md`
- **Deployment**: See `DEPLOYMENT_GUIDE.md`
- **Architecture**: See docs in `/docs` folder

---

## 🐛 Troubleshooting

### "Cannot find module '@tanstack/react-query'"
```bash
npm install
```

### "Port 5173 is already in use"
```bash
# Kill the process
lsof -ti:5173 | xargs kill -9
```

### "Database connection failed"
- Verify DATABASE_URL in `.env`
- Check Neon dashboard is active
- Test connection: `psql $DATABASE_URL`

### TypeScript errors in shared/
- This is normal before running `npm install`
- After install, errors will disappear

---

## ✅ You're Ready!

Your stack:
- ✅ **Frontend**: React 19 + Vite + Next.js 16
- ✅ **State**: TanStack Query
- ✅ **Validation**: Zod
- ✅ **Backend**: Netlify Functions
- ✅ **Database**: PostgreSQL (Neon)
- ✅ **Deployment**: Netlify

**Next Steps:**
1. Customize the landing page
2. Add real authentication
3. Deploy to Netlify (see DEPLOYMENT_GUIDE.md)

Happy coding! 🚀
