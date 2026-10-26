/**
 * The summary of a submission that verifiers review: shown on its pull
 * request (scripts/validate-submissions.ts) or its issue
 * (scripts/issue-submission.ts). It lists the submission, warnings about its
 * evidence, and the contributor's previous reports. Text from the submission
 * is escaped, as it comes from whoever submitted it.
 */
import { isTestSection, primaryProjectOf, PROJECTS } from '../../src/lib/config';
import { evidenceOf, recipientOf, sectionIdOf, titleOf } from '../../src/lib/credential';
import { ACCEPT_COMMAND } from '../../src/lib/issue-submission';
import { CONFLICT_DECLARATION } from '../../src/lib/review';
import { canonicalUrl, md, submissionMarkdown, type PullRequestPeople, type Submission } from '../../src/lib/submission';
import { listCredentials, listSubmissionFiles, loadSubmission, readReportNumbers } from './files';
import { lookUpEvidenceTitles, lookUpPullRequestPeople } from './evidence-titles';
import { untitledGitHubEvidence, withEvidenceTitles } from '../../src/lib/evidence-titles';

/** Links to the projects' repositories and Zulip channels are expected; anything else is pointed out. */
const TRUSTED = [...new Set(PROJECTS.flatMap((p) => [`https://github.com/${p.repository}/`, ...(p.zulip ? [new URL(p.zulip).origin + '/'] : [])]))];

export type Venue = 'pull request' | 'issue';

/** What is already published or accepted, to spot evidence claimed twice and list previous reports. */
export function summaryContext() {
  const numbers = readReportNumbers();
  const signed = listCredentials();
  // Evidence link -> where it is already used. Test reports use placeholder evidence, so they are left out.
  const usedIn = new Map<string, { slug: string; label: string }[]>();
  const note = (url: string, slug: string, label: string) => usedIn.set(canonicalUrl(url), [...(usedIn.get(canonicalUrl(url)) ?? []), { slug, label }]);
  for (const { slug, credential } of signed) {
    if (isTestSection(sectionIdOf(credential))) continue;
    for (const e of evidenceOf(credential).work) if (e.id) note(e.id, slug, `report no. ${numbers[slug] ?? '?'} (${titleOf(credential)})`);
  }
  for (const f of listSubmissionFiles()) {
    const s = loadSubmission(f);
    if (!s.submission || isTestSection(s.submission.section) || signed.some((c) => c.slug === s.slug)) continue;
    for (const e of s.submission.evidence) note(e.url, s.slug, `the accepted submission ${s.file}`);
  }
  return { numbers, signed, usedIn };
}

export type SummaryContext = ReturnType<typeof summaryContext>;

/** Warnings about a submission's evidence (links outside the projects, links already used). */
export function evidenceWarnings(ctx: SummaryContext, submission: Submission, ownSlug?: string): string[] {
  const warnings: string[] = [];
  for (const e of submission.evidence) {
    if (!TRUSTED.some((t) => e.url.startsWith(t))) warnings.push(`Evidence outside the projects' GitHub and Zulip; check it by hand: <${e.url}>`);
    if (isTestSection(submission.section)) continue;
    const elsewhere = (ctx.usedIn.get(canonicalUrl(e.url)) ?? []).filter((w) => w.slug !== ownSlug);
    if (elsewhere.length) warnings.push(`<${e.url}> is already evidence for ${elsewhere.map((w) => md(w.label)).join('; ')}`);
  }
  return warnings;
}

/** The summary of one submission, as Markdown lines. */
export function submissionSummary(
  ctx: SummaryContext,
  {
    heading,
    submission,
    errors,
    warnings,
    venue,
    titles = new Map(),
    people = new Map(),
  }: {
    heading: string;
    submission?: Submission;
    errors: string[];
    warnings: string[];
    venue: Venue;
    titles?: Map<string, string>;
    people?: Map<string, PullRequestPeople>;
  },
): string[] {
  const out = [`### ${errors.length ? '❌' : '✅'} ${heading}`, ''];
  // Errors can echo text from the submission, so they are escaped like everything else.
  const line = (t: string) => md(t.replace(/\s+/g, ' '));
  errors.forEach((e) => out.push(`- **Error:** ${line(e)}`));
  warnings.forEach((w) => out.push(`- **Check:** ${w}`));
  if (submission) {
    if (isTestSection(submission.section)) {
      out.push(
        '',
        venue === 'issue'
          ? `**Test submission.** No approvals are needed: when a verifier of ${md(primaryProjectOf(submission).name)} comments \`${ACCEPT_COMMAND}\`, it is signed as a test report that is not numbered or listed.`
          : '**Test submission.** No approvals are needed: merging this pull request is enough for it to be signed, as a test report that is not numbered or listed.',
      );
    }
    const previous = ctx.signed.filter(({ credential }) => recipientOf(credential).github?.toLowerCase() === submission.recipient.github.toLowerCase());
    out.push(
      '',
      submissionMarkdown(withEvidenceTitles(submission, titles), people),
      '',
      whoCanAccept(submission),
      '',
      previous.length
        ? `**Previous reports to @${submission.recipient.github}:** ${previous.map(({ slug, credential }) => `no. ${ctx.numbers[slug] ?? '?'} ${md(titleOf(credential))}`).join('; ')}`
        : `**Previous reports to @${submission.recipient.github}:** none`,
      '',
    );
  }
  return out;
}

/**
 * What the workflows find out about the submission's GitHub evidence: titles
 * (as its report will show them), who opened and who reviewed each pull
 * request, and warnings for links that do not exist.
 */
export async function evidenceDetails(
  submission: Submission,
): Promise<{ titles: Map<string, string>; people: Map<string, PullRequestPeople>; warnings: string[] }> {
  const { titles, missing } = await lookUpEvidenceTitles(untitledGitHubEvidence(submission.evidence));
  const people = await lookUpPullRequestPeople(submission.evidence.map((e) => e.url).filter((url) => !missing.includes(url)));
  return { titles, people, warnings: missing.map((url) => `<${url}> does not exist on GitHub; check the link.`) };
}

/**
 * Who may accept a submission: the verifiers of its primary project. Their
 * "@" is escaped, so they are not notified each time the summary is posted.
 */
export function whoCanAccept(submission: Submission): string {
  const project = primaryProjectOf(submission);
  return project.verifiers.length
    ? `**Who can accept it:** the verifiers of ${md(project.name)}: ${project.verifiers.map((v) => `${md(v.name)} (${md(`@${v.github}`)})`).join(', ')}.`
    : `**Who can accept it:** ${md(project.name)} has no verifiers yet, so this submission cannot be accepted until one is listed in \`config/projects.json\`.`;
}

/** What verifiers do next, at the end of the summary. */
export function verifierNote(venue: Venue): string {
  const approve =
    venue === 'issue'
      ? `To approve, comment \`${ACCEPT_COMMAND} I have ${CONFLICT_DECLARATION}\`. When enough verifiers have, the submission is accepted and signed automatically.`
      : `To approve, submit an *Approve* review whose text includes “${CONFLICT_DECLARATION}”, then merge.`;
  return (
    `**For verifiers.** Only verifiers of the submission's primary project can accept it. Check each criterion against the evidence. ${approve} ` +
    `Approvals from anyone credited by the submission or whoever opened this ${venue} do not count. ` +
    'You may ask for changes, or close a submission that does not clearly meet the criteria.'
  );
}
