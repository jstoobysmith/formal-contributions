/**
 * Part 2: the hand-edited files in config/ (site, sections, projects and
 * their verifiers, revocations) and .github/CODEOWNERS.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_SECTIONS, DEFAULT_PROJECT, EVIDENCE_KINDS, ISSUER_DID, PROJECTS, SECTION_IDS, SITE, SITE_URL, VERIFIERS, type Revocation } from '../../src/lib/config';
import { CONTENT_FILES, missingHeader, unknownPlaceholders } from '../../src/lib/content';
import { readJson, ROOT } from '../lib/files';
import { definePart, fail, listing, pass, plural, skip, warn } from './checks';
import { github, IN_ACTIONS, REPO } from './context';

export default definePart({
  number: 2,
  title: 'Configuration',
  covers: 'The settings in config/, the page text in content/ and the code owners in .github/CODEOWNERS.',
  file: import.meta.url,
  async run(check) {
    await check('2.1', 'Site address', () => {
      const url = new URL(SITE.siteUrl);
      if (url.protocol !== 'https:') return fail(`siteUrl (${SITE.siteUrl}) must start with https://.`, 'Fix siteUrl in config/site.json.');
      const expectedBase = url.pathname.replace(/\/?$/, '/');
      if (SITE.basePath !== expectedBase) {
        return fail(`basePath is "${SITE.basePath}", but siteUrl's path is "${expectedBase}".`, `Set basePath to "${expectedBase}" in config/site.json.`);
      }
      return pass(`${SITE_URL}, so the issuer is ${ISSUER_DID}.`);
    });

    await check('2.2', 'Repository', () => {
      const configured = `${SITE.repository.owner}/${SITE.repository.name}`;
      let actual: string | undefined = IN_ACTIONS ? REPO : undefined;
      if (!actual) {
        try {
          const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, encoding: 'utf8' }).trim();
          actual = remote.match(/github\.com[:/](.+?)(\.git)?$/)?.[1];
        } catch {
          /* no git remote */
        }
      }
      if (!actual) return skip(`config/site.json names ${configured}; there is no GitHub remote to compare it with.`);
      return actual.toLowerCase() === configured.toLowerCase()
        ? pass(`config/site.json names ${configured}, the repository this runs in.`)
        : fail(`config/site.json names ${configured}, but this is ${actual}.`, 'Set repository.owner and repository.name in config/site.json (and siteUrl, basePath).');
    });

    await check('2.3', 'Sections', () => {
      const ids = ALL_SECTIONS.map((s) => s.id);
      const problems: string[] = [];
      if (ids.join() !== SECTION_IDS.join()) problems.push(`the sections are ${ids.join(', ')}; the code expects ${SECTION_IDS.join(', ')}`);
      if (ALL_SECTIONS.filter((s) => s.test).length !== 1) problems.push('there must be exactly one test section');
      for (const s of ALL_SECTIONS) {
        if (!s.name || !s.reportName || !s.criteria?.length) problems.push(`${s.id} needs a name, reportName and criteria`);
        if (!s.test && !s.examples?.length) problems.push(`${s.id} has no examples`);
        const unknown = (s.evidenceKinds ?? []).filter((k) => !(k in EVIDENCE_KINDS));
        if (unknown.length) problems.push(`${s.id} has unknown evidence kinds (${unknown.join(', ')})`);
        if (!existsSync(join(ROOT, 'public', 'badges', `${s.id}.svg`))) problems.push(`public/badges/${s.id}.svg is missing`);
      }
      return problems.length
        ? fail(`config/sections.json: ${problems.join('; ')}.`, 'Fix config/sections.json (and redraw badges with python3 scripts/draw-badges.py).')
        : pass(`${ALL_SECTIONS.map((s) => `${s.numeral}. ${s.name}`).join(', ')}; each has criteria, examples and a badge.`);
    });

    await check('2.4', 'Projects and verifiers', () => {
      const required = SITE.review.requiredApprovals;
      const problems: string[] = [];
      const ids = PROJECTS.map((p) => p.id);
      if (!PROJECTS.length) problems.push('config/projects.json lists no projects');
      if (new Set(ids).size !== ids.length) problems.push('two projects have the same id');
      for (const p of PROJECTS) {
        if (!/^[a-z0-9-]+$/.test(p.id)) problems.push(`the id "${p.id}" may only use a-z, 0-9 and -`);
        if (!p.name || !p.description || !p.url || !/^[\w.-]+\/[\w.-]+$/.test(p.repository ?? '')) problems.push(`${p.id} needs a name, description, url and repository ("owner/name")`);
      }
      if (SITE.defaultProject !== DEFAULT_PROJECT.id) problems.push(`defaultProject in config/site.json is "${SITE.defaultProject}", which is not a project`);
      if (problems.length) return fail(`${problems.join('; ')}.`, 'Fix config/projects.json (README: Part 1, Project).');
      const acceptable = PROJECTS.filter((p) => p.verifiers.length >= required);
      if (!acceptable.length) {
        return fail(
          `No project has ${required} verifier(s), so no submission can be accepted.`,
          'Add verifiers to config/projects.json, or lower review.requiredApprovals in config/site.json.',
        );
      }
      const notes: string[] = [];
      const short = PROJECTS.filter((p) => p.verifiers.length < required);
      if (short.length) notes.push(`${listing(short.map((p) => p.name))} ha${short.length === 1 ? 's' : 've'} fewer than ${required} verifier(s), so submissions for ${short.length === 1 ? 'it' : 'them'} cannot be accepted`);
      const thin = acceptable.filter((p) => p.verifiers.length < required + 1);
      if (thin.length) notes.push(`in ${listing(thin.map((p) => p.name))}, reports on a verifier’s own work can never get ${required} independent approval(s)`);
      const noId = VERIFIERS.filter((v) => v.id === undefined).map((v) => v.github);
      if (noId.length) notes.push(`${listing(noId)} ha${noId.length === 1 ? 's' : 've'} no numeric GitHub id`);
      const each = PROJECTS.map((p) => `${p.name}: ${p.verifiers.length ? listing(p.verifiers.map((v) => `@${v.github}`)) : 'none'}`).join('; ');
      return notes.length
        ? warn(
            `${each}. ${notes.join('; ').replace(/^./, (c) => c.toUpperCase())}.`,
            `List at least ${required + 1} verifiers for each project in config/projects.json before launch, each with "id" (from https://api.github.com/users/<login>) (README: Before launch).`,
          )
        : pass(`${each}; ${plural(required, 'approval')} needed per report.`);
    });

    await check('2.5', 'Verifier accounts', async () => {
      const problems: string[] = [];
      for (const m of VERIFIERS) {
        const { status, data } = await github<{ id: number; login: string }>(`/users/${encodeURIComponent(m.github)}`);
        if (status === 404) problems.push(`@${m.github} does not exist on GitHub`);
        else if (!data) return skip(`Could not reach the GitHub API (HTTP ${status}).`);
        else if (m.id !== undefined && data.id !== m.id) problems.push(`@${m.github} has id ${data.id}, not ${m.id} as listed`);
      }
      return problems.length
        ? fail(`${problems.join('; ')}.`, 'Correct config/projects.json.')
        : pass(`Every listed verifier is a GitHub account${VERIFIERS.some((m) => m.id !== undefined) ? ' with the listed id' : ''}.`);
    });

    await check('2.6', 'Code owners', () => {
      const path = join(ROOT, '.github', 'CODEOWNERS');
      if (!existsSync(path)) return fail('.github/CODEOWNERS is missing, so changes to the signing code need no review from its owners.', 'Restore .github/CODEOWNERS.');
      const rules = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
      const covered = rules.map((l) => l.trim().split(/\s+/)[0]);
      const needed = ['/.github/', '/scripts/', '/src/lib/', '/config/'].filter((p) => !covered.includes(p));
      if (needed.length) return fail(`CODEOWNERS does not cover ${listing(needed)}.`, 'Add those paths to .github/CODEOWNERS.');
      const owners = [...new Set(rules.flatMap((l) => l.trim().split(/\s+/).slice(1)).map((o) => o.replace(/^@/, '')))];
      const notVerifiers = owners.filter((o) => !o.includes('/') && !VERIFIERS.some((m) => m.github.toLowerCase() === o.toLowerCase()));
      return notVerifiers.length
        ? warn(`Code owners who are not verifiers of any project: ${listing(notVerifiers)}.`, 'Make the code owners and the verifiers in config/projects.json agree.')
        : pass(`The signing code and configuration are owned by ${listing(owners.map((o) => `@${o}`))}.`);
    });

    await check('2.7', 'Approval rules', () => {
      const { requiredApprovals, conflictDeclaration } = SITE.review;
      if (!Number.isInteger(requiredApprovals) || requiredApprovals < 1) return fail(`review.requiredApprovals is ${requiredApprovals}; it must be 1 or more.`, 'Fix config/site.json.');
      if (!conflictDeclaration.trim()) return fail('review.conflictDeclaration is empty.', 'Set it in config/site.json, e.g. "no conflict of interest".');
      return pass(`${plural(requiredApprovals, 'approval')} per report, each saying “${conflictDeclaration}”.`);
    });

    await check('2.8', 'Revocation list', () => {
      const list = readJson<Revocation[]>(join(ROOT, 'config', 'revocations.json'));
      if (!Array.isArray(list) || list.some((r) => typeof r.id !== 'string')) {
        return fail('config/revocations.json must be a list of { "id": "<credential id>", ... }.', 'Fix config/revocations.json (README: Revoking a report).');
      }
      return pass(list.length ? `${plural(list.length, 'report')} revoked.` : 'No reports revoked.');
    });

    await check('2.9', 'Beta label', () =>
      pass(
        SITE.beta
          ? 'The site is marked as beta (a tag beside its name, and a line in the footer). Remove "beta" from config/site.json when that is no longer needed.'
          : 'The site is not marked as beta.',
      ),
    );

    await check('2.10', 'Page text', () => {
      const problems: string[] = [];
      for (const f of CONTENT_FILES) {
        const path = join(ROOT, 'content', `${f}.md`);
        if (!existsSync(path)) problems.push(`content/${f}.md is missing`);
        else {
          const text = readFileSync(path, 'utf8');
          const unknown = unknownPlaceholders(f, text);
          if (unknown.length) problems.push(`content/${f}.md uses unknown placeholders ${unknown.map((u) => `{${u}}`).join(', ')}`);
          const missing = missingHeader(text);
          if (missing.length) problems.push(`content/${f}.md has no ${missing.join(' or ')} in its header`);
        }
      }
      return problems.length
        ? fail(`${problems.join('; ')}.`, 'Fix the file (content/README.md lists the placeholders).')
        : pass(`${plural(CONTENT_FILES.length, 'text file')} in content/, all present, each saying where it appears and what it is for, with known placeholders.`);
    });
  },
});
