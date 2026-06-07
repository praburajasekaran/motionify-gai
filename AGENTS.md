# Agent Instructions

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature>/`, even though this project pushes to `https://github.com/praburajasekaran/motionify-gai`. See `docs/agents/issue-tracker.md`.

### Triage labels

This repo uses the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.

### Knowledge store

`docs/solutions/` contains documented solutions to past problems, organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing or debugging in documented areas.

`CONCEPTS.md` contains shared domain vocabulary for project-specific entities, named processes, and status concepts. Relevant when orienting to the codebase or discussing domain concepts.
