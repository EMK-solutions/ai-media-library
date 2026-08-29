# Product documentation conventions

How product documentation in `docs/PRODUCT-FEATURES/` is structured, written and kept
current. Read this before adding or editing a module or feature document.

---

## 1. What this folder is

`docs/PRODUCT-FEATURES/` describes **what the product does for its users and why**, derived
from the shipped code. It is the reference a product manager, designer, support person or AI
agent reads to answer "how is this supposed to behave?".

It is not:

- an implementation plan — those live in `docs/IMPLEMENTATION-LOG/`
- a technical architecture description — that lives in `docs/ARCHITECTURE/`
- a list of planned work — that lives in `docs/ROADMAP/`
- an end-user manual — that lives in `docs/END-USER-GUIDE/`

When a document would be mostly about code structure, it belongs in `ARCHITECTURE`. When it
is mostly about a decision taken during a delivery, it belongs in `IMPLEMENTATION-LOG`.

---

## 2. Hierarchy

```
Product
└── Module            a coherent area of user value, owned end to end   (13 modules)
    └── Feature       something a user can do, with its own journeys    (one doc or folder)
        └── Sub-feature   a variation or step inside a feature          (table row inside the feature doc)
```

A **module** is a folder: `NN-module-name/` with a `README.md` charter.
A **feature** is `NN-feature-name.md`, or `NN-feature-name/` when it needs splitting (§5).

Modules and features are named from the **user's vocabulary**, not the code's. "Face
recognition", not "face embedding"; "Folder scan", not "metadata upsert job".

---

## 3. Identifiers and status

Every module and feature carries a stable ID so bugs, tests and roadmap items can cite it.

| Kind | Pattern | Example |
|---|---|---|
| Module | `M-NN` | `M-04` (People & Faces) |
| Feature | `F-NN-NN` | `F-04-01` (Face detection) |
| Sub-feature | `F-NN-NN.n` | `F-04-01.2` |
| Business rule | `BR-n` (scoped to its feature doc) | `BR-3` in `F-04-01` |
| User journey | `J-NN-NN-n`, cross-module `J-Xn` | `J-04-01-1`, `J-X1` |

IDs are never reused or renumbered after a doc is published. If a feature is dropped, its ID
retires with it.

**Status vocabulary** (front matter `status:`):

| Status | Meaning |
|---|---|
| `shipped` | Available to users in the current build and behaving as documented |
| `partial` | Usable but knowingly incomplete; gaps listed under "Known limitations" |
| `experimental` | Behind an advanced setting or flag; may change or be removed |
| `planned` | Documented intent, not yet in the product; no code references yet |
| `deprecated` | Still present but being removed; documents the exit path |

---

## 4. Required and optional sections

Feature documents follow `_templates/FEATURE-TEMPLATE.md`. Section order is fixed so readers
and agents can jump straight to what they need.

| # | Section | Required |
|---|---|---|
| 1 | Summary | Yes |
| 2 | User stories | Yes |
| 3 | Scope | Yes |
| 4 | Sub-features | Yes |
| 5 | User journeys | Yes |
| 6 | Screens & UX | Yes |
| 7 | Business rules | Yes |
| 8 | Settings & defaults | Yes (state "None" if the feature exposes no settings) |
| 9 | Data & persistence | When the feature stores anything |
| 10 | Dependencies & failure modes | When the feature depends on a model, service or other feature |
| 11 | Automatable actions & API surface | When the feature has action-registry or IPC entry points |
| 12 | Quality & test coverage | Yes |
| 13 | Known limitations & open questions | Yes |
| 14 | References | Yes |

Module `README.md` files follow `_templates/MODULE-README-TEMPLATE.md`; all of its sections
are required.

---

## 5. Document size and when to split

Keep a feature document readable in one sitting — a human review or an agent context load
should not have to skim past detail it did not ask for.

- **Target:** under 250 lines for a single-file feature document.
- **When it exceeds ~250 lines**, convert the feature to a folder:

```
NN-feature-name/
  README.md            sections 1–4 in full, 5–7 summarised with links, 12–14 in full
  journeys.md          section 5 expanded, one heading per journey
  business-rules.md    section 7 expanded, numbered rules
  ux-screens.md        section 6 expanded, screen-by-screen
  configuration.md     sections 8–9 expanded
```

Only create the detail files a feature actually needs. `README.md` always stays the entry
point and must be understandable on its own: a reader who stops after it should know what the
feature is, who it is for, how a user reaches it, and where the detail lives.

Do not split a feature just because it has many settings — a table is fine. Split when the
narrative sections (journeys, rules, screens) are each substantial.

---

## 6. Writing rules

**Perspective.** Write from the user's point of view. Describe what the user sees, chooses
and gets. Mention internals only where they change observable behaviour (for example a
similarity threshold that decides whether a result appears).

**Business rules are testable.** Each rule states a condition and an outcome, in one or two
sentences, and names where it is defined in code. A rule that cannot be checked by reading
the screen or the database is a technical note, not a business rule.

**Journeys are concrete.** Each journey names the trigger, the preconditions, the numbered
steps a user performs, the outcome, and at least the most likely alternate or failure path.
Avoid "the user configures the settings" — say which setting and what changes.

**Defaults are always stated.** Any setting, threshold or limit mentioned must include its
shipped default value.

**No invented behaviour.** Everything in these documents must be traceable to code, UI copy or
a test. If behaviour is uncertain, record it under "Known limitations & open questions"
rather than guessing.

---

## 7. Referencing code and tests

Use **repository-relative paths without line numbers**, so references survive refactoring:

- Good: `apps/desktop-media/electron/native-face/`
- Good: `apps/desktop-media/src/renderer/components/DesktopPeopleSection.tsx`
- Avoid: line ranges, and deep links to individual functions that get renamed

`source_of_truth` in the front matter lists the two to five paths that define the feature. Use
in-section references ("Defined in: …") for individual rules.

For tests, reference the spec or test file by path and say what it proves:

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/tv-broadcast.spec.ts` | PIN gate rejects unauthenticated requests |

---

## 8. Cross-linking

- Feature → sibling features: relative links, `../04-people-and-faces/01-face-detection.md`
- Feature → its module: `README.md`
- Module → features: the feature index table in the module README
- Anything → shared vocabulary: `GLOSSARY.md`
- Cross-module flows: `JOURNEYS.md`

Every feature document must be reachable from its module README, and every module from
`README.md` at the root of this folder.

---

## 9. Keeping documents current

Update the relevant feature document **in the same change** that alters user-visible
behaviour: a new setting, a changed default, a new screen, a changed rule.

- Bump `last_reviewed` when you verify a document against the code, even if nothing changed.
- Change `status` when a feature moves between shipped, partial, experimental or deprecated.
- Add new business rules with the next free `BR-n`; do not renumber existing ones.
- If a document and the code disagree, the code wins — fix the document and note the
  correction under "Known limitations & open questions" if the intent is unclear.

---

## 10. Adding a new module or feature

1. Copy the matching file from `_templates/`.
2. Allocate the next free ID (`M-NN` / `F-NN-NN`); never reuse a retired one.
3. Fill every required section. `planned` features may leave sections 9–12 marked "n/a — not
   implemented yet".
4. Add the feature to its module README feature index.
5. If the feature introduces a term users will see, add it to `GLOSSARY.md`.
6. If it changes the recommended setup path, update `JOURNEYS.md`.
