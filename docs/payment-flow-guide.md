# Motionify Studio — Payment Flow Guide for Razorpay

---

## About Motionify Studio

**Motionify Studio** is a creative services company that provides motion design, video production, and visual content services to businesses. Clients engage Motionify through a web-based platform where they can submit project requirements, receive proposals, make payments, and collaborate on their projects.

**Website:** https://motionify.studio/

---

## Business Model

Motionify operates on a **custom project basis**. There are no fixed product listings, shopping carts, or subscriptions. Each client engagement follows this lifecycle:

1. Client submits their project requirements through an interactive quiz on the website.
2. The Motionify team reviews the requirements and prepares a custom proposal with deliverables and pricing.
3. The client reviews the proposal and, upon agreement, makes an advance payment to begin the project.
4. The project is executed, and the client collaborates with the Motionify team through the platform.
5. Upon completion, the client pays the remaining balance.

---

## Why We Need Razorpay

We need Razorpay to **collect advance payments from clients** when they accept a project proposal. This is a one-time payment per project (not recurring or subscription-based). Razorpay will be integrated into our web platform to provide a seamless checkout experience.

---

## Payment Flow

### Step 1: Client Submits Requirements (Quiz)

A potential client visits the Motionify website ([https://motionify.studio/](https://motionify.studio/)) and fills out an interactive quiz/form describing their project needs — such as the type of video, style preferences, timeline, and budget range. This creates an inquiry in our system.

**Quiz URL:** [https://motionify.studio/#video-style-quiz](https://motionify.studio/#video-style-quiz)

### Step 2: Motionify Team Creates a Proposal

The Motionify team reviews the inquiry and creates a detailed proposal that includes:

- List of deliverables (e.g., 30-second explainer video, social media assets)
- Total project price
- Advance payment percentage (typically 40%–60% of the total)
- Advance amount and balance amount
- Currency (INR or USD)

The proposal is shared with the client via a secure link.

**Proposal URL format:** `https://motionify.studio/proposal/{proposalId}`

### Step 3: Client Accepts the Proposal & Makes Payment

The client reviews the proposal on the platform. If they agree, they click **"Accept & Pay"**, which initiates the Razorpay checkout.

**Payment URL format:** `https://motionify.studio/payment/{proposalId}`

**What happens:**

1. Our system creates a Razorpay Order for the advance amount.
2. The Razorpay checkout modal opens on the client's browser.
3. The client pays using any Razorpay-supported method (cards, UPI, netbanking, wallets, etc.).
4. Upon successful payment, the signature is verified on our server.
5. The proposal is marked as accepted and the project is created.

### Step 4: Project Begins

Once payment is confirmed:

- The project becomes active on the platform.
- The client can view progress, share feedback, and collaborate with the Motionify team.
- Deliverables are shared through the platform as they are completed.

**Client Portal URL:** [https://motionify.studio/portal/projects](https://motionify.studio/portal/projects)

### Step 5: Balance Payment (Post-Completion)

After the project deliverables are completed, the client pays the remaining balance through the same Razorpay checkout flow.

---

## Visual Flow

```
  CLIENT                        MOTIONIFY                       RAZORPAY
    |                               |                               |
    |  1. Fills out project quiz    |                               |
    |------------------------------>|                               |
    |                               |                               |
    |  2. Receives proposal         |                               |
    |<------------------------------|                               |
    |                               |                               |
    |  3. Clicks "Accept & Pay"     |                               |
    |------------------------------>|                               |
    |                               |  4. Creates Razorpay Order    |
    |                               |------------------------------>|
    |                               |                               |
    |  5. Razorpay checkout opens   |                               |
    |<--------------------------------------------------------------|
    |                               |                               |
    |  6. Client completes payment  |                               |
    |-------------------------------------------------------------->|
    |                               |                               |
    |                               |  7. Payment confirmed         |
    |                               |<------------------------------|
    |                               |                               |
    |  8. Project created & active  |                               |
    |<------------------------------|                               |
    |                               |                               |
    |  9. Collaboration & delivery  |                               |
    |<----------------------------->|                               |
    |                               |                               |
    | 10. Balance payment collected  |                               |
    |-------------------------------------------------------------->|
```

---

## Payment Details

| Aspect | Details |
|--------|---------|
| **Payment type** | One-time project payments (not subscription) |
| **Payment trigger** | Client accepts a proposal |
| **Payment phases** | Advance (40%–60%) + Balance (remaining) |
| **Currencies** | INR, USD |
| **Average transaction value** | Varies per project (custom pricing) |
| **Payer** | Business clients (B2B) |
| **Payee** | Motionify Studio |
| **Refund policy** | Handled on a case-by-case basis by Motionify admin |

---

## Integration Details

| Aspect | Details |
|--------|---------|
| **Integration method** | Razorpay Standard Checkout (web) |
| **Platform** | Web application (React frontend, Node.js backend) |
| **Hosting** | Netlify (serverless functions) |
| **Webhook handling** | Yes — `payment.captured` event for async confirmation |
| **Signature verification** | Yes — HMAC SHA256 on all payments and webhooks |

---

## Key URLs

| Page | URL |
|------|-----|
| **Website (Home)** | [https://motionify.studio/](https://motionify.studio/) |
| **Project Quiz** | [https://motionify.studio/#video-style-quiz](https://motionify.studio/#video-style-quiz) |
| **Proposal Page** | `https://motionify.studio/proposal/{proposalId}` |
| **Payment Page** | `https://motionify.studio/payment/{proposalId}` |
| **Client Portal** | [https://motionify.studio/portal/projects](https://motionify.studio/portal/projects) |

---

## Policies

| Policy | URL |
|--------|-----|
| **Terms & Conditions** | [https://motionify.studio/terms](https://motionify.studio/terms) |
| **Privacy Policy** | [https://motionify.studio/privacy](https://motionify.studio/privacy) |
| **Shipping Policy** | [https://motionify.studio/shipping](https://motionify.studio/shipping) |
| **Cancellation & Refund Policy** | [https://motionify.studio/cancellation-refund](https://motionify.studio/cancellation-refund) |

---

## Summary

Motionify Studio is a creative services business. Clients discover us, share their requirements through a quiz, and receive a custom proposal. **Razorpay is used to collect the advance payment when a client accepts a proposal, and the balance payment upon project completion.** There is no cart, no product catalog, and no subscription — just straightforward project-based payments between a client and Motionify Studio.
