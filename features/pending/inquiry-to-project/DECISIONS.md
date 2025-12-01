# Inquiry to Project - Final Decisions

**Date:** January 13, 2025
**Status:** ✅ All decisions finalized
**Ready for:** Implementation

---

## 1. Inquiry Form Design

### Q1.1: Additional Contact Fields ✅ **A, D**
- ✅ Capture **company website URL**
- ✅ Capture **"How did you hear about us?"** field
- Track marketing effectiveness and research brand

### Q1.2: Quiz vs Traditional Form ✅ **A**
- ✅ **Multi-step quiz format** (current design)
- Better UX, higher completion rates
- 5-step progressive disclosure

### Q1.3: File Upload Capability ✅ **No**
- ❌ Not in MVP
- Defer to Phase 2

---

## 2. Proposal Configuration

### Q2.1: Proposal Expiration ✅ **C**
- ✅ **60 days from send date**
- Encourages decisions while being reasonable
- Pricing stability window

### Q2.2: Proposal Templates ✅ **Yes**
- ✅ Create pre-built templates for common project types
- Faster proposal creation
- Consistent pricing

### Q2.3: Multi-Currency Support ✅ **INR and USD**
- ✅ Support both **INR (₹)** and **USD ($)**
- Razorpay handles currency conversion
- Target both India and international markets

### Q2.4: Proposal Comparison View ✅ **Only latest proposal**
- ✅ Customers see **only the latest proposal version**
- Admin can track version history internally
- Simpler customer experience

---

## 3. Payment & Pricing

### Q3.1: Payment Provider ✅ **Razorpay**
**Critical Decision**
- ✅ Use **Razorpay** for all payments
- Support: UPI, Cards, Net Banking, Wallets
- Currencies: INR + USD
- Payment Links API

### Q3.2: Payment Structure Flexibility ✅ **A**
- ✅ **Manual text entry** (flexible, no enforcement)
- Admin manually enters "50% deposit, 50% on completion"
- Can upgrade to structured options later

### Q3.3: Installment Plans ✅ **No**
- ❌ Not for MVP
- Risk management
- Defer to Phase 2

### Q3.4: Deposit-Only vs Full Payment ✅ **A**
- ✅ **Single payment link** (admin creates balance payment later)
- Simpler for MVP
- Manual balance invoice creation

---

## 4. Negotiation Workflow

### Q4.1: Maximum Negotiation Rounds ✅ **A**
- ✅ **Unlimited proposal revisions** (current design)
- Track metrics, no hard limit
- Trust the process

### Q4.2: Video Call Scheduling ✅ **Ability to request meetings**
- ✅ Customers can **request meetings** through portal
- Manual scheduling (not auto-calendar integration)
- Phase 2: Calendly integration

### Q4.3: Customer-Initiated Revisions ✅ **Text feedback only**
- ✅ **Text feedback only** (current design)
- No interactive sliders/counters
- Simpler UX

---

## 5. Account Creation

### Q5.1: Account Creation Timing ✅ **A (Already decided)**
- ✅ **After payment** (Option A)
- Clearer workflow
- Simpler implementation

### Q5.2: Social Login ✅ **Clerk - Email, Magic Link, Google**
- ✅ Use **Clerk** authentication
- Support: Email + Magic Link + Google OAuth
- Better UX than magic link only

### Q5.3: Team Member Invitations ✅ **Team invites happen after project creation**
- ✅ Team invites **after project starts** (current design)
- Not during proposal phase
- Simpler workflow

---

## 6. Notifications & Communication

### Q6.1: SMS Notifications ✅ **No**
- ❌ Email only for MVP
- SMS opt-in Phase 2
- Cost management

### Q6.3: Admin Notification Preferences ✅ **A, B, C, D**
- ✅ **Email** (critical events)
- ✅ **In-app notifications** (bell icon)
- ✅ **Push notifications** (browser/mobile)
- ✅ **Daily digest email** (updates summary)
- Comprehensive notification system

### Q6.4: Real-Time vs Digest ✅ **Instant**
- ✅ **Instant notifications** for all events
- Critical: New inquiry, payment
- Updates: Proposal status changes
- No batching/digest delays

---

## 7. Admin Workflow

### Q7.3: Time Tracking ✅ **No**
- ❌ Don't track time spent on inquiries
- Focus on conversion metrics
- Defer analytics to Phase 2

### Q7.4: Inquiry Assignment Rules ✅ **All go to one superadmin**
- ✅ **All inquiries go to superadmin**
- Manual assignment/delegation
- No auto-routing for MVP

---

## 8. Reporting & Analytics

### Q8.1: Dashboard Metrics ✅ **Core metrics**
- ✅ Inquiries this week/month
- ✅ Conversion rate (inquiry → project)
- ✅ Average proposal value
- ✅ Top project types
- ✅ Revenue pipeline
- MVP dashboard displays these 5 key metrics

---

## 9. Integration & Technical

### Q9.1: CRM Integration ✅ **A, but create APIs for later integration via n8n, Make.com**
- ✅ No built-in CRM integration for MVP
- ✅ **Build REST APIs** for future integration
- ✅ Enable n8n, Make.com, Zapier connections
- Flexible webhook architecture

### Q9.2: Marketing Attribution ✅ **Yes, capture UTM parameters**
- ✅ **Capture UTM parameters** on inquiry form
- Track: utm_source, utm_medium, utm_campaign
- Hidden fields auto-populated
- Marketing ROI tracking

---

## 10. Legal & Compliance

### Q10.1: Terms of Service Acceptance ✅ **A**
- ✅ **Inquiry form only** (checkbox: "I agree to be contacted")
- Project terms handled separately during onboarding
- Simple consent model

### Q10.2: GDPR Compliance ✅ **No (Already decided)**
- ✅ **No GDPR features** needed
- Not targeting EU customers
- Standard privacy policy

### Q10.3: Data Retention ✅ **A**
- ✅ **Keep inquiry data forever**
- Useful for analytics and reporting
- No auto-deletion
- Customer can request deletion manually

---

## Summary of Key Decisions

### Payment & Technical Stack
- **Payment:** Razorpay (INR + USD)
- **Auth:** Clerk (Email, Magic Link, Google)
- **Currencies:** INR + USD
- **Notifications:** Email + In-App + Push + Daily Digest

### Features Included in MVP
- ✅ Multi-step quiz form
- ✅ Company website + "How did you hear" fields
- ✅ UTM parameter capture
- ✅ Proposal templates
- ✅ 60-day proposal expiration
- ✅ Meeting request capability
- ✅ Core analytics dashboard (5 metrics)
- ✅ API endpoints for future integrations

### Features Deferred to Phase 2
- ❌ File uploads with inquiry
- ❌ SMS notifications
- ❌ Payment installments
- ❌ Auto-calendar scheduling
- ❌ Time tracking analytics
- ❌ Built-in CRM sync

### Workflow Rules
- All inquiries → Superadmin
- Account creation → After payment
- Team invites → After project creation
- Proposal versions → Latest only (customer view)
- Negotiation rounds → Unlimited
- Payment structure → Manual text entry
- Data retention → Forever

---

## Implementation Impact

### Database Changes Required
1. Add `company_website` field to inquiries
2. Add `referral_source` field to inquiries
3. Add UTM tracking fields (5 fields: source, medium, campaign, term, content)
4. Add `currency` field to proposals ('INR' | 'USD')
5. Add `expires_at` timestamp to proposals (60 days)

### Third-Party Integrations
1. **Razorpay SDK** - Payment processing
2. **Clerk SDK** - Authentication (Email + Magic Link + Google)
3. **Email Service** - Transactional emails (Amazon SES)
4. **Push Notifications** - Browser push (Firebase or OneSignal)

### API Endpoints to Build
All REST APIs should follow standard patterns for future n8n/Make.com integration:
- Webhook support for inquiry events
- Structured JSON responses
- API authentication tokens
- Rate limiting

---

## Next Steps

1. ✅ All decisions finalized
2. ⏭️ Update data models (03-data-models.md)
3. ⏭️ Update database schema (04-database-schema.sql)
4. ⏭️ Update API endpoints (05-api-endpoints.md)
5. ⏭️ Update wireframes with new fields (02-wireframes.md)
6. ⏭️ Begin implementation

---

**Ready for development!** 🚀
