/**
 * Links that fill in the submission form, e.g.
 *
 *   /submit?section=review&name=Ada%20Example&github=ada&title=…&prs=412,418
 *
 * so someone can send a contributor a form that is ready to check and send.
 * Everything is read in the browser; nothing is sent anywhere by opening one.
 *
 *   section    a section id (review, maintenance, …)
 *   projects   project ids, primary first, separated by commas
 *   name       the contributor's full name
 *   github     their GitHub username ("@name" and profile links work too)
 *   orcid      their ORCID iD
 *   title, summary
 *   from, to   months, YYYY-MM
 *   prs        pull request numbers in the primary project's repository, separated by commas
 *   link       any other evidence link (may be repeated)
 */
import { DEFAULT_PROJECT, projectById, PROJECTS, SECTION_IDS, type SectionId } from './config';
import { githubLoginFromInput, parsePullRequestList, pullRequestUrl } from './submission';

/** The parameters a link can use, in the order they are written, as documented on the About page. */
export const PREFILL_PARAMETERS: { name: string; fills: string; example: string }[] = [
  { name: 'section', fills: 'The section, by its id: ' + SECTION_IDS.join(', ') + '.', example: 'review' },
  { name: 'projects', fills: 'The projects, by id, primary first, separated by commas: ' + PROJECTS.map((p) => p.id).join(', ') + '.', example: PROJECTS[0].id },
  { name: 'name', fills: 'The contributor’s full name.', example: 'Ada Example' },
  { name: 'github', fills: 'The contributor’s GitHub username.', example: 'ada-example' },
  { name: 'orcid', fills: 'The contributor’s ORCID iD.', example: '0000-0002-1825-0097' },
  { name: 'title', fills: 'The title of the report.', example: 'Reviewed 10 pull requests on quantum mechanics' },
  { name: 'summary', fills: 'The summary. %0A starts a new line.', example: 'Careful reviews of …' },
  { name: 'from, to', fills: 'The months the work covers, as YYYY-MM.', example: '2026-07' },
  { name: 'prs', fills: 'Pull requests to the primary project’s repository, by number, separated by commas. Their titles are added automatically.', example: '1351,1348,1328' },
  { name: 'link', fills: 'Any other evidence link, in full. Repeat it for several.', example: 'https://leanprover.zulipchat.com/…' },
];

export interface Prefill {
  section?: SectionId;
  /** Project ids, primary first. */
  projects?: string[];
  name?: string;
  github?: string;
  orcid?: string;
  title?: string;
  summary?: string;
  from?: string;
  to?: string;
  prs?: number[];
  links?: string[];
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;


/** The repository that pull requests given by number are in: the primary project's. */
export const pullRequestRepository = (projects?: string[]) => (projectById(projects?.[0] ?? '') ?? DEFAULT_PROJECT).repository;

/** The fields a link fills in, or undefined if it fills in none (a bare ?section= only chooses the section). */
export function readPrefill(params: URLSearchParams): Prefill | undefined {
  const text = (key: string) => params.get(key)?.trim() || undefined;
  const section = SECTION_IDS.find((id) => id === params.get('section'));
  const projects = [...new Set((params.get('projects') ?? '').split(',').map((p) => p.trim()))].filter((id) => projectById(id));
  const prs = parsePullRequestList(params.get('prs') ?? '', pullRequestRepository(projects)).numbers;
  const links = params.getAll('link').map((l) => l.trim()).filter((l) => /^https:\/\/\S+$/.test(l));
  const prefill: Prefill = {
    projects: projects.length ? projects : undefined,
    name: text('name'),
    github: text('github') && githubLoginFromInput(text('github')!),
    orcid: text('orcid'),
    title: text('title'),
    summary: params.get('summary')?.replace(/\r\n/g, '\n').trim() || undefined,
    from: MONTH.test(params.get('from') ?? '') ? params.get('from')! : undefined,
    to: MONTH.test(params.get('to') ?? '') ? params.get('to')! : undefined,
    prs: prs.length ? prs : undefined,
    links: links.length ? links : undefined,
  };
  const filled = Object.values(prefill).some((v) => v !== undefined);
  return filled ? { section, ...prefill } : undefined;
}

/** The query string of a link that fills in the form with these fields. */
export function prefillParams(p: Prefill): URLSearchParams {
  const params = new URLSearchParams();
  const put = (key: string, value?: string) => value?.trim() && params.set(key, value.trim());
  put('section', p.section);
  if (p.projects?.length) params.set('projects', p.projects.join(','));
  put('name', p.name);
  put('github', p.github);
  put('orcid', p.orcid);
  put('title', p.title);
  put('summary', p.summary);
  put('from', p.from);
  put('to', p.to);
  if (p.prs?.length) params.set('prs', p.prs.join(','));
  for (const l of p.links ?? []) params.append('link', l);
  return params;
}

/** Splits evidence links into pull request numbers in `repo` (written compactly as prs=) and other links. */
export function splitEvidenceLinks(urls: string[], repo: string = DEFAULT_PROJECT.repository): Pick<Prefill, 'prs' | 'links'> {
  const prs: number[] = [];
  const links: string[] = [];
  for (const url of urls.filter(Boolean)) {
    const n = parsePullRequestList(url, repo).numbers[0];
    if (n && pullRequestUrl(repo, n) === url.replace(/\/$/, '')) prs.push(n);
    else links.push(url);
  }
  return { prs: prs.length ? prs : undefined, links: links.length ? links : undefined };
}

