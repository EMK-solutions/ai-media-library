# Product OS ideation

**Status:** ideation only — not a product spec, not part of the `docs/PRODUCT-FEATURES/` restructure, and not intended for the product-features docs PR.

**Date:** 2026-08-26  
**Context:** After restructuring `docs/PRODUCT-FEATURES/` as git-canonical Markdown (modules, features, user stories, journeys, business rules, tests), the question is whether that corpus should stay in files, move to a SaaS database, or sit under a hybrid.

This file has two parts:

1. **Alternatives analysis** — a / b / c, with the original recommendation (c1).
2. **c1 in depth** — Git-canonical specs + Product OS as index and workflow: role-by-role experience, true pain points a SaaS would solve, and a critical verdict on whether it is worth building.

---

# Part 1 — Alternatives: files vs SaaS vs hybrid

**Recommendation: (c) a hybrid — keep the structured Markdown in git as the *canonical product spec that ships with the code*, and add a thin Product OS *layer* (SaaS or internal) for workflow, comments, Jira links, and evolution narrative. Do not move the spec body into a database as the only source of truth.**

The assumption that file history is inherently worse is only half right. Git is excellent at *what changed in the artifact that must match the code*. It is weak at *why the product evolved, who decided, and which ticket implemented it*. A SaaS database is the reverse. The architecture should exploit both, not replace one with the other.

---

## What you have today (so the comparison is concrete)

You already have a **typed product model in files**: module → feature → sub-feature → journeys / rules / screens / tests, with stable IDs (`M-04`, `F-04-01`, `BR-3`, `J-X1`). Agents and humans can grep it. It sits next to the code that *is* the product. The pain felt during the restructure (stale web-era docs, 22/5 branch drift, docs lagging ONNX vs sidecar) was not “Markdown is the wrong medium.” It was **no enforced link between spec change and code change**, plus **history of *intent* living nowhere**.

---

## a) Keep Markdown files (current)

### AI agent

**Pros**

- Native habitat: path-addressable, section-stable, no auth, no schema drift, works offline in a worktree.
- Cheap retrieval: “open `F-04-06` section 7” is one read. MCP over a SaaS adds latency, auth failure, and tool-schema tax every turn.
- Specs stay **versioned with the branch**. An agent on `product-features-docs` sees the spec that belongs to that code, not “whatever is in production Product OS.”
- IDs in files are citable in PRs, tests, and `AGENTS.md`.

**Cons**

- No structured query (“all `partial` features that own a Settings card and lack E2E”) unless you add a small index or lint.
- Comments, “open questions,” and decision threads rot in section 13 instead of resolving as tickets.
- Cross-links break when files move.
- Agents will **overwrite** docs unless CI or a human gate exists; files do not have field-level permissions.

### Product manager

**Pros**

- Reviewable in PRs like any other change; “docs + code” is one review.
- Diffs are readable for journeys and rules (especially with a stable template).
- No vendor, no seat cost, no “PM tool the engineers ignore.”
- The recommended onboarding path (`J-X1`) can live next to the features it sequences.

**Cons**

- Git history is **commit-shaped**, not **product-shaped**. `git log -p 02-face-recognition.md` does not answer “when did we raise the similarity threshold and why?”
- Status (`shipped` / `partial`) is easy to leave stale.
- No native comments, @mentions, or approval on a *section*.
- Roadmaps, Jira, and specs remain three worlds. `PRODUCT-FEATURES` vs `IMPLEMENTATION-LOG` vs `ROADMAP` exist for that reason — and humans still lose the thread.

### Software developer

**Pros**

- Same PR: change `shouldInvalidateAiAfterCatalogUpdate` and `F-02-07` BR-2 together. That is the highest-leverage habit you can buy.
- Grep, IDE, GitHub, CODEOWNERS, `last_reviewed` — all boring and reliable.
- Tests cited by path stay honest if CI fails when the spec file and the spec name diverge (this can be linted).

**Cons**

- Developers will not open 84 files to find “who owns this setting.” Without an index (settings ownership is a start) the tree is a maze.
- Merge conflicts in prose are uglier than in code.
- No field-level history: a one-line default change is mixed with a rewrite of journeys.

**On history:** file history is *more* intuitive for “what did this spec say when we shipped 0.3.0?” (tag the repo). It is *less* intuitive for “tell me the story of Face recognition over six months.” Git blame is not a changelog. That gap is real; it does not mean the spec should leave git.

---

## b) Product OS SaaS as the system of record (query via MCP / API)

Treat template sections as objects: Feature, UserStory, Journey, BusinessRule, Screen, Setting, TestCoverage, each with its own history, comments, and Jira links.

### AI agent

**Pros**

- Structured queries: `features.where(status=partial, module=M-04, missing_e2e=true)`.
- MCP can return **just section 7** without loading a 250-line file.
- IDs become foreign keys: `BR-3` ↔ Jira `AML-1842` ↔ PR `#64`.
- Comments on a *rule* (not a file) match how PMs argue.

**Cons**

- **Branching is the killer.** Agents work on feature branches. If Product OS is one cloud DB, the agent is either editing “production truth” while the code still says otherwise, or you must invent **spec environments / spec branches** — at which point you have rebuilt git, badly.
- Every agent turn depends on network, tokens, and the vendor’s MCP quality. Cursor already reads the repo; a second source of truth will be **wrong more often than empty**.
- Export/sync lag: code merged, spec not; or spec updated, code not. A SaaS-primary model inverts “code wins” unless sync is bidirectional and blocking.
- Prompt injection / stale cache / pagination: MCP catalogs are worse for long specs than a file read.

### Product manager

**Pros**

- This is what SaaS is *for*: workflow. Status boards, “rules changed this quarter,” comments, stakeholders who will never clone the repo.
- Section-as-object + per-field history is the right model for **evolution narrative** (“BR-3: 0.38 → 0.42 on 2026-05-12 because false positives, AML-210”).
- Jira/Linear linkage is first-class: Epic = module, Story = feature, AC = business rules.
- Discovery (interviews, mocks) can live next to the spec without polluting git.

**Cons**

- **Two products to maintain** (the media library + Product OS). Empty fields, abandoned workspaces, and “the Jira link is to a deleted ticket” become the new stale Markdown.
- PMs start writing in the tool engineers do not open; engineers keep the truth in code. Split-brain is the default failure mode of every PRD SaaS.
- Vendor lock-in of *the product definition*. Export is never as clean as a git clone.
- Cost, permissions, SSO, audit — real, but secondary to split-brain.

### Software developer

**Pros**

- Traceability: commit message / PR template can require `Implements F-04-06 / AML-1842`.
- Dashboards of “specs with no tests” if the SaaS ingested coverage from CI.

**Cons**

- Will not edit a web form to change a default from `0.38` to `0.42` in the same motion as the TypeScript constant. They will skip the SaaS. The spec dies.
- Offline, air-gapped CI, and “open the spec at this git SHA” become API archaeology.
- Code review cannot show spec+code as one diff unless you generate Markdown from the DB **into the PR** — which means files were the review surface all along.

**On history:** SaaS field history is better for *decisions and comments*. It is worse for *reproducing the product at a git tag* unless you snapshot the entire graph per release. Few Product OS tools do that well. Git tags + generated static export do.

---

## c) Alternatives (pick among these; the recommended one is c1)

### c1) Git-canonical specs + Product OS as *index and workflow* (recommended)

| Layer | Owns | Does not own |
|---|---|---|
| **Git Markdown** (current `docs/PRODUCT-FEATURES/`) | Canonical text of journeys, rules, UX, defaults, test pointers | Comments, Jira state, roadmap scoring |
| **Thin Product OS / DB** | Feature registry (IDs, status, owners, Jira keys, last_reviewed, “open questions” queue), comments, changelog *entries* | The prose paragraphs |
| **CI** | Fail PR if `F-02-07` IDs in code comments don’t exist; optional: require spec file touch when `ipc.ts` defaults change | Writing the spec |

**How history works**

- **Spec text history** = git (per release: “what did we claim at 0.3.0?”).
- **Evolution history** = changelog objects in the OS, or conventional commits + a generated product changelog (“Face recognition threshold 0.38→0.42, reason, Jira”). One row per *decision*, not per keystroke.
- **Implementation history** = Jira/Linear already. Link `F-04-06` ↔ epic/story. Do not duplicate `IMPLEMENTATION-LOG` into Jira *and* the SaaS.

Template sections stay Markdown headings **or** become **typed blocks in the same files** (YAML front matter + MD body, or MDX). Promoting them to SQL columns is optional later, via **parse-on-ingest** (files → DB views), never the other way around as the only copy.

MCP: expose **read** APIs over the parsed git spec (`get_feature(F-04-01)`, `list_rules(module=M-02)`). Write still happens in PRs (or the OS writes a PR). Agents then query structure without leaving the repo as source of truth.

### c2) Structured files that *are* a database (no SaaS)

Keep git; replace freeform MD with **YAML/JSON per feature** (or MD with strict front matter for every BR/journey) plus a small validator. Query via SQLite generated in CI, or `rg`, or an MCP server that reads the repo.

Pros: agent- and CI-friendly, branchable, no vendor. Cons: worse for comments and PM-only stakeholders; you build a mini Product OS yourself.

### c3) Wiki / Notion / Confluence as primary

Worse than both (a) and (b) for this repo: no PR coupling, no branch specs, agents scrape HTML, history is page-level mush. Use only for *communication* copies generated from git.

### c4) Code-as-spec (annotations / OpenAPI-for-product)

Business rules as typed constants + tests named `BR-3`. Docs generated. Excellent for defaults and rules; terrible for journeys and UX narrative. Complement, don’t replace, the feature MD.

---

## Direct answers to history and Jira points

**“File history is more complex and less intuitive.”**  
For *product evolution storytelling*, yes. For *correctness at a point in time*, no — git is simpler and more trustworthy. PMs should not be expected to use `git log -S`. They should get a **changelog of decisions** (c1). That changelog can live in the SaaS *or* in dated entries with IDs. Either is more intuitive than either raw git *or* a database full of field versions with no release snapshot.

**“Template sections as DB fields with their own history and comments.”**  
Right *granularity* (User story, BR, Journey should be addressable). Wrong *primary storage* if that storage is not branched with the code. Model them as **addressable fragments in git** (`BR-3` in `F-04-02`) and optionally **mirror** them into a DB for comments and Jira. Per-field git history is already possible (`git log -L`); per-field *discussion* is not — that is the SaaS/Jira job.

**“Link implementation stories to product structure.”**  
Do this with **IDs, not with moving the spec**.  
`F-04-06` in Jira labels / a custom field / a markdown `jira: AML-1842` in front matter. Automation: on merge, Jira transitions; on spec status → `shipped`, require a linked issue in `Done`. `IMPLEMENTATION-LOG` stays “how we built it”; `PRODUCT-FEATURES` stays “what it is now.” Product OS can *join* those IDs. It should not *become* either document.

---

## Perspective summary (part 1)

| Perspective | Prefer | Why |
|---|---|---|
| **AI agent** | Files (a) + optional **read-only** MCP over parsed files (c1/c2) | Branch fidelity, zero extra failure modes, full text in context |
| **Product manager** | Workflow SaaS **on top of** files (c1), not instead of (b) | Comments, status, Jira, evolution narrative; still one review with engineering |
| **Software developer** | Files in the PR (a), with lint/CI (c1) | Spec changes when behavior changes; no second system to forget |

**Avoid (b) as system of record** until there is a solved answer for: spec branches, release snapshots, and a blocking sync so the DB cannot say `shipped` while `dev` disagrees. Most Product OS tools do not have that; git already does.

**If you invest once:** parser + validator for the template (IDs, required sections, defaults must appear, test paths must exist) → optional MCP `query_features` over the repo → Jira custom field for `F-xx-xx` → a human-readable product changelog. That is 80% of Product OS value without relocating the source of truth away from the product it describes.

---

# Part 2 — c1 in depth: Git-canonical specs + Product OS as index and workflow

## 2.1 What c1 actually is (and is not)

c1 is **not** “put the PRDs in a nicer wiki.” It is a **split of concerns**:

```
┌─────────────────────────────────────────────────────────────────┐
│  GIT (canonical)                                                │
│  docs/PRODUCT-FEATURES/**  + code + tests                       │
│  Owns: the claim about what the product does *in this revision* │
└────────────────────────────┬────────────────────────────────────┘
                             │ parse / ingest on merge & on tag
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT OS (index + workflow)                                  │
│  Registry of IDs, status, owners, Jira, comments, decisions     │
│  Owns: work-in-progress conversation *about* the claim          │
└─────────────────────────────────────────────────────────────────┘
                             │ never writes prose back except
                             │ via a pull request
```

**Git owns the sentences.** If the OS and git disagree, git wins, and the OS is stale until the next ingest.

**The OS owns the work around the sentences:** who is looking at this feature, which ticket will change BR-3, what we decided last Tuesday, whether legal signed off, whether this is in the next release cut.

If a proposed Product OS feature requires the SaaS to be the place you *author* journeys and business rules, that feature is **out of scope for c1**. It is option (b) in disguise.

---

## 2.2 The object model (thin on purpose)

Do **not** start by modelling every template heading as a first-class table with its own editor. Start with objects that *workflow actually needs*:

| Object | Source | OS stores extra |
|---|---|---|
| Product | implicit | name, default branch, release tags |
| Module (`M-04`) | folder + README front matter | owner, health, Jira epic |
| Feature (`F-04-06`) | file / folder + front matter | owner, status override *only if* it matches git, watchers |
| Fragment ID (`BR-3`, `J-04-06-1`, `F-04-06.2`) | parsed from the file | comments, decision log, links |
| Decision | OS-native | date, author, reason, old→new, Jira, PR |
| Work item link | OS-native | Jira/Linear/GitHub issue keys |
| Review / comment | OS-native | threaded, on a fragment or feature, resolved/unresolved |
| Release snapshot | derived | pointer to git tag + ingested graph at that tag |

Prose (user stories, journey steps, UX tables) stays in Markdown. The OS **displays** a rendered view and **anchors** comments to heading IDs / fragment IDs. Editing a journey still happens in the file (IDE, GitHub, or “Edit in git → open PR” from the OS).

Front matter already gives you a parseable spine (`id`, `status`, `last_reviewed`, `source_of_truth`, `related`). That is the ingest contract. Do not invent a second schema until that one is enforced in CI.

---

## 2.3 How data flows (the only architecture that does not split-brain)

1. **Author in git** (dev, PM, or agent) on a branch. Spec and code change together.
2. **PR** is the approval surface. Reviewers see spec diff + code diff.
3. **On merge to `dev` / `main`:** ingest job parses `docs/PRODUCT-FEATURES/**`, upserts registry rows, **does not delete comments** on IDs that still exist, marks missing IDs as retired.
4. **On git tag (release):** freeze a snapshot. “What did we claim in 0.3.0?” is a tag, not a DB undo log.
5. **Jira:** issues carry `F-xx-xx` (custom field). Webhook updates the OS link table. Closing a story does **not** by itself set spec `status: shipped` — that remains a git edit (or a bot that opens a PR).
6. **OS → git:** the only legitimate writes are *PRs*: “set `last_reviewed`”, “add Decision block”, “link Jira in front matter”. Humans or a bot open the PR; CI still validates.

**Forbidden:** a PM clicking “status = shipped” in the OS while `dev` still says `partial`. That is how you recreate the stale-docs problem in a more expensive tool.

---

## 2.4 Experience by role

### AI agent

**A day in the life that is actually better**

- “Which features are `partial` and cite no E2E file?” — MCP/`query_features` over the **parsed repo of the current worktree**, not over cloud production. Same branch, same truth.
- “Show BR-3 for face recognition and the test that covers it” — one structured call, not a 300-line file.
- “Open questions on M-08 that have no Jira” — OS index, because that join does not belong in Markdown.
- When implementing a setting default change: agent edits `ipc.ts` **and** the feature file in one commit, then optionally adds a Decision via PR template (`Closes decision on F-11-03 / BR-2`).

**A day in the life that is worse if you get c1 wrong**

- Agent authenticates to Product OS, reads `shipped`, implements against `dev` where the rule differs. You have paid for a **confident lie**.
- Agent writes comments into the OS and never updates the file; next agent only reads git. Conversation evaporates from the spec.
- MCP returns truncated fragments; the agent invents the rest of the journey.

**What the agent actually needs from a Product OS (pain it solves)**

| Pain today | What c1 OS/MCP should do |
|---|---|
| 84 files, no query | Filter by module, status, “has E2E”, “owns this setting label” |
| Open questions rot in §13 | List unresolved fragments + whether a ticket exists |
| Related features are wiki links | Graph: `related[]` + Jira + `source_of_truth` paths |
| Easy to edit the wrong revision | Bind MCP to **this clone / this SHA**, default |

The agent does **not** need a CMS. It needs a **catalog API over git** plus a **join table to tickets**. Most of that can be a repo-local MCP server with zero SaaS.

**Value that is real vs fashionable**

- Real: structured query, ID graph, “don’t load the whole module.”
- Fashionable but weak: “the agent discusses the spec in the SaaS like Slack.” Agents already discuss in the IDE. Threaded comments help *humans* more than models.

---

### PM / business user

This is the role for whom a Product OS is *for*. Engineering will tolerate it; PMs must *prefer* it or it will die.

**A day in the life that is actually better**

- **Map, not folder tree.** Sidebar of 13 modules, traffic lights (`shipped` / `partial` / `experimental`), click into F-04-06, read the rendered Markdown from git (always labelled “from `dev` @ abc123”).
- **“What are we arguing about?”** Open questions and unresolved comments on `BR-4` (declining a suggestion doesn’t ban the face), not a hunt through section 13 of six files.
- **“What changed in People since 0.3.0?”** Decision log: threshold, tagging loop wording, Jira keys — not `git log --oneline`.
- **Release cut.** Filter features by snapshot tag; export a PDF/Notion *generated from git at that tag* for a stakeholder who will never clone.
- **Triage with engineering.** Comment on `J-X1` step 4: “three to five faces is too high for first-run; make it two.” Engineer answers in the thread, then the *wording change* still lands as a PR so the agent and the next hire see it.
- **Jira without duplicating the PRD.** Epic `M-04`, stories `F-04-01`… Acceptance criteria *reference* `BR-n` instead of copy-pasting rules into Jira (copy-paste is how rules diverge).

**A day in the life that is worse if you get c1 wrong**

- PM writes a new journey in the OS. Engineer never sees it. Agent never sees it. Three weeks later someone “implements the spec” from git and the PM feels the tool is useless.
- Status board is updated in the OS for a demo; git still says `partial`. Leadership trusts the board.
- Stakeholder comments on a rendered paragraph; ingest reflows the file and every anchor breaks. Comment threads point at the wrong BR.

**True pain points a Product OS solves for this role (the ones files will not)**

1. **Narrative history of decisions** — git answers “the file looked like this.” PMs need “we raised the threshold because of false matches on kids, AML-210, May 2026.” That is a Decision object. Without it, every new PM re-litigates BR-3.
2. **Conversation on a rule, not on a file** — GitHub PR comments die when the PR merges. File-level issues mix six topics. Fragment-anchored threads are the actual missing product.
3. **Work joining** — “this feature is in flight” is a property of tickets and people, not of a `status:` field that should mean *behaviour in the build*. Mixing “in sprint” with “shipped in product” is how status becomes meaningless. The OS should show **both**: git status vs sprint status, side by side, and refuse to conflate them.
4. **Audience that will not use git** — support, design, a co-founder, a beta tester. They need read + comment. They should not need a clone. Render-from-git + comments in OS is the honest design. Author-in-OS is the trap.
5. **Portfolio questions** — “what is partial?”, “what has no E2E?”, “what depends on Ollama?” Files can answer if you grep; PMs will not grep. A board that is a **projection of git** is legitimate. A board that is independently editable is a second product definition.
6. **Discovery debris** — interview notes, competitor matrices, “we might kill TV broadcast.” That does **not** belong in `docs/PRODUCT-FEATURES/`. An OS (or Notion, or `docs/ROADMAP/`) for *intent* vs git for *current behaviour* is a real split. The OS is useful here only if it **links** discovery pages to `F-10-01` without letting discovery overwrite the spec.

**What is not a pain the OS should “solve”**

- Making specs “easier to write than Markdown.” If PMs will not learn the template, they will not maintain a form with 14 tabs either. The template is the product discipline; the OS is not a substitute for it.
- Replacing Jira. You already have an issue tracker. A Product OS that becomes a third backlog will be ignored. It should **attach** to Jira, not compete with it.

---

### Software developer

**A day in the life that is actually better**

- PR template: `Affects: F-02-07, F-01-05`. CI checks the files exist and, optionally, that `status` / defaults mentioned in the spec still match `ipc.ts` for a small allowlist of settings.
- CODEOWNERS: `docs/PRODUCT-FEATURES/04-people-and-faces/` → people who own faces. Review load is scoped.
- Bug report: “BR-7 invalidation deletes face tags.” Dev jumps to the file, then to `media-ai-invalidation.ts`. No hunt through Confluence.
- If they care about the argument: open the OS thread on BR-7, see why tags are dropped on replace. If they do not care, they never open the OS. **That is success.** The OS is optional for implementers; git is not.

**A day in the life that is worse if you get c1 wrong**

- Required login to a SaaS to know the spec; VPN; another password. They will not.
- “Please update Product OS” as a separate ticket after the code PR. They will forget. Spec dies.
- Generated Markdown from OS on every CI run creates noisy diffs and merge hell.

**True pain points a Product OS solves for this role**

Few. Be honest.

| Pain | Does OS help? |
|---|---|
| Spec out of date vs code | **No** — only same-PR + CI helps |
| Can’t find which feature owns a setting | **Mildly** — a generated index in git (`11-settings/.../02-settings-ownership-index.md`) already does this; OS is a nicer UI on the same parse |
| Don’t know which Jira is in flight | **Yes** — if they look. Many will look at the GitHub issue/PR instead |
| Repeated product arguments | **Yes, if** decisions are linked from the spec file (`See Decision D-19`) so they don’t need the OS for the *conclusion* |
| Reviewing a 400-line MD diff | **No** — split files (already done for scan/dashboard/dupes) and smaller PRs |

The developer-facing win of c1 is almost entirely **CI + IDs + same PR**, which you can do **without any SaaS**. The OS is a PM/business convenience that must not add a duty for developers.

---

## 2.5 Key values of a Product OS in the c1 shape (pain-first)

If you cannot name the pain, do not build the product. These are the pains that are real **after** git-canonical specs exist:

### Pain 1 — “Git is not a product changelog”

**Symptom:** A PM cannot brief “what changed in People this quarter” without an engineer. `git log` mixes doc restructures, typo fixes, and real rule changes.

**OS value:** Decision objects (old value, new value, reason, date, ticket, PR). Ingest can *suggest* candidates from diffs (`minConfidenceThreshold: 0.75 → 0.8`) for a human to confirm as a Decision. Unconfirmed diffs stay “unclassified file churn.”

**Can you do this without SaaS?** Yes: `docs/PRODUCT-FEATURES/CHANGELOG.md` + conventional commits (`spec(F-04-02): raise suggestion threshold`). A SaaS is nicer UX, not new information theory.

### Pain 2 — “PR comments are ephemeral; spec comments need to live”

**Symptom:** A reviewer says “this journey skips the empty-folder case.” The PR merges. Six months later the gap is still there and nobody remembers the review.

**OS value:** Comment on `J-08-01-2`, remains until resolved, can spawn a Jira.

**Can you do this without SaaS?** Partially: GitHub issues with `F-08-01` labels; or `open questions` in the file that CI fails if they grow forever. SaaS wins on threading and non-git users.

### Pain 3 — “Jira and the spec describe two products”

**Symptom:** Story AC pasted from an old conversation; spec updated; Jira not. Or the reverse.

**OS value:** Jira AC is “see `F-04-06` BR-1..5 at SHA”; the OS shows the rendered rules **as of the branch the story targets**. The join is the product.

**Can you do this without SaaS?** Yes: Jira custom field + a browser extension or a bot that comments the spec URL at that SHA. SaaS is a dashboard over the same IDs.

### Pain 4 — “Stakeholders cannot read the repo”

**Symptom:** You paste screenshots of Markdown into email.

**OS value:** Authenticated read of rendered specs, always stamped with git SHA and branch. Comments allowed; edits not (except “request change” → issue).

**Can you do this without SaaS?** Yes: GitHub Pages / Docusaurus on `docs/PRODUCT-FEATURES`, or MkDocs, deployed per tag and per `dev`. This is often **better** than a custom OS because it is obviously a view of git. A SaaS that re-implements a doc site is waste.

### Pain 5 — “Open questions and partial features have no owner”

**Symptom:** Section 13 is a junk drawer. `partial` write-back of titles never gets a ticket.

**OS value:** Queue: fragment + owner + due + Jira. The only OS feature that might justify a build if you refuse to use Jira for this (you should not refuse — Jira is the queue).

**Can you do this without SaaS?** Yes: every `**Open question:**` must have `jira: AML-xxxx` in CI, or the build warns. Brutal, effective, no new product.

### Pain 6 — “Agents and humans need query, not browse”

**Symptom:** “List experimental features that depend on Ollama.”

**OS / MCP value:** Structured index.

**Can you do this without SaaS?** Yes: parse front matter + a `dependencies:` list into SQLite in CI; MCP reads the SQLite in the repo or generated artifact. **This is the highest-leverage “OS” and it does not need to be multi-tenant SaaS.**

---

## 2.6 Does it make sense to *build* a Product OS SaaS?

**Short answer: not as a SaaS product, and not as a large internal platform, until a cheaper slice has failed.**

### Why building a full Product OS is usually a bad bet

1. **You are not in the Product OS business.** You are in the local AI media library business. A spec workflow tool has competitors (Jira, Linear, GitHub, Notion, Productboard, ado, even a well-typed Markdown repo). Internal tools like this become graveyards when the champion PM leaves.

2. **The hard problems are not CRUD.** Branching, SHA-accurate render, comment anchors through Markdown reflows, permissions, MCP, ingest, conflict with git — that is a year of work. The easy demo (pretty module cards) is a weekend and convinces people to fund the year.

3. **c1’s developer value is CI.** Validators, CODEOWNERS, PR templates, and a generated site deliver most engineering benefit. A SaaS that does not own CI will not improve spec/code coupling.

4. **Jira already exists.** A second board for “product structure” that does not replace sprint planning will be skipped. Integration is the product; a new database of features is a copy of `docs/PRODUCT-FEATURES/README.md`.

5. **Option (b) gravity.** Every Product OS vendor and every internal team will be asked to “just let PMs edit here.” That request is reasonable and **destroys c1**. Unless you can politically defend “edits are PRs” forever, you will get split-brain. Building the OS makes that request louder, not quieter.

6. **Scale does not justify it yet.** ~13 modules, ~50 features, one desktop product, a small team. Spreadsheet + git + Jira labels work. Productboard-class tools start to pay around many products, many PMs, and a process team. You are below that line.

### When building (or buying) *does* make sense

Buy or build a **thin** layer if **several** of these are true:

- More than one PM/designer/support person must comment weekly and will not use GitHub.
- You already lose arguments because decision history is unwritten (not because Markdown is hard).
- You will fund **ingest + SHA-stamped read-only UI + Jira join + decision log**, and you will **refuse in-app authoring** of spec prose.
- You are willing to treat “generated documentation site + SQLite index + MCP in the repo” as v1, and only then decide a hosted UI is needed.

### What to build instead (order of ROI)

| Order | Investment | Solves | SaaS? |
|---|---|---|---|
| 1 | CI validator: IDs unique, required sections, `status` enum, test paths exist, settings ownership index generated | Stale/broken specs, agent-detectable structure | No |
| 2 | Static site from `docs/PRODUCT-FEATURES` on `dev` and on tags | Stakeholder read | No |
| 3 | Jira custom field `Feature ID` + link in front matter `jira:` | Implementation join | No (Jira) |
| 4 | `CHANGELOG-PRODUCT.md` or Decisions as YAML in repo | Evolution narrative | No |
| 5 | Repo MCP: `get_feature`, `list_open_questions`, `search_rules` over parsed files / SQLite | Agent query | No |
| 6 | Hosted read UI + comments (GitHub Discussions per feature, or a small app) | PM conversation | Maybe |
| 7 | Full Product OS SaaS with its own CMS | Almost nothing extra if 1–6 exist | **Don’t** |

**Buying** Productboard / similar as *roadmap and insight* linked **out** to git spec URLs can make sense. **Buying** it as the place the spec lives does not, for this codebase.

---

## 2.7 Recommended stance for this project

- Keep **git-canonical** feature docs (the restructure you just did). That is the Product OS *data model* already, in the only database that branches with the product.
- Spend the next increment on **discipline** (same-PR spec updates, validator, Jira IDs, product changelog, static site, repo MCP) — not on a new SaaS.
- Revisit a hosted Product OS only when pain 2 and 4 (living comments, non-git readers) are clearly costing more than a generated site + GitHub issues.
- If you ever build c1 software, the **north-star test** is: unplug the OS for a week; can you still ship with correct specs? If no, you built (b). If yes, you built c1.

---

## 2.8 One-page verdict

| Question | Answer |
|---|---|
| Should specs leave git? | No |
| Should template sections become DB columns? | Only as a **parse of git**, not as the authoring store |
| Is file history the wrong tool? | Wrong for *why*; right for *what at this SHA* |
| Does a Product OS SaaS solve true pain? | Decision log, comments, stakeholder read, Jira join — **if** it never authors the spec |
| Should *you* build that SaaS? | **No**, not first. Build ingest/query/CI/site. Buy Jira+docs site. Reassess when the team is bigger and comment traffic is proven |
| What looks like a Product OS but is the right v1? | Parsed index + MCP + SHA-stamped doc site + Decision changelog + Jira field |
