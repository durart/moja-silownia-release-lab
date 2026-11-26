import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyContext, verifyPrior, verifyArtifact, siteDigest, repository } from '../scripts/verify.mjs';
const a='a'.repeat(40), b='b'.repeat(40), d='d'.repeat(64);
const context=()=>({repo:repository,ref:'refs/heads/main',runSha:a,requestedSha:a,currentSha:a,mode:'publish'});
const prior=()=>({runId:'12',sourceSha:a,expectedDigest:d,priorJobs:[{name:'deploy',status:'completed',conclusion:'success'}],priorRun:{id:12,head_sha:a,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/lab-release.yml',conclusion:'success',head_repository:{full_name:repository}}});
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'release-lab-'));t.after(()=>rm(root,{recursive:true,force:true}));await writeFile(join(root,'index.html'),'SYNTHETIC VERSION A');return root;}
test('valid lab context',()=>assert.doesNotThrow(()=>verifyContext(context())));
for(const [name,changes] of [['reject non-lab repository',{repo:'example/other'}],['reject feature branch',{ref:'refs/heads/feature'}],['reject stale main',{currentSha:b}],['reject mismatched requested SHA',{requestedSha:b}],['reject invalid mode',{mode:'other'}]])test(name,()=>assert.throws(()=>verifyContext({...context(),...changes})));
test('valid prior run evidence',()=>assert.doesNotThrow(()=>verifyPrior(prior())));
test('reject unsuccessful prior run',()=>{const p=prior();p.priorRun.conclusion='failure';assert.throws(()=>verifyPrior(p));});
test('reject unrelated prior run',()=>{const p=prior();p.priorRun.head_repository.full_name='example/other';assert.throws(()=>verifyPrior(p));});
test('verify exact synthetic bytes',async t=>{const p=await fixture(t);assert.equal(await verifyArtifact(p,await siteDigest(p)),await siteDigest(p));});
test('reject modified rollback bytes',async t=>{const p=await fixture(t);const old=await siteDigest(p);await writeFile(join(p,'index.html'),'SYNTHETIC VERSION B');await assert.rejects(verifyArtifact(p,old));});
test('reject extra files or symlinks',async t=>{const p=await fixture(t);await symlink('index.html',join(p,'alias'));await assert.rejects(siteDigest(p));});

test('reject successful run without successful deployment',()=>{const p=prior();p.priorJobs[0].conclusion='skipped';assert.throws(()=>verifyPrior(p));});
