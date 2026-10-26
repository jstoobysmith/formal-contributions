import { useState } from 'react';
import { EVIDENCE_KINDS, type EvidenceKind } from '../lib/config';
import { canonicalUrl, parsePullRequestList, pullRequestUrl } from '../lib/submission';
import { buttonClass, inputClass } from './ui';

/**
 * Adds many pull requests to the evidence at once: the contributor pastes
 * numbers or links, separated by commas, and each becomes an evidence link.
 * Their titles are added by the workflows, not looked up here.
 */
export function ImportPullRequests({
  repo,
  kind,
  existingUrls,
  onAdd,
}: {
  /** The repository the pull requests are in ("owner/name"): the primary project's. */
  repo: string;
  /** The kind given to imported links (the section's usual one: "Pull request review" in Review). */
  kind: EvidenceKind;
  existingUrls: string[];
  onAdd: (urls: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string>();

  const prUrl = (n: number) => pullRequestUrl(repo, n);
  const add = () => {
    const { numbers, invalid } = parsePullRequestList(text, repo);
    const listed = new Set(existingUrls.map(canonicalUrl));
    const fresh = numbers.filter((n) => !listed.has(canonicalUrl(prUrl(n))));
    const already = numbers.filter((n) => !fresh.includes(n));
    setMessage(
      [
        fresh.length ? `Added ${fresh.length} pull request${fresh.length === 1 ? '' : 's'}.` : 'Nothing new to add.',
        already.length ? `Already listed: ${already.map((n) => `#${n}`).join(', ')}.` : '',
        invalid.length ? `Not recognised: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? ', …' : ''} (use numbers, or links to ${repo} pull requests).` : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    if (!fresh.length) return;
    onAdd(fresh.map(prUrl));
    setText(invalid.join(', '));
  };

  return (
    <div className="mb-4 border border-rule bg-shade px-3 py-2 text-sm">
      <label htmlFor="import-prs" className="font-bold">
        Import pull requests
      </label>
      <p className="text-xs text-muted">
        Numbers or links of pull requests to {repo}, separated by commas, e.g. <span className="font-mono">412, 418, #430</span>.
        Each is added below as a “{EVIDENCE_KINDS[kind]}”. Their titles are added automatically.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          id="import-prs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="412, 418, #430"
          className={inputClass}
        />
        <button type="button" onClick={add} disabled={!text.trim()} className={`${buttonClass()} shrink-0`}>
          Add
        </button>
      </div>
      {message && (
        <p className="mt-1 text-xs" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
