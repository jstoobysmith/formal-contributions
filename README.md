# Formal Contributions

> As we see AI transforming the way that credit is given in academia, Formal Contributions is a site for recording reports of the valuable work put in to grow, and maintain the formalization eco-system. Every report is independently verified, and can be cited on CVs, papers, or grant applications. 

## How the site works 

The site is split into five distinct parts. 
1. The submission form (this is what authors see and interact with). 
2. The review and acceptance of submissions. 
3. The deployment and signing. 
4. The website display and ability to verify a report. 
5. The hosting of the website and the keys. 

Everything happens in public on GitHub. The only things that are hidden are 
the two secret keys (Part 5).

### Part 1: Submissions 

Submissions take place through a form: 
- hosted at: site-url/submit
- submission form: [`src/pages/Submit.tsx`](src/pages/Submit.tsx). 

**Sections** 

In the first part of the form the user chooses which section they 
want to associate their report with. The different sections 
are defined in: 
- definitions of sections: [`config/sections.json`](config/sections.json)

There are currently six different sections. 

| Section | Report | For |
| --- | --- | --- |
| I |  Review Report | Reviewing pull requests |
| II |  Maintenance Report | Version bumps, CI, tooling, triage |
| III |  Refactoring Report | Generalising, unifying, reorganising |
| IV |  Foundations Report | Core definitions other results build on |
| V |  Formalisation Report | New lemmas, definitions and results, including many small additions |
| VI |  Documentation Report | Docstrings, module overviews, guides and tutorials |

In the beta phase, there is also a Test section. 

**Project** 

The user then chooses a single primary project for their submission, along 
with optional secondary projects. These work in a very similar way to 
the ArXiv's classifications: only the verifiers of the primary project can 
accept the submission (Part 2). The different projects are listed in: 
- list of projects: [`config/projects.json`](config/projects.json)

For each project, this file gives its name, a one-sentence description, its 
website, its GitHub repository and, optionally, its Zulip channel. It also 
lists the project's verifiers: the people who can review and accept reports 
for that project (Part 2). There is currently one project, Physlib 
(`leanprover-community/physlib`). While there is only one, the form chooses 
it automatically. 

To add a project, add an entry to `config/projects.json`. Its `id` is what 
submissions and links use, so it should not change later. 

The project is saved in the submission as `projects`, primary first. 
Submissions made before projects existed have no `projects`; they belong to 
the `defaultProject` in [`config/site.json`](config/site.json) (Physlib). 

The project also decides which repository pull request numbers refer to, 
when pull requests are pasted in as evidence (below), and appears on the 
report. 

**Who did the work**

The user gives their full name, their GitHub username and, optionally, their 
ORCID iD. These are shown on the report. The GitHub username matters: the 
submission must be sent from that GitHub account (Part 2). 

If the work was done jointly, the user can name up to ten collaborators. 
Each collaborator gets their own report only if they submit one themselves. 

**The work**

The user gives a title, a short summary of what was done and why it mattered, 
and, optionally, the months the work started and finished. 

**Evidence**

The user gives links to the work itself: pull requests, reviews, commits, 
modules, Zulip threads and so on. Many pull requests can be pasted at once. 
The user only gives links, not titles: the titles of GitHub links are looked 
up automatically later (Part 3). 
- pasting many pull requests: [`src/components/ImportPullRequests.tsx`](src/components/ImportPullRequests.tsx)
- the kinds of evidence each section allows: `evidenceKinds` in [`config/sections.json`](config/sections.json)

**Sending**

The last step sends the submission to GitHub. The form opens a new GitHub 
issue in this repository with the submission already filled in, and the user 
just clicks *Create*. No fork is needed. 
- sending it as an issue: [`src/components/SendOnGitHub.tsx`](src/components/SendOnGitHub.tsx), [`src/site/github.ts`](src/site/github.ts)
- the GitHub issue form it lands in: [`.github/ISSUE_TEMPLATE/submission.yml`](.github/ISSUE_TEMPLATE/submission.yml)

For people who prefer pull requests, the form can instead open a pull request 
that adds the submission as a file under [`submissions/`](submissions/). 

What a submission contains, and the checks on it, are defined in: 
- submission format: [`src/lib/submission.ts`](src/lib/submission.ts)

While the user fills in the form, a draft is saved in their browser 
([`src/site/useSubmissionDraft.ts`](src/site/useSubmissionDraft.ts)). 

**Links that fill in the form**

A link to `/submit` can fill in the form, so you can send someone a submission 
that is ready to check and send from their own account. Make one with *Copy a 
link to this form* on the form, or by hand: 

```
https://formalcontributions.com/submit?section=review&name=Ada%20Example&github=ada&title=Reviewed%2010%20pull%20requests%20on%20quantum%20mechanics&prs=1749,1747,1744
```

| Parameter | Fills in |
| --- | --- |
| `section` | `review`, `maintenance`, `refactoring`, `foundations`, `formalisation`, `documentation` or `test` |
| `projects` | project ids, primary first, separated by commas, e.g. `physlib` |
| `name`, `github`, `orcid` | who did the work |
| `title`, `summary` | the work (URL-encoded; `%0A` for a new line) |
| `from`, `to` | months, `YYYY-MM` |
| `prs` | pull request numbers in the primary project's repository (Physlib's if no project is given), separated by commas |
| `link` | any other evidence link; repeat for several |

Opening such a link replaces any draft saved in that browser, and sends 
nothing. 
- code for these links: [`src/lib/prefill.ts`](src/lib/prefill.ts)

**Text on the form**

The text on the form page (the introduction, "What happens next" and so on) 
is in [`content/submit/`](content/submit/). 

### Part 2: Review and acceptance 

**The summary**

As soon as the issue is opened, a GitHub workflow posts a summary on it for 
the verifiers. The summary shows the submission and its projects, the 
section's criteria as a checklist, any evidence already used in another 
report, the user's previous reports, and which verifiers can accept it. 
- workflow: [`.github/workflows/submission-issue.yml`](.github/workflows/submission-issue.yml)
- code for the summary: [`scripts/issue-submission.ts`](scripts/issue-submission.ts), [`scripts/lib/summary.ts`](scripts/lib/summary.ts)

**Who reviews: the verifiers**

Each project has its own verifiers, listed with the project in: 
- list of projects and their verifiers: [`config/projects.json`](config/projects.json)

Only a verifier of a submission's primary project can accept it. Being a 
verifier of a secondary project is not enough. A project with no verifiers 
cannot accept submissions until one is added. 

Each verifier is listed with their GitHub username, name, and optionally 
their role, affiliation and numeric GitHub `id` (which stops anyone else 
from taking over a renamed account). The About page lists the verifiers of 
each project. 

The number of approvals each report needs is `review.requiredApprovals` in 
[`config/site.json`](config/site.json). Verifiers need no write access to 
the repository to accept a submission. 

**Reviewing a submission**

1. Open each evidence link and tick the criteria. "Substantive" means the 
   comments or changes affected the physics, the Lean code or the documentation. 
2. If the work is better split across sections, or several small submissions 
   would be better as one, say so and ask for changes. 
3. To approve, comment `/accept I have no conflict of interest` on the issue. 
   Do not approve if you supervise, co-authored the work with, or work closely 
   with the user. 
4. When the required approvals are in, the submission is accepted, the issue 
   is closed, and the report is signed within minutes. If the user edits the 
   issue after you accept, accept it again. 

To decline, close the issue with a short, kind note, for example: 

> Thank you for submitting this. We don't think it meets the criteria for
> this section yet (in particular, …). That is not a judgement on the value
> of the work, and you are welcome to submit again later.

**Rules for approving reports**

A submission is accepted, and later signed, only if: 
- it was sent by the person it credits: they opened its issue (or the pull 
  request that added it); 
- the file that is accepted is exactly the submission in the issue (or 
  exactly what the pull request merged); 
- it has enough approvals **on its final version** from verifiers of its 
  primary project, 
  each including the phrase "no conflict of interest". An edit to the issue 
  after an approval cancels that approval. Only each person's latest approval 
  counts; 
- none of the approvals comes from the user, anyone named as a collaborator, 
  or whoever opened the issue or pull request. 

Test submissions don't need these rules: one `/accept` from a verifier of its 
project is enough. 
- code for the rules: [`src/lib/review.ts`](src/lib/review.ts)

**Acceptance**

When the rules are met, the workflow commits the submission to 
[`submissions/`](submissions/) on `main`, records which issue it came from in 
[`data/issue-submissions.json`](data/issue-submissions.json), and closes the 
issue. That commit starts Part 3. 

**Submissions made as pull requests**

These work the same way, except that: 
- the summary is posted by [`.github/workflows/submission-summary.yml`](.github/workflows/submission-summary.yml), 
  and [`.github/workflows/check.yml`](.github/workflows/check.yml) checks the file; 
- a verifier approves with an *Approve* review on the last commit, saying 
  "I have no conflict of interest", and merges once the approvals are in. 
  Merging without enough approvals adds the file, but it is never signed. 

### Part 3: Deployment and signing 

Every new commit on `main` starts the *Sign and deploy* workflow: 
- workflow: [`.github/workflows/sign-and-deploy.yml`](.github/workflows/sign-and-deploy.yml)

It does three things. 

**1. Signing**

For each accepted submission that has no report yet, it: 
- checks the rules of Part 2 again; 
- looks up the titles of its GitHub links (e.g. "Review of #412: Add the 
  Lorentz group"); 
- turns it into a report, an **Open Badges 3.0** credential; 
- gives it the next report number (test reports get no number); 
- signs it with the secret signing key (Part 5). 
- code for signing: [`scripts/sign.ts`](scripts/sign.ts), [`src/lib/credential.ts`](src/lib/credential.ts), [`src/lib/dataIntegrity.ts`](src/lib/dataIntegrity.ts)
- code for looking up titles: [`src/lib/evidence-titles.ts`](src/lib/evidence-titles.ts), [`scripts/lib/evidence-titles.ts`](scripts/lib/evidence-titles.ts)

Each run also gives titles to existing reports whose GitHub links still have 
an automatic name (such as "Pull request #3"), and signs them again. Nothing 
else in them changes. 

If a submission does not meet the rules, the run reports an error and the 
submission waits, unsigned. Running the workflow again after more approvals 
signs it. 

**2. Saving the reports**

The workflow commits the signed reports back to `main`. These files, and the 
accepted submissions, are written only by the workflows. Never edit them by 
hand. 

| Path | Contents | Written by |
| --- | --- | --- |
| [`submissions/`](submissions/) | accepted submissions, one JSON file each | *Submission issue* (Part 2), or a merged pull request |
| [`data/issue-submissions.json`](data/issue-submissions.json) | the issue each accepted submission came from | *Submission issue* |
| [`public/credentials/`](public/credentials/) | the signed reports | *Sign and deploy* |
| [`data/report-numbers.json`](data/report-numbers.json) | the permanent number of each report | *Sign and deploy* |
| [`public/specimen.json`](public/specimen.json) | a sample report, signed from [`examples/specimen.submission.json`](examples/specimen.submission.json) | *Sign and deploy* |

Reports are numbered in the order they are signed, and keep their number for 
good. 

**3. Deploying**

Finally, the workflow builds the site and publishes it on GitHub Pages 
(Part 5). The build also writes the files that let anyone check a report, 
such as the DID document (`did.json`) and the list of reports. 
- code for these files: [`scripts/build-static.ts`](scripts/build-static.ts)

### Part 4: Display and verification 

**The website**

The website is a static React site. Its main pages are: 

| Page | Shows | Code |
| --- | --- | --- |
| `/` | the introduction and the sections | [`src/pages/Home.tsx`](src/pages/Home.tsx) |
| `/reports/<name>` | one report, with its citation and badge | [`src/pages/Report.tsx`](src/pages/Report.tsx) |
| `/archive` | every report (test reports in a separate box) | [`src/pages/Archive.tsx`](src/pages/Archive.tsx) |
| `/sections`, `/sections/<id>` | the sections and their criteria | [`src/pages/Sections.tsx`](src/pages/Sections.tsx) |
| `/contributors/<github>` | one person's reports | [`src/pages/Contributor.tsx`](src/pages/Contributor.tsx) |
| `/about` | the purpose, the process and the verifiers of each project | [`src/pages/About.tsx`](src/pages/About.tsx) |
| `/submit` | the submission form (Part 1) | [`src/pages/Submit.tsx`](src/pages/Submit.tsx) |
| `/verify` | check a report (below) | [`src/pages/Verify.tsx`](src/pages/Verify.tsx) |
| `/status` | the results of the setup check (Part 5) | [`src/pages/Status.tsx`](src/pages/Status.tsx) |

Most of the text on the site is in [`content/`](content/), as Markdown, one 
file each. Each file says where on the site it appears. Values such as the 
site's name are filled in from [`config/`](config/) by `{placeholders}`. 
[`content/README.md`](content/README.md) lists them. The diagram of the 
process and the approval rules on the About page are generated from the code, 
so they always match what it does. 

**Verifying a report**

Anyone can check that a report is genuine on the `/verify` page, by pasting 
the report, a link to it, or its badge image. The check confirms that the 
report: 
- was signed by a key that is published in the DID document (Part 5); 
- has not been changed since, not even by one character; 
- is in date; 
- has not been revoked (below). 

The first three are the standard Open Badges 3.0 checks, so any other Open 
Badges verifier can repeat them. A report can also be checked from the command 
line with `npm run verify`. 
- code for verification: [`src/lib/verify.ts`](src/lib/verify.ts), [`scripts/verify.ts`](scripts/verify.ts)

**Revoking a report**

A signed report is never edited. To withdraw one, add 
`{ "id": "<credential id>", "reason": "…", "date": "YYYY-MM-DD" }` to 
[`config/revocations.json`](config/revocations.json). The site then marks it 
"Revoked", and verifiers reject it. 

**Standards and testing**

Reports are [Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/) 
credentials (W3C Verifiable Credentials 2.0), signed with an Ed25519 key 
using the `eddsa-rdfc-2022` cryptosuite. The JSON-LD contexts are kept in 
[`src/lib/contexts/`](src/lib/contexts/), so signing and verifying never fetch 
anything over the network. The tests in [`test/`](test/) check that: 
- the signing reproduces the official W3C test vector byte for byte; 
- signatures work in both directions with Digital Bazaar's reference 
  implementation; 
- reports pass 1EdTech's official Open Badges 3.0 JSON schema; 
- verification rejects changed reports, unknown keys, the wrong issuer, 
  revoked reports and reports that are not yet valid; 
- the approval rules reject people who are not verifiers of the project, 
  conflicts of interest and 
  withdrawn approvals; 
- badge images with a report inside them round-trip. 

Reports leave out the `credentialSchema` field: its type is not defined in 
any JSON-LD context, so strict verifiers would reject them. 

### Part 5: Hosting

**Where the site lives**

The code and every record live in this GitHub repository. The site is hosted 
on GitHub Pages, at the `siteUrl` in [`config/site.json`](config/site.json) 
(currently https://formalcontributions.com). The same file holds the 
repository, the issuer's name and description, the DNS name and the number 
of approvals required. 

**The keys**

There are two secret keys. Both are stored only as secrets of the protected 
`signing` environment in the GitHub settings, which only workflows on `main` 
can use. 

| Secret | What it does |
| --- | --- |
| `OB_SIGNING_KEY` | signs the reports (Part 3) |
| `SIGNING_DEPLOY_KEY` | lets the workflows commit accepted submissions and signed reports to `main`, which otherwise changes only through reviewed pull requests |

The public half of the signing key is listed in 
[`config/keys.json`](config/keys.json), with its status (`active`, `retired` 
or `revoked`). 

**Keys, DID and DNS**

The public key is published in two places, so anyone can check a report 
against it: 
- the site's DID document, at `/did.json` and `/.well-known/did.json`. The 
  issuer's identity, `did:web:<site host>`, comes from `siteUrl`. The 
  document lists every key in `config/keys.json` except revoked ones, so 
  reports signed with a retired key still verify. 
- a DNS TXT record at `_openbadges.formalcontributions.com`, which ties the 
  key to the domain independently of where the site is hosted. This is a 
  convention of this site, not part of Open Badges: 

```
_openbadges.formalcontributions.com.  TXT  "v=OB3; did=<issuer DID>; key=<publicKeyMultibase>"
```

**Replacing the signing key** (for example when moving to a new domain):

1. If the domain changes, set `siteUrl` (and `basePath` to `/`), set the 
   custom domain in the Pages settings, and point the domain at 
   `<owner>.github.io` with a CNAME record. The DID becomes 
   `did:web:<new host>`. 
2. Run `npm run keygen -- --status active`. This marks the current key as 
   retired and prints the exact TXT record to add. 
3. Store the new `.keys/key-N.json` as `OB_SIGNING_KEY` in the `signing` 
   environment, then commit `config/keys.json`. 
4. Replace the TXT record in the DNS zone with the new one. 
5. Run the *Sign and deploy* workflow by hand with *Re-sign every report* 
   ticked. Each report is signed again with its content unchanged; only the 
   issuer and the links under the old address are updated. 

**If a key is compromised**, set its status to `revoked` in 
`config/keys.json` (it disappears from the DID document, so nothing it signed 
verifies any more), generate a new key, and re-sign as above. 

**Setting up the repository**

The site is live. These steps record how the repository is set up, so the 
settings can be checked or repeated for a fresh copy: 

1. **Create the GitHub repository** given in `config/site.json` (currently 
   `jstoobysmith/formal-contributions`) and push this code. If you use a 
   different owner or name, also update `siteUrl` and `basePath`. 
2. **Enable Pages:** Settings → Pages → Source: *GitHub Actions*. 
3. **Create the `signing` environment** (Settings → Environments), restrict 
   it to the `main` branch, and store the signing key there as 
   `OB_SIGNING_KEY`: the secret half of the `active` key in 
   `config/keys.json`. For a fresh copy, generate one with 
   `npm run keygen -- --status active` and store it: 
   ```bash
   gh secret set OB_SIGNING_KEY --env signing --repo jstoobysmith/formal-contributions < .keys/key-N.json
   rm .keys/key-N.json   # once the secret is stored
   ```
   Then add the DNS TXT record that `keygen` prints. 
4. **Protect `main`** with a ruleset: require pull requests with review from 
   code owners ([`.github/CODEOWNERS`](.github/CODEOWNERS) covers everything 
   that runs with the key or is signed with it), dismiss stale approvals, and 
   require approval of the most recent push. Add a write **deploy key**, 
   store it as `SIGNING_DEPLOY_KEY` in the `signing` environment, and let 
   deploy keys bypass the ruleset. (On a personal account, GitHub does not 
   allow the GitHub Actions app itself to bypass it.) 
5. **List the projects and their verifiers** in `config/projects.json`. 
6. **Push to `main`.** The workflow signs the sample report and deploys the 
   site. Without the signing key, accepted submissions stay unsigned 
   ("awaiting signature") but the site still deploys. 
7. **Run the setup check** (below) and fix anything it reports. 

**Before launch**

- List at least two verifiers for each project in `config/projects.json`, so 
  the conflict rules can always be followed, and confirm the appointment text 
  in `config/site.json` (`review.appointment`). 
- Make the repository public. 

**Checking the set-up**

The *Setup check* workflow tests everything the site depends on, without 
changing, signing or publishing anything. Run it by hand from the Actions tab 
after changing settings, keys, projects or verifiers. 
- workflow: [`.github/workflows/setup-check.yml`](.github/workflows/setup-check.yml)
- code for the checks: [`scripts/setup-check/`](scripts/setup-check/), one file per part (check 4.2 is the second check in `4-github-settings.ts`)

| Part | Checks |
| --- | --- |
| 1. Tests and build | the unit tests and the site build |
| 2. Configuration | `config/` and `CODEOWNERS`: site address, sections, projects and verifiers, approval rules, beta label, page text |
| 3. Signing keys | `config/keys.json`; that `OB_SIGNING_KEY` matches the active key and signs; the DNS record |
| 4. GitHub settings | Pages; the `signing` environment; the rules on `main`; that `SIGNING_DEPLOY_KEY` can push (without pushing anything); the workflows; the last *Sign and deploy* run |
| 5. Submissions and signed reports | every submission is valid; why any accepted submission is unsigned; every report verifies; report numbers; revocations; the sample report |
| 6. Dry run of a submission | a made-up submission through every step: the form's checks, the summary, the approval rules, signing with the real key, verification, and spotting a changed report |
| 7. Live site | the published DID document matches the signing key; the published reports verify online |

Each check passes (✓), warns (!), fails (✗) or is skipped (–), and every 
warning and failure says how to fix it. The results are on the run's summary 
page, and are also published on the site's `/status` page a few minutes 
later. Nothing secret is ever shown. 

## Working on the code

```bash
npm install
npm run dev          # local site at http://localhost:5173/
npm test             # unit tests
npm run build        # static site in dist/

npm run validate                                          # check every submission
npm run sign -- --key .keys/key-N.json --no-review-check  # sign locally, for testing only
npm run verify -- public/specimen.json --local            # check any report (file or URL)
npm run keygen                                            # new signing key (Part 5)
npm run setup-check                                       # the setup check, without the secrets
npm run setup-check -- --json public/data/status.json     # also preview the results on /status
python3 scripts/draw-badges.py                            # redraw the section badges
```

Locally, the setup check skips the checks that need the secrets. Add 
`-- --key .keys/key-N.json` to include a local signing key, and 
`GITHUB_TOKEN=$(gh auth token)` in front to read the GitHub settings. 

| Path | Contents |
| --- | --- |
| [`config/`](config/) | the settings (edited by hand, except `keys.json`) |
| [`content/`](content/) | the text on the site |
| [`src/lib/`](src/lib/) | code shared by the site and the scripts: settings, submission format, reports, signing, verification, approval rules |
| [`src/site/`](src/site/) | code that only runs in the browser: loading data, talking to GitHub, the draft |
| [`src/pages/`](src/pages/), [`src/components/`](src/components/) | the website |
| [`scripts/`](scripts/) | signing, checking, verifying, making keys, building the generated files |
| [`test/`](test/) | the tests, one file per module in `src/lib/` |

The design follows [myopenbadge](https://github.com/saiyam1814/myopenbadge): a 
static site, with GitHub as the only source of truth. Unlike myopenbadge, 
users submit their own work from their own GitHub account, and reports are 
signed, not merely hosted. 
