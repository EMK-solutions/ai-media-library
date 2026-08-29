---
id: F-NN-NN
module: NN-module-folder-name
title: Feature name in the user's words
status: shipped            # shipped | partial | experimental | planned | deprecated
last_reviewed: YYYY-MM-DD
source_of_truth:           # 2–5 repo-relative paths that define this feature
  - apps/desktop-media/...
  - packages/...
related:                   # feature IDs this one depends on or feeds
  - F-NN-NN
---

# Feature name

> One-sentence positioning line: what the user can do, and the outcome they get.

## 1. Summary

Three to five sentences: what the feature is, the problem it solves, when a user reaches for
it, and what makes it different from adjacent features. No implementation detail here.

## 2. User stories

- **As a** <user type> **I want** <goal> **so that** <outcome>.
- **As a** … **I want** … **so that** ….

State who this is *not* for if that prevents confusion.

## 3. Scope

**In scope**

- …

**Out of scope**

- …

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| … | [Feature name](../NN-module/NN-feature.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-NN-NN.1 | … | … | shipped |

## 5. User journeys

### J-NN-NN-1 — <journey name>

**Trigger:** what the user does or what happens to start this.
**Preconditions:** what must already be true.

1. …
2. …
3. …

**Outcome:** what the user ends up with.

**Alternate paths**

- <condition> → <what happens instead>.

**Failure paths**

- <failure> → <what the user sees and can do>.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| … | … | … | `apps/desktop-media/src/renderer/components/...` |

**States**

| State | What the user sees |
|---|---|
| Empty | … |
| Loading | … |
| Error | … |

**UX notes** — placement, copy rules, keyboard access, anything a redesign must preserve.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | When <condition>, the product <behaviour>. | … | `path/to/source` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| … | … | … | No |

Write "None — this feature exposes no user settings." when that is the case.

## 9. Data & persistence

What the feature stores, described in product terms, and what it means for the user (for
example: survives restart, travels with the file, is lost when the library root is removed).

| Data | Where | User-visible meaning |
|---|---|---|
| … | `media_items.…` | … |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| … | … | … |

## 11. Automatable actions & API surface

Named entry points that both the UI and automation call.

| Action / channel | Parameters | Intent |
|---|---|---|
| `actionName` | … | … |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/....spec.ts` | … |
| Unit | `.../....test.ts` | … |

**Coverage gaps:** what is not tested today.

## 13. Known limitations & open questions

- **Limitation:** … — impact on the user.
- **Open question:** … — what needs deciding.

## 14. References

- Module: [Module name](README.md)
- Related features: …
- Implementation history: `docs/IMPLEMENTATION-LOG/...`
- Architecture: `docs/ARCHITECTURE/...`
