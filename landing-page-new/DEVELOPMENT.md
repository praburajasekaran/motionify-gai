# Development Setup

## Running the Application

### Option 1: Netlify Dev (Recommended)

Run both Next.js and Netlify functions together:

```bash
# From project root
netlify dev
```

This will:
- Start Next.js dev server (usually on port 8888)
- Start Netlify functions server
- Handle routing automatically

### Option 2: Next.js Dev Only

If you only want to run Next.js:

```bash
cd landing-page
npm run dev
```

**Note:** This requires Netlify functions to be running separately. The Next.js API routes (`/api/*`) will proxy to Netlify functions. If Netlify Dev isn't running, you'll see helpful error messages.

To run Netlify functions separately, you can:

```bash
# From project root
netlify functions:serve
```

Or set the `NETLIFY_FUNCTIONS_URL` environment variable to point to where your Netlify functions are running.

## Environment Variables

Create a `.env.local` file in the `landing-page` directory:

```env
# Database
DATABASE_URL=your_neon_postgres_url

# Email (Development)
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASS=your_mailtrap_pass

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Override API base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8888/.netlify/functions
```

## API Routes

The application uses Next.js API routes (`/api/*`) in development that proxy to Netlify functions. In production, requests go directly to `/.netlify/functions/*`.

### Available API Routes

- `/api/auth-request-magic-link` - Request magic link
- `/api/auth-verify-magic-link` - Verify magic link token
- `/api/auth-me` - Get current user
- `/api/auth-logout` - Logout

## Troubleshooting

### "Received HTML instead of JSON" Error

This means the API endpoint returned an HTML error page instead of JSON. Common causes:

1. **Netlify Dev not running**: Run `netlify dev` from project root
2. **Wrong API base URL**: Check that `NEXT_PUBLIC_API_BASE_URL` is set correctly
3. **Function not found**: Make sure the Netlify function exists in `netlify/functions/`

### API Routes Not Working

1. Check that Netlify Dev is running: `netlify dev`
2. Check browser console for error messages
3. Verify environment variables are set correctly
4. Check Netlify function logs: `netlify functions:log`


