# Project Access After Advance Payment

Status: accepted

When an inquiry contact successfully pays the advance amount for a proposal, Motionify Studio treats that payment as proposal acceptance and immediately starts Project Activation. Project Activation must create the active project, assign the inquiry contact as the Primary Client Contact, and provide Client Access through a durable Project Access Link that lands the client on the specific project after login when needed.

We chose a Project Access Link instead of emailing a long-lived magic login link because normal magic links expire quickly and should remain one-time authentication credentials, while the post-payment handoff needs to remain useful after email delays, forwarding, or returning later. If Project Activation fails after payment, the client should see a project-setup state and admins should have a visible retry or manual-complete path rather than leaving a silent paid-but-inaccessible project state.

## Considered Options

- Email a long-lived magic link directly to the project: rejected because it weakens the short-lived magic-link security model.
- Link only to the generic login page: rejected because it loses the project-specific handoff after payment.
- Treat database assignment as access: rejected because Client Access means the client can log in and land on the project from the product.
