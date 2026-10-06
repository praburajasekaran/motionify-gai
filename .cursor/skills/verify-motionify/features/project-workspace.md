# Project workspace

Signed-in users search their projects, switch grid/list views, open a project, inspect its work across tabs, and reach a deliverable review from the overview or deliverables area.

## Sub-features

- `projects-navigation` and `projects-direct` reach the project list.
- `projects-search` and `projects-view-mode` find a known project and preserve its identity across views.
- `project-tabs` covers Overview, Tasks, Deliverables, Files, Team, Activity, and Payments.
- `review-overview`, `review-deliverables`, and `review-direct` reach deliverable review through distinct routes.
- `review-approve` records approval and its persisted resulting state.

## How to get to it (user POV)

- Choose `Projects` in portal navigation or open `/portal/projects`; clients also land here after signing in.
- Use `Search projects...`, `Grid View`, or `List View`; choose the desired project.
- Use the project tabs. Named and numeric deep links are accepted: Overview is 1, Tasks 2, Deliverables 3, Files 4, Team 5, Activity 6, Payments 7.
- On Overview, choose an Active Deliverables row; on Deliverables, choose the item's `Review Beta`. A saved deliverable review URL can be opened directly.

## Driving it with Playwright

Preconditions: a doctor-checked disposable full stack; a real magic-link session with membership in a project titled `Verification video project`; one known reviewable deliverable and an account with approval permission. The fixture must exist in that database before driving. Baseline `control.mjs drive` does not execute these authenticated cases.

- **Project entries.** Click `page.getByRole('link', { name: 'Projects', exact: true })` from the portal navigation and require `/portal/projects`. Separately navigate to `/portal/projects` directly. Require the project fixture and a successful real projects API response; an empty mocked list is not a pass.
- **Search.** Fill `page.getByPlaceholder('Search projects...', { exact: true })` with `Verification video project`; require the matching visible project title and no unrelated titles. Fill a unique nonmatching string, require the empty filtered result and `Clear Filters`, then click that button and require the fixture to return.
- **View modes and open.** Click `page.getByRole('button', { name: 'List View', exact: true })`; record the fixture's link href with `page.getByRole('link').filter({ hasText: 'Verification video project' }).getAttribute('href')`, then click it. Require the same project heading and retain that captured URL as `projectUrl`. Repeat from Grid View by clicking the fixture title. The two paths must identify the same project.
- **Tabs.** For each name `Overview`, `Tasks`, `Deliverables`, `Files`, `Team`, `Activity`, `Payments`, click `page.getByRole('tab', { name, exact: true })`, require `aria-selected="true"`, a matching `/portal/projects/` URL, and the expected fixture content rather than a loading/error view. Save screenshots and API responses. Separately navigate to the captured project's named `tasks` and numeric `2` paths and require the same Tasks tab.
- **Review from Overview.** Choose Overview, click the known deliverable title in Active Deliverables, and capture the resulting `/deliverables/` URL as `reviewUrl`. Require that deliverable's title and `Review History` heading; save the action and review page.
- **Review from Deliverables.** Return to `projectUrl`, choose the Deliverables tab, and choose the fixture's `Review Beta` button. Capture the resulting review modal and known title. Do not claim the separate full-page route from a modal alone. Then open the captured `reviewUrl` directly and assert the same item.
- **Approve.** With a disposable reviewable deliverable and permitted client role, click `page.getByRole('button', { name: 'Approve Deliverable', exact: true })` on the full review page. In the confirmation panel, scope the same named button using `page.getByRole('heading', { name: /^Approve "/ }).locator('xpath=ancestor::div[contains(@class,"relative")][1]').getByRole('button', { name: 'Approve Deliverable', exact: true })`. Observe the actual mutation response, reload the review, and require stored approval and matching Review History. Reopen it in the project Deliverables tab to confirm the resulting status from a second user-facing view. Preserve evidence before removing the fixture.

## Gotchas

- Roles and project memberships change available actions; missing permission or an unsuitable deliverable status is a blocked precondition, not proof that the action works.
- An empty database or failed API can look like an empty project list. Assert the known fixture and real response.
- List view uses links while grid view has clickable cards. Record the target project identity in both cases.
- The Deliverables tab review modal and Overview's full review page are distinct user entry points and need separate proof.
- Database, object storage, and authenticated accounts must be isolated for mutations; fresh browser contexts and separate ports do not isolate backend state.
