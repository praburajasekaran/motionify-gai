# Motionify PM Portal

Motionify PM Portal manages the commercial handoff from a video production inquiry to an active client project. This glossary defines the domain language agents should use when discussing the portal.

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

## Relationships

- A **Proposal** belongs to one inquiry.
- A **Successful Advance Payment** accepts exactly one **Proposal**.
- An accepted **Proposal** goes through **Project Activation**.
- **Project Activation** creates one **Project**.
- **Project Activation** assigns one **Primary Client Contact** to the **Project**.
- The inquiry contact is the **Primary Client Contact** and the paying contact for this flow.
- **Client Access** begins immediately after a **Successful Advance Payment**; it requires more than linking a user to a **Project**, because the client must be able to log in and land on the specific project from the product.
- A **Project Access Link** is the email entry point for the **Primary Client Contact's** **Client Access**.

## Example Dialogue

> **Dev:** "Does paying the proposal give the client access?"
> **Domain expert:** "Only if **Project Activation** and the full **Client Access** handoff happen: the **Project** exists, the client can log in, and the product lands them on the specific project."

## Flagged Ambiguities

- "Give access" was resolved to mean **Client Access**, not just assigning a user ID to a project record.
