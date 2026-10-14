# Render portfolio demo

The deployment target is `teddyhurley/sidewalk-sf` on GitHub and the existing Render web service. The October 14 next-release change removes HTTP Basic authentication at the owner's request so résumé readers can try the app without a username or password. It is prepared in source; hosted anonymous access must be checked after deployment. Phone, user-comprehension and domain review remain incomplete. No safety conclusion follows from deployment or passing tests.

## Last verified deployment — October 8, 2026

URL: https://sidewalk-sf.onrender.com. The October 8 release required HTTP Basic credentials held in Render Environment settings. The next release removes that challenge, including for services that still have the old `PREVIEW_*` settings. No password is stored in the repository or URL.

The owner approved activation and token transfer. Render's initial deploy of `24d9e6f0365622da7df35c92997e4f08fcad0116` passed in 34 seconds. The first data refresh passed at 10:32 PM Pacific on October 8, and authenticated status showed both sources usable with an October 8 evidence date. A hosted Taylor Street → Buchanan Street comparison returned three real routes. Both map styles accepted the hosted origin as referrer. These are endpoint checks, not a completed phone/browser usability study.

Blueprint `sidewalk-sf-preview` manages one service and disk. Its daily refresh runs inside the service; GitHub check success gates future code deployments. Actual phone sign-in, external map-app handoff, account billing/usage notifications and independent domain/comprehension review remain outstanding. Do not equate the available URL with a public-launch decision.

## Resources and cost

`render.yaml` defines one Oregon Node web service (`0.5c-512mb`) and a 1 GB disk mounted at `/var/data/sidewalk`. Render pricing reviewed October 8, 2026: $7/month compute plus $0.25/month disk, before taxes and usage charges. Hobby workspace; no Pro workspace, database, separate worker or custom domain required. Mapbox charges are separate and account-wide. Source: https://render.com/pricing and https://render.com/docs/disks.

A single instance is intentional. The scheduler shares the service's disk; Render cron jobs cannot mount a web service's disk. Disk-backed deploys have a brief interruption, so test rollback before interview use. No paid activation is implied by the presence of the Blueprint.

## Deploy

1. Connect the GitHub repository through Render **New → Blueprint**. Use `main` and the root `render.yaml`.
2. Enter dedicated Mapbox browser/server public-scope tokens and the Socrata app token in Render environment settings. Never commit `.env`, token values or `data/`. Browser tokens are necessarily exposed to Mapbox GL; server tokens and Socrata credentials are not returned by the app.
3. Review the service and 1 GB disk cost, then approve creation. Render supplies `PORT`; `HOST=0.0.0.0` is configured. Build runs syntax checks and tests. Automatic future deployments require passing GitHub checks.
4. This release has no visitor sign-in. The interface, static assets and read-only status/configuration endpoints open directly; routing endpoints accept anonymous requests within the existing limits. Existing `PREVIEW_AUTH_REQUIRED`, `PREVIEW_USERNAME` and `PREVIEW_PASSWORD` variables are ignored and can be removed from Render. The browser-scoped Mapbox token remains intentionally public; server/Socrata tokens remain server-side.
5. Wait for `Evidence refresh passed; validated snapshot loaded.` in service logs, then inspect authenticated `/api/status`. On first boot there is no evidence file: live routing remains available with explicit evidence-unavailable labels until all data checks pass. No fictional records are substituted.
6. Restrict the browser Mapbox token to the actual preview hostname and any intended local origin; verify maps still load. Keep the dedicated server token suitable for server-side requests. Confirm Mapbox usage notifications and Render billing notifications in their dashboards.
7. Open the URL in a fresh private browser window and confirm there is no sign-in prompt. Check a real comparison, source dates and missing-source behavior. Verify phone handoffs before relying on them. Record the deployed commit and actual checks in VERIFICATION.md.

## Billing changes

The application does not collect payments. Render hosting and Mapbox usage are billed by their respective accounts. A payment-method or billing-details update belongs in the selected provider's billing settings, not in source or environment variables. On October 14, the owner confirmed updating the Mapbox payment card directly in their own browser. No payment credentials were supplied to the app or repository. This release does not change service plans or provider budgets.

## Data refresh and recovery

At startup, a valid persisted snapshot is loaded immediately. If missing or more than 24 hours old, an in-process scheduler starts a bounded refresh in a separate child process. An hourly check retries failures and starts the next daily refresh when due. This is refresh on a running service, not a promise of an exact publication time.

The candidate stays in an isolated temporary directory. Four source downloads reconcile row totals and revisions; normalization checks must pass; publisher-side mapped entity totals are independently reconciled. Integrity, provenance and source freshness are checked again before an atomic rename activates the file. The running app switches to the new validated snapshot without restarting. Concurrent refresh requests share one run. A failed/aborted refresh preserves the previous file and in-memory snapshot; source-specific staleness still withholds outdated layers.

Disk contents: `evidence.json`, one `evidence.json.previous` rollback copy, redacted `refresh-status.json`, and publisher reconciliation metadata. Incomplete staging directories are removed after a run; an abrupt machine failure can leave a small orphan directory, which can be inspected and removed manually. Raw police identifiers stay server-side. No source rows, entered addresses, provider responses or credentials are written to app logs.

The reviewed collision period is deliberately fixed to July 1, 2024–June 30, 2026. A new quarterly period needs deliberate source review and changes to `COLLISION_FROM`/`COLLISION_THROUGH`; daily downloads do not advance that period automatically. Facility listings remain a separate reviewed asset and expire according to their review deadlines.

`/api/status` is public and read-only; it shows current source health plus redacted refresh outcome, without credentials or raw source rows. Failed refreshes emit a redacted log message. External alert delivery is not configured by this Blueprint; inspect status/logs during the test pilot and configure a monitor before unattended public use. `/healthz` means the process is running, not that every evidence layer is usable.

For a code rollback, choose the last verified commit in Render and deploy it. For an evidence rollback, stop refreshes (`AUTO_REFRESH=0`), verify the previous snapshot with `loadSnapshot` and the source-health checks, restore it atomically to `evidence.json`, then restart. Never change timestamps to make stale evidence look current.

## Access and usage limits

The October 14 source change removes the preview gate rather than relying on a missing password to unlock it. No `PREVIEW_*` variable is required or read. Anonymous use retains the same provider budgets, input validation, same-origin checks and response headers.

The server ignores forwarded IPs locally and on Render (`TRUST_PROXY_HOPS=0`). Hosted requests did not establish reliable visitor identity through the proxy chain, so the preview rejects nonzero trust on Render. Socket-peer limits are a coarse shared throttle, not a verified per-person allowance; several visitors can share it and upstream connections can use different peers. Independent per-process budgets limit weighted geocoding/routing requests across all identities: 120 units per minute and 1,000 per 24 hours, with each route search reserving 13 units. They reset on process restart and exclude map-tile loads, so they are not a guaranteed billing cap. Invalid or failed requests can consume units. These limits support modest portfolio traffic; they have not been validated for high-volume public use.

Security headers restrict script origins, disallow framing, and mark the preview noindex. Address inputs are sent in POST bodies over the host's HTTPS URL. Saved trip inputs remain in the user's browser. Native walking directions, user comprehension, independent domain review, monitoring delivery, billing settings and hosted proxy behavior still require verification.

## Local checks

- `npm run check` checks JavaScript syntax and demo provenance.
- `npm test` covers source normalization, route comparison, anonymous access including upgrades from legacy settings, usage limits, refresh promotion/failure, and dynamic snapshot loading without live credentials.
- `npm run demo:offline` builds the independent fictional fallback.
- A real staged refresh was tested with the local configured Socrata token; raw output stayed outside the public project. See VERIFICATION.md for results.
