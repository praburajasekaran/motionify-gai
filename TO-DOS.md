# TO-DOS

## Configure Resend Email for motionify.studio - 2026-02-21 17:34

- **Finish Resend + Supabase email config once client verifies domain** - Client needs to add motionify.studio to their Resend account and verify DNS records before this can be completed. **Problem:** From email is currently `noreply@send.growthkiwi.com` (Supabase default); needs to be `noreply@motionify.studio` via Resend custom SMTP. **Files:** `docs/client-resend-setup.md` (shared with client), `.env.example:80-81` (RESEND_API_KEY and RESEND_FROM_EMAIL vars). **Solution:** Once client shares Resend API key and team invite is accepted — (1) update `RESEND_FROM_EMAIL` env var to `Motionify <noreply@motionify.studio>`, (2) configure Supabase project auth SMTP settings to use `smtp.resend.com` with client's API key as password and `noreply@motionify.studio` as sender.
