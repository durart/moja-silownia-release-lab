import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const repository = 'durart/moja-silownia-release-lab';
const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const id = /^[1-9][0-9]*$/;

export function verifyContext({ repo, ref, runSha, requestedSha, currentSha, mode }) {
  if (repo !== repository || ref !== 'refs/heads/main') throw new Error('Lab scope denied');
  if (!['publish','rollback'].includes(mode)) throw new Error('Unknown mode');
  if (![runSha, requestedSha, currentSha].every(v => sha.test(v ?? '')) ||
      runSha !== requestedSha || runSha !== currentSha) throw new Error('Stale or invalid SHA');
}

export function verifyPrior({ runId, sourceSha, expectedDigest, priorRun, priorJobs }) {
  if (!id.test(runId ?? '') || !sha.test(sourceSha ?? '') || !digest.test(expectedDigest ?? '') ||
      String(priorRun?.id) !== runId || priorRun?.head_sha !== sourceSha ||
      priorRun?.head_branch !== 'main' || priorRun?.event !== 'workflow_dispatch' ||
      priorRun?.path !== '.github/workflows/lab-release.yml' ||
      priorRun?.conclusion !== 'success' || priorRun?.head_repository?.full_name !== repository ||
      !Array.isArray(priorJobs) || !priorJobs.some(job => job.name === 'deploy' && job.status === 'completed' && job.conclusion === 'success')) {
    throw new Error('Prior release evidence rejected');
  }
}

export async function siteDigest(root) {
  const dir = await lstat(root);
  if (!dir.isDirectory() || dir.isSymbolicLink()) throw new Error('Invalid site root');
  const names = await readdir(root);
  if (names.length !== 1 || names[0] !== 'index.html') throw new Error('Unexpected artifact paths');
  const file = join(root,'index.html');
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Unsupported file');
  const data = await readFile(file);
  if (!data.includes(Buffer.from('SYNTHETIC VERSION '))) throw new Error('Non-synthetic site');
  return createHash('sha256').update(data).digest('hex');
}

export async function verifyArtifact(root, expected) {
  if (!digest.test(expected ?? '') || await siteDigest(root) !== expected) throw new Error('Artifact digest mismatch');
  return expected;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, root, expected] = process.argv.slice(2);
  if (command === 'digest') console.log(await siteDigest(root));
  else if (command === 'verify') console.log(await verifyArtifact(root,expected));
  else throw new Error('Expected digest or verify');
}
