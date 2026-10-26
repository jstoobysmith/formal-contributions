import { describe, expect, it } from 'vitest';
import { DEFAULT_PROJECT, PROJECTS } from '../src/lib/config';
import { approvalDecision, type PullRequestReview } from '../src/lib/review';

const m = DEFAULT_PROJECT.verifiers[0];
const verifier = m.github;
const HEAD = 'head-sha';
const review = (login: string, state: string, at: string, body = 'Looks good. I have no conflict of interest.', commit_id = HEAD, id = m.id): PullRequestReview => ({
  user: { login, id },
  state,
  body,
  commit_id,
  submitted_at: at,
});
const submission = { recipient: { github: 'alice', name: 'Alice' } };
const pr = (extra: Partial<{ author: string; mergedBy: string }> = {}) => ({ author: 'alice', headSha: HEAD, ...extra });

describe('approval rules', () => {
  it('accepts an approval from a verifier who is not involved', () => {
    expect(approvalDecision([review(verifier, 'APPROVED', '1')], pr({ mergedBy: verifier }), submission, 1)).toEqual({ ok: true, approvers: [verifier] });
  });

  it('ignores approvals from non-verifiers, and from a verifier login now used by another account', () => {
    expect(approvalDecision([review('sock-puppet', 'APPROVED', '1')], pr(), submission, 1).ok).toBe(false);
    if (m.id !== undefined) {
      expect(approvalDecision([review(verifier, 'APPROVED', '1', undefined, HEAD, m.id + 1)], pr(), submission, 1).ok).toBe(false);
    }
  });

  it('ignores approvals given on an earlier commit', () => {
    expect(approvalDecision([review(verifier, 'APPROVED', '1', undefined, 'older-sha')], pr(), submission, 1).ok).toBe(false);
  });

  it('requires the pull request to be opened by the contributor', () => {
    const d = approvalDecision([review(verifier, 'APPROVED', '1')], pr({ author: 'mallory' }), submission, 1);
    expect(d.ok).toBe(false);
    expect(approvalDecision([review(verifier, 'APPROVED', '1')], pr({ author: 'alice' }), submission, 1).ok).toBe(true);
  });

  it('ignores approvals from the recipient or people named as joint work', () => {
    const self = { recipient: { github: verifier, name: 'M' } };
    expect(approvalDecision([review(verifier, 'APPROVED', '1')], pr({ author: verifier }), self, 1).ok).toBe(false);
    const joint = { ...submission, collaborators: [{ github: verifier, name: 'M' }] };
    expect(approvalDecision([review(verifier, 'APPROVED', '1')], pr(), joint, 1).ok).toBe(false);
  });

  it('requires approvers to declare no conflict of interest', () => {
    const d = approvalDecision([review(verifier, 'APPROVED', '1', 'LGTM')], pr(), submission, 1);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toContain('without the declaration');
  });

  it('uses only the latest review of each person', () => {
    const withdrawn = [review(verifier, 'APPROVED', '2026-01-01'), review(verifier, 'CHANGES_REQUESTED', '2026-01-02')];
    expect(approvalDecision(withdrawn, pr(), submission, 1).ok).toBe(false);
    const comment = [review(verifier, 'APPROVED', '2026-01-01'), review(verifier, 'COMMENTED', '2026-01-02')];
    expect(approvalDecision(comment, pr(), submission, 1).ok).toBe(true);
  });

  it('does not let anyone the report credits merge it', () => {
    expect(approvalDecision([review(verifier, 'APPROVED', '1')], pr({ mergedBy: 'alice' }), submission, 1).ok).toBe(false);
  });

  it('signs test submissions without approvals, whoever opened or merged them', () => {
    const test = { ...submission, section: 'test' };
    expect(approvalDecision([], pr({ author: 'someone-else', mergedBy: 'alice' }), test, 1)).toEqual({ ok: true, approvers: [] });
    // Approvals that would count for a real report are still recorded.
    expect(approvalDecision([review(verifier, 'APPROVED', '1')], pr(), test, 1)).toEqual({ ok: true, approvers: [verifier] });
    // Real sections keep every rule.
    expect(approvalDecision([], pr(), { ...submission, section: 'review' }, 1).ok).toBe(false);
  });

  it('counts only verifiers of the primary project', () => {
    // A project this verifier does not verify for (if there is one).
    const other = PROJECTS.find((p) => !p.verifiers.some((v) => v.github.toLowerCase() === verifier.toLowerCase()));
    if (!other) return;
    const approval = [review(verifier, 'APPROVED', '1')];
    expect(approvalDecision(approval, pr(), { ...submission, projects: [other.id] }, 1)).toMatchObject({ ok: false, reason: expect.stringContaining(`verifiers of ${other.name}`) });
    // As a secondary project, it does not change who may accept.
    expect(approvalDecision(approval, pr(), { ...submission, projects: [DEFAULT_PROJECT.id, other.id] }, 1).ok).toBe(true);
    // A submission that names no project belongs to the default project.
    expect(approvalDecision(approval, pr(), submission, 1).ok).toBe(true);
  });
});
