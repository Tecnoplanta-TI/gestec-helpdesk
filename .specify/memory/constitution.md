<!--
Sync Impact Report
- Version change: unratified scaffold -> 1.0.0
- Modified principles:
  - Placeholder principle 1 -> I. Product Vision Is Anchored in Spec 00
  - Placeholder principle 2 -> II. Discover, Reconcile, Then Specify
  - Placeholder principle 3 -> III. Preserve Gestec Architecture and Scope
  - Placeholder principle 4 -> IV. Functional Contracts Must Be Complete and Traceable
  - Placeholder principle 5 -> V. Security, Accessibility, and Validation Are Mandatory
- Added sections:
  - Product and Technical Constraints
  - Specification and Delivery Workflow
- Removed sections: none; placeholder sections were concretized
- Follow-up TODOs: none
-->
# Gestec Help Desk Constitution

## Core Principles

### I. Product Vision Is Anchored in Spec 00

`specs/help-desk/00-visao-geral-da-solucao.md` MUST be treated as the central product
specification for Gestec Help Desk. It defines the integrated solution around three pillars:
native time tracking, IT support ticket management, and IT asset management. Feature Specs,
plans, tasks, domain models, and interface artifacts MUST remain consistent with that vision.

When sources conflict, the following precedence MUST be applied: explicit and current user
decisions; `CONFIRMED` requirements; Spec 00 and linked functional Specs; current technical
decisions; the `.pen` for visual composition; existing implementation patterns; and finally
`INFERRED`, `PROPOSED`, or `VALIDAR` items. Conflicts MUST be recorded instead of silently
replacing an approved decision.

Rationale: a single product anchor prevents the three pillars from becoming disconnected or
being implemented as competing modules.

### II. Discover, Reconcile, Then Specify

Before creating or changing a specification, the contributor MUST inspect the relevant
`README.md`, `index.md`, `docs/`, existing Specs, domain model, decisions, and related design
artifacts. Existing IDs, terminology, routes, permissions, entities, and rules MUST be
inventoried before new ones are introduced.

Every requirement MUST be classified as `CONFIRMED`, `INFERRED`, `PROPOSED`, or `VALIDAR`.
Equivalent features MUST update the existing Spec rather than create a competing document,
story, schema, or identifier. New documents MUST be linked from the applicable index and MUST
cite their source and related Specs.

Rationale: discovery and reconciliation are required to prevent duplicate requirements,
contradictory contracts, and orphaned documentation.

### III. Preserve Gestec Architecture and Scope

Gestec Help Desk MUST be specified as part of the existing Gestec platform, reusing its
authentication, RBAC, layout, navigation, API conventions, data patterns, and audit model. It
MUST NOT introduce a separate login, parallel application architecture, duplicate user base, or
unapproved module.

This repository MUST remain a documentation and design workspace unless an explicit request
and a verified executable repository authorize implementation. Application code, dependencies,
database migrations, or deployment files MUST NOT be created here merely to demonstrate a Spec.
Gestec Desk and Gestec Help Desk MUST retain their documented responsibilities until an explicit
architectural decision changes that boundary.

Rationale: integration with the established platform reduces security risk, duplication, and
long-term operational cost.

### IV. Functional Contracts Must Be Complete and Traceable

Each implementable feature Spec MUST define actors, goal, preconditions, main flow, alternatives,
exceptions, permissions, business rules, acceptance criteria, states, edge cases, persistence,
integrations, and audit expectations applicable to that feature. User Stories MUST be atomic,
have unique IDs, and link to the screen, entity, API, and related rule when those artifacts exist.

Every visible action represented in the `.pen` MUST have a documented behavior or an explicit
`VALIDAR` marker. Every confirmed functional requirement that needs a user interface MUST be
represented in the appropriate screen or state. Derived totals, timers, ticket transitions,
asset links, exports, and external callbacks MUST define idempotency and concurrency behavior
whenever retries or duplicate events are possible.

Rationale: implementation teams must be able to build the product without guessing behavior or
inventing missing contracts.

### V. Security, Accessibility, and Validation Are Mandatory

Specifications and implementation plans MUST require server-side authentication, authorization,
input validation, least privilege, safe secret handling, auditability, and protection against
IDOR, injection, XSS, CSRF, SSRF, unsafe upload, and duplicate mutations where applicable.
Frontend visibility MUST NOT be treated as authorization.

Interfaces MUST define keyboard access, visible focus, associated labels, accessible names for
icon-only controls, WCAG AA contrast, responsive behavior, and states for loading, empty results,
recoverable errors, success, confirmation, disabled actions, and denied permission. Color alone
MUST NOT communicate status or meaning.

Documentation changes MUST pass link, ID, traceability, formatting, and consistency checks.
Changes to the `.pen` MUST additionally be inspected for clipping, overflow, overlap, naming,
and conformity with the approved Specs. Code changes in the executable repository MUST pass its
applicable lint, typecheck, tests, build, and security review before completion.

Rationale: quality gates are part of the product contract, not optional cleanup after delivery.

## Product and Technical Constraints

- The three product pillars defined by Spec 00 MUST remain integrated through shared identities,
  permissions, audit events, and domain relationships.
- Meu Tempo MUST provide native time tracking inspired functionally by Clockify without a
  Clockify dependency, copied branding, or copied visual identity.
- Apontamentos and manual time projects MUST remain inside Meu Tempo; neither becomes an
  independent primary sidebar module.
- Active cost centers MUST appear in Meu Tempo through the unified `Projeto` concept without
  exposing technical origin in the interface.
- Ticket, time, project, cost center, and asset relationships MUST use stable identifiers and
  preserve historical meaning after renaming, inactivation, reopening, or archival.
- Ticket-generated time entries MUST avoid fictitious duration and duplicate consolidation.
- IT asset inventory and audit remain Gestec Desk responsibilities; ticket-to-asset context and
  equipment delivery remain Gestec Help Desk responsibilities until explicitly amended.
- The approved interface foundation is shadcn/ui preset `b2D0vQOME`; valid existing Gestec
  components and tokens MUST be reconciled rather than overwritten without cause.
- Time-entry exports MUST use Excel `.xlsx` where required by Spec 15.
- Persistent asynchronous jobs MUST use pg-boss with PostgreSQL; Redis and BullMQ are outside
  the approved Help Desk architecture.
- Monetary formulas, asset lifecycle rules, integration semantics, or permissions marked
  `VALIDAR` MUST NOT be presented as confirmed behavior.

## Specification and Delivery Workflow

1. **Discover:** read Spec 00 and the relevant linked Specs, decisions, model, gaps, indexes,
   and current artifacts.
2. **Inventory:** identify existing stories, rules, entities, routes, permissions, screens, and
   unresolved decisions before proposing additions.
3. **Reconcile:** apply source precedence, record conflicts, and retain classification boundaries.
4. **Specify:** extend the existing structure with atomic, testable, traceable contracts.
5. **Integrate:** update navigation and cross-references so no important document is orphaned.
6. **Validate:** check links, duplicate definitions, formatting, classification, and consistency;
   validate design or executable artifacts when they are in scope.
7. **Review again:** inspect the final diff for unintended changes, stale references, missing
   states, security gaps, and divergence from Spec 00.

A feature MUST NOT advance from specification to planning while critical behavior is implicit.
Unresolved decisions that do not block the remaining work MUST be registered as `VALIDAR` and
carried into the plan or checklist. A real blocker MUST identify the missing decision, affected
scope, and safest next action.

## Governance

This constitution governs Spec Kit artifacts and project work in this repository. Explicit,
current user decisions remain authoritative, but they MUST be reconciled into Spec 00 or the
applicable functional Spec so the repository does not depend on undocumented chat context.

Amendments require: a documented reason; identification of affected principles and artifacts;
an appropriate semantic version increment; an updated Sync Impact Report; and validation that
no unexplained placeholders remain. Amendments MUST modify only the constitution during the
`speckit-constitution` workflow.

Versioning policy:

- **MAJOR:** removes a principle or changes governance incompatibly.
- **MINOR:** adds a principle or materially expands mandatory guidance.
- **PATCH:** clarifies wording without changing obligations.

Every new Spec, plan, task list, design audit, and implementation review MUST include a
constitution compliance check. Any exception MUST be explicit, justified, classified, and
approved before work that depends on it proceeds. Complexity and new dependencies MUST be
justified against reuse of existing Gestec patterns.

**Version**: 1.0.0 | **Ratified**: 2026-08-31 | **Last Amended**: 2026-08-31
