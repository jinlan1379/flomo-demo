<!--
Sync Impact Report
===================
Version change: 0.0.0 (template) → 1.0.0
Modified principles: N/A (initial creation)
Added sections:
  - Principle I: Code Quality Standards
  - Principle II: Testing Standards
  - Principle III: User Experience Consistency
  - Principle IV: Performance Requirements
  - Section: Quality Gates
  - Section: Development Workflow
  - Governance rules
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes needed (Constitution Check section is dynamic)
  - .specify/templates/spec-template.md ✅ no changes needed (success criteria align with principles)
  - .specify/templates/tasks-template.md ✅ no changes needed (test-first workflow compatible)
Follow-up TODOs: none
-->

# Flomo Demo Constitution

## Core Principles

### I. Code Quality Standards

- All code MUST pass linting and formatting checks before merge.
- Functions and modules MUST follow the Single Responsibility Principle;
  each function does one thing well.
- Code duplication MUST be eliminated when the same logic appears in
  three or more locations; below that threshold, prefer inline clarity.
- All public APIs MUST have clear, accurate type annotations.
- Code reviews MUST verify readability, correctness, and adherence to
  project conventions before approval.
- Dead code MUST be removed, not commented out.

**Rationale**: Consistent, readable code reduces onboarding time, lowers
bug density, and makes the codebase maintainable long-term.

### II. Testing Standards

- Every bug fix MUST include a regression test that reproduces the bug
  before the fix is applied.
- Unit tests MUST cover all business logic; edge cases and error paths
  MUST be tested explicitly.
- Integration tests MUST validate cross-module and cross-service
  interactions for every user story.
- Tests MUST be deterministic: no flaky tests, no reliance on external
  services without mocks or stubs.
- Test coverage MUST NOT decrease on any PR; new code SHOULD target
  a minimum of 80% line coverage.
- The Red-Green-Refactor cycle SHOULD be followed: write a failing test
  first, implement to pass, then refactor.

**Rationale**: A strong test suite is the primary safety net against
regressions and enables confident refactoring and continuous delivery.

### III. User Experience Consistency

- UI components MUST follow a shared design system (spacing, colors,
  typography, interaction patterns).
- User-facing text MUST use consistent terminology defined in a project
  glossary; avoid synonyms for the same concept.
- Error messages MUST be actionable: state what went wrong and what the
  user can do to resolve it.
- Loading states, empty states, and error states MUST be handled for
  every data-fetching interaction.
- Responsive behavior MUST be tested across target screen sizes before
  merge.
- Accessibility MUST meet WCAG 2.1 AA compliance at minimum: keyboard
  navigation, screen reader support, sufficient color contrast.

**Rationale**: Consistent UX builds user trust, reduces cognitive load,
and ensures the product is usable by the widest possible audience.

### IV. Performance Requirements

- Page initial load MUST complete within 2 seconds on a standard 4G
  connection (LCP < 2s).
- API responses MUST return within 200ms at p95 under normal load.
- Client-side bundle size MUST NOT exceed the established baseline by
  more than 5% without explicit justification and approval.
- Database queries MUST be reviewed for N+1 patterns; queries exceeding
  100ms MUST be optimized or justified.
- Memory leaks MUST be identified and resolved before release; long-
  running processes MUST have stable memory profiles.
- Performance-critical paths MUST have benchmarks that run in CI.

**Rationale**: Performance directly impacts user retention and
satisfaction. Budgets prevent gradual degradation over time.

## Quality Gates

All pull requests MUST pass the following gates before merge:

1. **Lint & Format**: Automated linting and formatting checks pass.
2. **Test Suite**: All unit and integration tests pass; no coverage
   regression.
3. **Performance Budget**: Bundle size and query performance within
   defined budgets.
4. **UX Review**: UI changes reviewed against the design system;
   accessibility checks pass.
5. **Code Review**: At least one approving review from a team member
   who did not author the code.

## Development Workflow

- Feature branches MUST be created from `main` and kept up to date
  via rebase or merge before PR submission.
- Commits MUST be atomic and descriptive; each commit SHOULD represent
  a single logical change.
- PRs MUST reference the relevant spec or issue and include a summary
  of changes, test plan, and any UX impact.
- Breaking changes MUST be documented in the PR description and
  communicated to the team before merge.

## Governance

- This constitution supersedes conflicting practices found elsewhere
  in the project. When a conflict is identified, the constitution
  takes precedence and the conflicting document MUST be updated.
- Amendments require: (1) a written proposal describing the change and
  rationale, (2) team review, and (3) an updated version number
  following semantic versioning (MAJOR for principle
  removals/redefinitions, MINOR for additions/expansions, PATCH for
  clarifications).
- Compliance with these principles MUST be verified during code review.
  Reviewers MUST reference the relevant principle when requesting
  changes.

**Version**: 1.0.0 | **Ratified**: 2026-02-27 | **Last Amended**: 2026-02-27
