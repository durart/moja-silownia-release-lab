# Acceptance matrix — real GitHub integration

Preconditions: lab only; verified distinct initiator and owner; active lab ruleset; protected `github-pages` environment; no production data, credentials, or deployment target; owner records exact run IDs, source SHAs, artifact digests, approver, timestamps and observed result. If any test unexpectedly allows an unauthorized operation, disable lab release, record FAIL, stop and investigate. All cases below are NOT RUN remotely.

| ID | Scenario / procedure | Expected outcome |
|---|---|---|
| AT-01 | Non-admin lab actor attempts direct push of a synthetic change to main using their own verified identity | GitHub denies update; main unchanged |
| AT-02 | Open lab PR with a deliberately failing lab-regression test; attempt merge through non-admin actor | Merge denied; main unchanged |
| AT-03 | Restore test; green CI but no owner review; attempt merge, then obtain owner review and merge only in lab | Denied before review; allowed only after valid review |
| AT-04 | Dispatch publish for exact main SHA, leave awaiting environment review | No new Pages deployment; candidate prepared only |
| AT-05 | Initiator/non-owner attempts review or administrative bypass; owner does not approve | Review/bypass denied; no deployment. Verify actual actor identity, not merely display name |
| AT-06 | Owner rejects pending lab publish | Deploy job cannot run; previous site unchanged |
| AT-07 | Dispatch publish, then merge owner-reviewed synthetic change to lab main while awaiting review; approve old run | Post-review SHA guard rejects stale run; site unchanged |
| AT-08 | Rollback with previous successful run ID but deliberately wrong owner-recorded digest | Prepare job fails; no deploy |
| AT-09 | Publish synthetic A with exact SHA and approval, record run ID, head SHA and content digest; then owner-reviewed synthetic B via new PR and approved publish | Only lab URL changes; both successful deployment records retained |
| AT-10 | Dispatch concurrent lab releases (record each run and pending/cancel status) | At most one active deployment; pending requests may be cancelled by GitHub concurrency; no stale approval deploys a different artifact |
| AT-11 | Request rollback to A from current B with correct previous run ID/SHA/digest but without review (then reject) | No rollback; B remains live |
| AT-12 | Request rollback to A from current B, owner verifies exact prior run/digest and approves separately | Lab URL serves A; live bytes/hash match archived A; production untouched |

## Evidence record (repeat for each case)
- Case ID, actor login/type, owner reviewer, run/PR ID, source SHA, prior run ID if rollback, content SHA-256, before/after lab URL and response, GitHub decision/error, result PASS/FAIL/BLOCKED, timestamp.
- Record production main SHA before and after read-only; do not make test writes against production.
- For AT-09 and AT-12 download the live lab index and compute SHA-256 against the retained `lab-site` artifact. If transport changes bytes, investigate instead of accepting a visual match alone.
- For AT-05, absence of an approval API in a connector is not proof of an independent security boundary. Do not mark PASS unless separation and effective permissions are verified.
