import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEvidenceList,
  resolveEvidencePath,
  hasCompatibleEvidenceForVerifiedPass,
  unverifiedPassReason,
} from '../lib/eval/index.mjs';
import {
  tempDir,
  writeTree,
  symlinkSync,
  join,
  rmSync,
} from './eval-helpers.mjs';

test('unknown evidence kinds are rejected', () => {
  const root = tempDir();
  writeTree(root, { 'e.txt': 'x' });
  const result = validateEvidenceList(
    [{ kind: 'telepathy', path: 'e.txt' }],
    root,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'EVIDENCE_KIND'));
  rmSync(root, { recursive: true, force: true });
});

test('missing evidence files are rejected', () => {
  const root = tempDir();
  writeTree(root, { 'keep.txt': 'x' });
  const result = validateEvidenceList(
    [{ kind: 'agent_report', path: 'missing.txt' }],
    root,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'EVIDENCE_MISSING'));
  rmSync(root, { recursive: true, force: true });
});

test('directory traversal via .. is rejected', () => {
  const root = tempDir();
  writeTree(root, { 'inside.txt': 'x' });
  const result = resolveEvidencePath('../inside.txt', root);
  // ../ from root escapes or fails containment
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'EVIDENCE_ESCAPE'));
  rmSync(root, { recursive: true, force: true });
});

test('absolute evidence paths are rejected', () => {
  const root = tempDir();
  writeTree(root, { 'inside.txt': 'x' });
  const result = resolveEvidencePath(join(root, 'inside.txt'), root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'EVIDENCE_ESCAPE'));
  rmSync(root, { recursive: true, force: true });
});

test('symlink escape outside evaluation root is rejected', () => {
  const outside = tempDir('eh-out-');
  writeTree(outside, { 'secret.txt': 'secret' });
  const root = tempDir('eh-in-');
  writeTree(root, { 'ok.txt': 'ok' });
  symlinkSync(join(outside, 'secret.txt'), join(root, 'link.txt'));
  const result = resolveEvidencePath('link.txt', root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'EVIDENCE_ESCAPE'));
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

test('valid relative evidence under root is accepted', () => {
  const root = tempDir();
  writeTree(root, { 'evidence/report.md': 'claim' });
  const result = validateEvidenceList(
    [{ kind: 'agent_report', path: 'evidence/report.md' }],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal(result.refs.length, 1);
  rmSync(root, { recursive: true, force: true });
});

test('trace pass cannot be verified from agent_report alone', () => {
  assert.equal(
    hasCompatibleEvidenceForVerifiedPass('trace', [{ kind: 'agent_report', path: 'a' }]),
    false,
  );
  assert.equal(
    hasCompatibleEvidenceForVerifiedPass('trace', [{ kind: 'tool_trace', path: 't' }]),
    true,
  );
  const reason = unverifiedPassReason('trace', [{ kind: 'agent_report', path: 'a' }]);
  assert.match(reason ?? '', /agent_report alone/);
});

test('git_diff pass cannot be verified from agent claim alone', () => {
  assert.equal(
    hasCompatibleEvidenceForVerifiedPass('git_diff', [
      { kind: 'agent_report', path: 'claim.md' },
    ]),
    false,
  );
  assert.equal(
    hasCompatibleEvidenceForVerifiedPass('git_diff', [{ kind: 'git_diff', path: 'd.diff' }]),
    true,
  );
});

test('command pass requires command_result evidence', () => {
  assert.equal(
    hasCompatibleEvidenceForVerifiedPass('command', [{ kind: 'file_snapshot', path: 'x' }]),
    false,
  );
  assert.equal(
    hasCompatibleEvidenceForVerifiedPass('command', [
      { kind: 'command_result', path: 'out.txt' },
    ]),
    true,
  );
});
