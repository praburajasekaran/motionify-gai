# Motionify Studio Portal

Motionify Studio Portal manages the commercial handoff from a video production inquiry to an active client project. This glossary defines the domain language agents should use when discussing the portal.

## Language

**Proposal**:
A commercial offer sent to a client for an inquiry.
_Avoid_: Quote, estimate

**Advance Payment**:
The upfront payment required before a proposal becomes accepted.
_Avoid_: Deposit

**Successful Advance Payment**:
An advance payment confirmed by payment verification, payment capture webhook, or an admin offline-payment override.
_Avoid_: Paid click, pending payment

**Project Payment**:
A payment requested after Project Activation for an active client project.
_Avoid_: Balance handoff, final checkout

**Project**:
An active client engagement created after a proposal is accepted.
_Avoid_: Job

**Project Activation**:
The conversion of an accepted proposal into an active client-accessible project.
_Avoid_: Project creation, setup

**Client Access**:
The complete client handoff in which the client can log in, reach the project, and is pointed to it by the product.
_Avoid_: Database access, entitlement

**Primary Client Contact**:
The client person who owns the project relationship after a proposal is paid.
_Avoid_: Client owner, paying user

**Project Access Link**:
A durable email entry point that takes the client to the specific project, using login only when needed.
_Avoid_: Magic link, login link

**Proposal Review Link**:
A client-facing entry point for reviewing a proposal before or during the advance-payment handoff.
_Avoid_: Portal proposal link, quote link

**Inquiry Verification Link**:
A public entry point that confirms a submitted inquiry before it becomes available for follow-up.
_Avoid_: Auth link, login link

**Public Site**:
The unauthenticated Motionify web experience for marketing, inquiry capture, and public policy pages.
_Avoid_: Landing app, marketing app

**Portal**:
The authenticated Motionify workspace for clients and internal users managing inquiries, proposals, projects, payments, deliverables, and tasks.
_Avoid_: App, dashboard

## Relationships

- The **Public Site** can start an inquiry before there is a **Proposal**.
- An **Inquiry Verification Link** confirms an inquiry from the **Public Site** before **Client Access** exists.
- A **Proposal** belongs to one inquiry.
- A **Proposal Review Link** can be used before **Client Access** begins.
- A **Successful Advance Payment** accepts exactly one **Proposal**.
- A **Project Payment** belongs to one **Project** and occurs after **Project Activation**.
- An accepted **Proposal** goes through **Project Activation**.
- **Project Activation** creates one **Project**.
- **Project Activation** assigns one **Primary Client Contact** to the **Project**.
- The inquiry contact is the **Primary Client Contact** and the paying contact for this flow.
- **Client Access** begins immediately after a **Successful Advance Payment**; it requires more than linking a user to a **Project**, because the client must be able to log in to the **Portal** and land on the specific project from the product.
- A **Project Access Link** is the email entry point for the **Primary Client Contact's** **Client Access**.

## Example Dialogue

> **Dev:** "Does paying the proposal give the client access?"
> **Domain expert:** "Only if **Project Activation** and the full **Client Access** handoff happen: the **Project** exists, the client can log in, and the product lands them on the specific project."

## Flagged Ambiguities

- "Give access" was resolved to mean **Client Access**, not just assigning a user ID to a project record.
