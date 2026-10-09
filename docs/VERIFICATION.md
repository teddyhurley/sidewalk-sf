# Verification record

Validation: October 7–8, 2026 (America/Los_Angeles). Public GitHub source and a password-protected Render preview are published. Earlier sections preserve iteration history; the latest deployment results are at the end.

## Initial local verification — October 7, 2026

- **57 Node tests pass.** Coverage includes duplicate incident-code rows, initial/supplement filtering, all-party pedestrian matching, crosswalk mismatches, invalid dates/locations, conflicting entities, stable retrieval/version checks, snapshot integrity, independent source freshness, partial report windows, and API separation of police aggregates from route records. Existing demo, facilities, theme, geometry and provider-error tests also pass.
- Live Mapbox Geocoding v6 and walking Directions succeeded for the local example. Address confirmation displayed ambiguous origin candidates. The returned route was approximately eight minutes / 0.68 km. No alternative was invented.
- Mapbox GL displayed the actual line in light and dark themes. With the snapshot disabled, live mode showed unavailable evidence, a disabled export, and no fictional facilities. Browser testing found and fixed a retained sample schematic and sample date label during live-mode transitions. The fit-map fallback is now restricted to demo mode.
- Browser checks covered desktop and 390 × 844 phone layouts. Phone page width equaled viewport width in both themes. Fictional amber collision circles, purple report bands and neutral facility markers rendered in both themes.
- Browser checks confirmed 3/6/12-month baseline sample report counts of 1/2/3; collisions remained four. Partial six-month coverage withheld reports while retaining collision context. Stale evidence withheld all counts. A facility detail showed explicit fictional provenance and no danger inference.
- Independent Shapely/pyproj calculations used ten actual Mapbox walking lines and 1,050 constructed test points around corridor thresholds. Maximum distance difference: 0.4384 m; no threshold disagreement more than 0.5 m from the boundary. Full aggregate results: `geometry-validation.json`. These were constructed points, **not historical events**.

## Complete real-data checks

The saved Socrata app token is configured. Initial HTTP 428 errors persisted after adding it; explicit fresh HTTP connections then allowed complete downloads. The underlying network cause was not independently established. The initial category check rejected every police row because the official crosswalk uses lower-case names; case normalization resolved the mismatch, while unknown categories/codes still fail closed.

| Source | Retrieved rows | Normalized entities | Mapped entities | Excluded locations |
|---|---:|---:|---:|---:|
| Initial Assault/Robbery report code rows, Oct 7, 2025–Oct 7, 2026 | 7,802 | 7,165 reports | 7,147 | 18 |
| Injury crash table, Jul 1, 2024–Jun 30, 2026 | 6,107 total crash rows | 1,284 pedestrian-involved crashes | 1,278 | 6 |
| Pedestrian parties in crash window | 1,343 | 1,284 distinct crash IDs | Joined above | — |
| Incident-code reference | 1,012 | Category validation | 0 taxonomy mismatches | — |

No conflicting entities, rejected selected rows, pedestrian join/date mismatches, missing crash counterparts, or crash-group/party disagreements remain. Excluded locations include missing, invalid and outside-envelope coordinates. This is a selected published snapshot, not comprehensive reporting.

`docs/evidence-validation.json` records source IDs, queries, windows, update/retrieval times, reconciliation, quality tallies and digest. `npm run data:validate` independently matched publisher-side distinct mapped entity totals: 7,147 reports and 1,278 crashes.

`real-attribution-validation.json` compared 12,780 crash/route pairs across ten real walking lines with Shapely/pyproj UTM distances. All thirty 25/50/100 m corridor totals agreed. Maximum nearby distance difference: 0.4363 m. This is independent computation, not an independent human or field review. Temporary provider geometries were removed after QA; only aggregate reports remain in deliverables.

Before the report-grid iteration, the real preview was inspected in the browser. The default 1 Market Street → 425 Mission Street result had five mapped historical crashes within 50 m; shared-area report totals were 94 / 162 / 283 for 3 / 6 / 12 months. Changing report windows left collision counts unchanged. Category sums may exceed unique reports because a report can have both categories. Source dates render in SF time. The real preview’s cards and map were inspected at desktop and 390 × 844 dimensions in light and dark mode without horizontal page overflow. No police points, route-specific police totals, or live facility markers appeared.

## Initial outstanding checks — later updates below supersede completed items

- Human review of source relevance, spatial uncertainty, block-count comprehension and the meaning of an area bypass. Current checks establish computational consistency, not ground truth.
- An SF transportation/data domain review and actual comprehension research. No interviews, field validation, adoption or safety improvement are claimed.
- Verification of any real facility directory before activating it. No real housing/halfway-house data is connected.
- Production token restrictions, host logs, abuse controls and deployment checks. Local success does not verify the production environment.

The standalone demo is generated from the same modules and checked for syntax/provenance. Direct file-URL browser inspection was previously blocked by browser policy; local HTTP testing does not certify that packaging path. No public GitHub or Render deployment has occurred.

## Earlier walking alternatives and square-map iteration — superseded October 8, 2026

The bounded nearby-street search was exercised against the owner's 998 Chestnut Street → 425 Mission Street example, with a five-minute detour budget. Six extra walking requests succeeded; three distinct provider paths were displayed in time order:

| Option | Provider duration (rounded for UI) | Distance | Provenance | Within +5 min |
|---|---:|---:|---|---|
| Columbus Avenue / Chestnut Street | 34 min | 2.96 km | Native walking route | Yes |
| Sacramento Street | 35 min | 3.06 km | Walking via a nearby waypoint | Yes |
| Front Street | 37 min | 3.22 km | Walking via a nearby waypoint | Yes |

These are observed integration results, not guaranteed future routes or a citywide success rate. Provider results were kept transiently in app/test memory; no live trip export was added.

At that stage, the automated suite had **57 passing tests**. Added coverage includes near-duplicate paths, deliberate loops, failed probes, snap/end-point validation, detour bounds, whole-cell aggregation, inclusive event dates, overlapping report categories, fixed legend thresholds, segment/cell intersections and the 50 m bypass margin. Stale and partial coverage produce empty police cell arrays and unavailable report context. Police point coordinates and report identifiers remain absent from API output.

Browser verification covered map-square clicks and their report popups, the accessible area selector, route selection from a bypass button, 3/6/12-month changes, stable area identity across those windows, detour limits, shading visibility, and light/dark rendering. On this journey, the selected Area 18 had 7 / 13 / 30 reports over 3 / 6 / 12 months; it was crossed by Route 2, while Routes 1 and 3 cleared its expanded square. The map does not infer that a bypass reduces risk. Another area crossed by Routes 1 and 3 correctly reported no full bypass because the other option touched its 50 m margin.

The six-month map contained 55 nonempty display cells. This is a bounded, whole-cell view, not complete citywide coverage. The broader shared total in the earlier browser record above is superseded by clickable report cells; it is not expected to equal whole-cell totals. Collision history and counts remained independent of report-window changes.

Desktop (968 px wide) and phone (390 × 844) checks had no horizontal page overflow. The phone map, legend, area selector and detail panel were inspected in dark mode. The original light theme and default viewport were restored. Screenshots are saved alongside the deliverables as `sidewalk-route-comparison-preview.jpg` and `sidewalk-mobile-dark-preview.jpg`. The local app remains available; nothing was published.

## Current street blocks and evidence-guided search — October 8, 2026

**64 automated tests pass, with zero failures or skips.** New checks cover rotated polygons and holes, duplicated report membership with a deduplicated aggregate, union line length, exact tiny-crossing bypass rejection, separate report/crash objectives and trade-offs, within-budget preference, stale/missing boundaries, bounded walking probes even with three native alternatives, and avoiding filler routes that improve neither measure.

Boundary ingestion reconciled 5,954 official rows and retained 5,950 supported polygons. GEOS repaired three source self-intersections, recorded in `block-boundary-validation.json`. An independent Shapely implementation then matched all block counts for all 3,642 mapped reports in the selected six-month window: 2,925 nonempty blocks, zero unmatched reports, zero disagreements. See `block-attribution-validation.json`. This demonstrates computational agreement, not ground-truth incident placement.

Live integration examples used the six-month report window, 50 m crash corridor and five-minute detour allowance. Durations and overlap are approximate and provider results can change:

| Journey / option | Minutes | Extra minutes | Mapped crashes | Metres alongside 30+ report blocks | Within budget |
|---|---:|---:|---:|---:|---|
| Chestnut → Mission: Columbus / Chestnut reference | 34.09 | 0 | 16 | 0 | Yes |
| Chestnut → Mission: Front Street | 37.07 | 2.98 | 15 | 0 | Yes |
| Chestnut → Mission: Mason Street | 38.62 | 4.52 | 14 | 0 | Yes |
| 1 Market → City Hall: Market / Goodlett reference | 34.34 | 0 | 34 | 1,185 | Yes |
| 1 Market → City Hall: Market / Grant | 37.71 | 3.36 | 29 | 1,049 | Yes |
| 1 Market → City Hall: Minna Street | 40.18 | 5.84 | 31 | 1,358 | No |

The second journey's Market / Grant option reduced overlap under both the 15 m and 50 m measures by at least 100 m. Minna reduced crash records but increased report-block overlap and exceeded the time allowance; those trade-offs are explicit. A Geary candidate that improved neither qualifying measure was removed by selection. The first trip made ten probes, the second twelve, with zero failed probes in these runs. No guarantee of globally optimal, lower-risk or universally available alternatives follows from these examples.

Browser checks verified the street-shaped map, block click popup and detailed report window/categories. Selected Block 546 ran alongside Routes 1 and 3; its bypass control selected Route 2 via Front Street, with three extra minutes. The current report-window update flow was exercised from six to three and back to six months; the settings-changed notice cleared after a successful new search. Route details remained consistent with the new search. Dark phone rendering at 390 × 844 had no horizontal page overflow. The default desktop viewport and original light theme were restored. Updated desktop and phone screenshots accompany the deliverables.

The app, source documentation and standalone fictional bundle are updated locally. No GitHub repository, public hosting deployment, field review, user study or safety outcome is claimed. The static file-URL inspection limitation noted earlier remains; the same modules were tested through the local server.

## Count-first multiple selection and expanded scope — October 8, 2026

The current suite has **69 passing tests**, zero failures and zero skips. Five added tests cover reviewed category-code validation, shared-report deduplication across selected shapes, inclusive time windows, bypasses that clear every selected shape, bounded/same-origin selection requests, snapshot-version mismatches and stale/partial source withholding. The selection API emits aggregate counts only; it makes no routing-provider request.

The expanded snapshot includes Assault, Robbery, Homicide, Rape and Sex Offense initial reports: 7,950 code rows, 7,292 normalized reports, 7,269 mapped, 23 excluded locations and zero taxonomy mismatches. Independent publisher totals match all 7,269 mapped reports and the unchanged 1,278 mapped pedestrian-involved crashes. Source revisions mean differences from the prior snapshot are not solely due to added categories. `report-category-validation.json` records category/window aggregates, with explicit partial-public-data limitations.

The independent GEOS check was rerun against all 3,719 mapped six-month reports: 2,946 nonempty polygons, zero unmatched reports and zero block-count disagreements. Prior two-category numbers elsewhere in this chronological record describe the earlier snapshot, not the current feed.

Browser selection of areas with 103 and 87 reports produced a combined count of 129, preserving shared-report deduplication. Counts and dates replaced numbered block labels in the selector, popup and detail panel. The category coverage list shows all five included categories and warns that confidential/juvenile records are withheld and homicide is undercounted. Source authority and computational consistency do not establish complete reporting or safe routes.

Final interaction checks confirmed map taps add two areas independently, removing one preserves the other, Clear selection resets the map, and theme changes retain the selection. The 103/87 example produced 129 combined reports over six months and 66 over three months, then returned to 129 when restored. Desktop and 390 × 844 phone layouts had no horizontal page overflow; dark mode and the count/date/removal panel were inspected. A markup nesting issue found in browser QA was corrected. The original light theme and desktop viewport were restored. No numbered `Block ###` names remain in the rendered page. Updated selection previews are saved alongside the deliverables.


## Diagonal selection stripes — October 8, 2026

Selected street-block polygons now carry a transparent diagonal hatch plus their existing outline. Hatch ink reverses for dark mode; underlying report bands remain visible, and route/crash layers draw above selection. The legend explicitly labels the hatch as “Selected area,” separate from report-volume bins. Both selection layers share one filter and the shading visibility control.

Browser checks confirmed two adjacent selections striped in light and dark themes, removing one preserved stripes on the other, hiding/showing shading preserved selection, and Clear selection reset the count. The 103/87-report example still returned 129 distinct reports. A 390 × 844 dark phone view had no horizontal overflow; browser error logs were empty. Default viewport and light theme were restored. Saved stripe previews show the actual local app.

JavaScript syntax/provenance checks and all 69 automated tests passed. The first automated run was blocked from opening localhost test servers by the sandbox; after network permission was granted, the full run passed. No data, selection-count methodology or routing objective changed.

The facility plan now identifies current SFHA-listed candidate properties, the HUD development point service, and BOP’s San Francisco directory entry, with remaining coordinate/status checks documented in LIVE_DATA_PLAN.md. These sources are not yet an enabled live facility directory.


## Live facility integration — October 8, 2026

All **74 automated tests** pass. The five new live-directory tests cover public metadata/provenance, type and proximity filtering, invalid and future-dated listings, duplicate IDs, unsafe source URLs, field allowlisting, expiry boundaries, sample/live separation, and API equivalence with/without facilities. The route provider receives no facility input. Syntax and demo-provenance checks passed.

Three source-reviewed records are bundled: Plaza East Apartments, North Beach Place and Taylor Street Center. All three matched exactly one Census public address response; point coordinates, benchmark and retrieval times are preserved in facility-validation.json. The source-listed status and review date do not establish current admissions, surveyed entrances, full property footprints or citywide coverage.

The local live browser test from 111 Taylor Street to 1300 Buchanan Street displayed both PH and HH pins. The panel showed two nearby listings from a directory of three, the partial-coverage label and October 8 source-check dates. Taylor Street’s marker opened the correct public address, status evidence, source links and review deadline; Locate on map closed the dialog and focused its pin. Disabling halfway houses removed only HH; disabling both removed every facility pin and showed the explicit hidden-layer state. Route-card contents were unchanged. Restoring toggles and switching 150/300 m filters updated the summary.

Dark phone map and detail-dialog views were inspected at 390 × 844 with no horizontal overflow. Browser error logs were empty. The desktop viewport and original system theme were restored. A leftover fictional description found during QA was corrected; real and sample detail labels remain distinct. New map/directory previews are saved with the deliverables. No public deployment or scheduled refresh occurred.

## Expanded facility directory — October 8, 2026

All **76 automated tests** pass. The expansion reconciles 850 unique City portfolio rows with the publisher count and unchanged update metadata. Fifty-two eligible former-housing rows map to 51 locations after combining Alice Griffith phases with the same address. The complete source-bounded directory contains 61 locations: PH 2, FH 51, HH 1, RH 7. Six new Census public-address queries each returned one matching SF address; their responses are preserved alongside the original three. City points supply former housing and Cameo House. The audit explicitly records seven SFAPD catalog programs without a verified residence address; none becomes an inferred pin.

New tests reconcile City row IDs, coordinates and classification with each mapped record; check the duplicate-address merge and excluded office/conflicting address cases; exercise citywide scope, all four category filters and expired category counts. The existing API comparison confirms facility attachment does not alter provider route or evidence payloads. Syntax, demo provenance and the standalone bundle checks pass.

In the live browser, 111 Taylor Street → 1300 Buchanan Street displayed eight nearby locations across all four categories at 150 m. Citywide scope produced 61 marker elements, and disabled the irrelevant radius control. Hiding former housing reduced the count to 10 and removed every FH marker without changing route-card contents. Reentry-only produced seven RH pins. Hiding all four categories removed every pin and displayed the explicit hidden-layer state. The former-housing detail correctly displayed source links, program-conversion context, City point limitations and the January 6 review deadline.

The longer legend initially exposed horizontal overflow on the phone. Wrapping and grid/fieldset minimum-width fixes corrected it: the live citywide directory measured 390 px page width in a 390 px viewport in both light and dark modes. The final dark-phone directory and desktop directory were visually inspected. The original system theme and default desktop viewport were restored. Coverage remains partial, and no field inspection, current admissions check, exhaustive city inventory or safety conclusion is claimed.

## Compact zoom-responsive facility pins — October 8, 2026

All **77 automated tests** pass, including a bounded, continuous, monotonic zoom-size check. Syntax and demo provenance checks pass. The initial full run was blocked by localhost sandbox permissions; after the network grant, the full suite completed successfully. Small teardrop graphics replace map squares; stable tap targets, explicit button roles, public source dialogs and the category list remain. The fictional schematic uses matching artwork.

Live UI checks on Taylor Street → Buchanan Street measured an approximately 15.73 px pin at route fit, 12.73 px after two zoom-out steps, and 17.23 px after zooming back in three steps. Citywide fit displayed all 61 markers with approximately 11.13 px graphics. Locate on map set a 19 px street-scale pin and returned focus to its button. Both Enter and pointer click opened the Taylor Street source details. Dark-phone inspection at 390 × 844 confirmed 390 px page width, small pins, working map zoom controls and no browser error logs. Desktop/system-theme settings were restored. The sample schematic was visually checked with the new pin shapes.

Rapid theme switching exposed an obsolete map-load timeout from a removed map. The map removal event now clears that timeout so an abandoned theme load cannot later display a failure for its replacement. Source review metadata, evidence snapshots, directory counts and routing inputs are unchanged.

Community/Reddit lead research added no locations. Seven catalog program addresses remain unresolved; the linked review in FACILITY_COVERAGE.md and facility-validation.json distinguishes mailing/contact addresses, historical sites and unconfirmed residential co-location. Two community pages failed direct retrieval and are documented as search-result leads only. No anonymous claims, inferred residences or private/confidential locations were added.

## Map-first workspace, saving and handoff — October 8, 2026

- **86 automated tests pass**, including nine tests for exact fictional route restoration, strict live-storage field allowlisting, corrupt/unsupported storage and write failures, walking-app URL encoding/city context, ordered provider steps and intermediate-arrival handling, and instruction preservation through the route search. Full JavaScript syntax/provenance checks pass.
- Browser QA on desktop and a **390 × 844** viewport exercised Map / About the data tabs, keyboard arrow navigation, independent panel scroll positions, collapsing controls, a dismissed introduction, chosen-route mode and dark appearance. Neither Map nor About the data overflowed the phone width. Dynamic source windows and a stale sample state remained on Map.
- The fictional second route was chosen, saved, reloaded and restored as **Via Mission & Beale, 17 minutes / 0.96 km**. External handoff remained disabled for the fictional path.
- A live **111 Taylor Street → 1300 Buchanan Street** comparison returned three options. The second option retained 21 provider steps, with its intermediate waypoint arrival labeled as an intermediate routing point and only the final stop described as the destination. Directions follow the selected path in the current page, without tracking or rerouting. A sub-minute detour is displayed as less than one minute rather than zero.
- Saving the live trip, reloading and opening it restored entered addresses/preferences with no route displayed. The UI explicitly requested new address confirmation and a fresh comparison. Storage tests confirm provider path, labels, steps and geocodes cannot survive serialization. Choosing a route and changing evidence preferences returns the user to route comparison so the update-alternatives action is visible.
- Both handoff links contained entered endpoints and walking mode, with no provider waypoints/coordinates. A static San Francisco hint is added to unqualified typed addresses. The app warns that external apps calculate their own path. **Native iPhone/Android app opening remains untested**; no exact-route continuity is promised.
- Ordered-stop QA entered two intersections, verified their order in both links, saved the trip, reloaded, and restored both fields. A fresh comparison still returned three routes; selecting the third retained 33 provider instructions. A stop containing a pipe character displayed an error and removed both outgoing links; correcting it restored them. The temporary saved trip was removed after the check. Tests also cover the three-stop limit, URL length, and use of the evidence snapshot date rather than the route-request date in saved review metadata.
- The Google browser handoff attempt timed out and showed a network-change error. Link construction is verified; successful opening and stop retention in the external browser/native apps are not. The optional stop fields do not modify the displayed Sidewalk route or its evidence counts.
- The relocated report controls still opened from About the data. Selecting two 103-report areas returned **140 unique reports**, demonstrating that the combined total still deduplicates overlap. Report-selection stripes and neutral facility controls remain available on Map.
- Current Mapbox Product Terms were checked against the July 21, 2026 edition. The live save feature intentionally retains inputs only because Navigation result persistence/export is prohibited by §2.10.1. Fictional sample paths can be retained. Source references and the remaining provider-permission requirement are documented in DATA_SOURCES.md and ACCESS.md.

These checks verify implementation and a few integration examples, not usability research, real-world incident completeness, current walking conditions, production hosting or a reduction in harm.

## Live default and address disclosure — October 8, 2026

The configured app now waits for the server configuration and opens in Live routing without rendering fictional route cards first. The address form is expanded by default and stays open after comparison. Its outlined Hide addresses / Show addresses control changes its chevron and supports both pointer and Enter activation. Fictional demo remains available explicitly; the standalone bundle is marked to stay fictional regardless of how it is served.

Browser verification after reload showed Live routing selected, an empty route-card container, an expanded address form, and an enabled comparison action. Confirming 1 Market Street → 425 Mission Street returned one provider option via Main Street, approximately 8 minutes / 0.67 km, with 3 mapped crashes within 50 m. The report window was April 7–October 7, 2026 and the collision window July 1, 2024–June 30, 2026. No form error appeared and the address form stayed expanded. These are historical records, not a real-time incident feed. JavaScript syntax/provenance and rebuilt standalone-bundle structure checks passed. Direct browser inspection of the standalone file was blocked by browser URL policy, so this change's offline verification is limited to bundle structure and syntax.

## Protected Render deployment preparation — October 8, 2026

97 automated tests pass, including 11 new hosting/refresh tests: authentication and missing-password failure, failed-login throttling, trusted proxy selection, independent weighted budgets, public minimal health versus protected application endpoints, rejected stale/corrupt/failed-source candidates, failed download/reconciliation preservation, atomic promotion and restart loading, concurrent refresh deduplication and shutdown cancellation, and API snapshot replacement without a restart. The initial sandboxed run could not open local test ports; after granting network permission, the full suite passed.

An isolated staged refresh using the configured Socrata token completed all four downloads, normalization, independent publisher reconciliation and promotion. It produced an October 8 snapshot with **7,244 mapped selected reports and 1,278 mapped pedestrian-involved crashes**; both sources passed the usability checks. This is a new snapshot/window, not an assertion that prior snapshot totals must be unchanged. The original local evidence file was not overwritten by this staging check.

The new server was checked at port 4174 with security headers enabled. Taylor Street → Buchanan Street returned three real route cards with no form error. Password checks are covered by integration tests; deployed-host HTTPS, browser sign-in, host proxy attribution, billing alerts and native phone-app handoffs remain to be verified after deployment.

The complete source was published at https://github.com/teddyhurley/sidewalk-sf in commit `ca77ccd5e23df1c54b3ea5ec171296d6635cd755`. All 80 files matched the local source byte-for-byte, and no extra remote files were present. A scan against the configured credentials and generic secret patterns passed; `.env` and raw evidence snapshots are excluded. Both initial GitHub workflows passed, including [Checks run 37887072096](https://github.com/teddyhurley/sidewalk-sf/actions/runs/37887072096). The redundant older workflow was then removed; the retained pinned workflow covers syntax, all 97 tests and the offline build.

Render's authenticated Blueprint flow recognizes the repository and `render.yaml`, but requires a payment method before configuration can continue. Owner approval for the $7.25/month base service/storage cost and token transfer is pending. No service or billable resource has been activated, and no hosted URL has been verified.

## Active Render preview — October 8, 2026

Following explicit owner approval of recurring cost and token transfer, Render deployed commit `24d9e6f0365622da7df35c92997e4f08fcad0116` to https://sidewalk-sf.onrender.com in 34 seconds. The dashboard confirmed one $7/month service plus one $0.25/month disk. The first refresh passed at 10:32 PM Pacific; authenticated `/api/status` showed `current`, evidence date October 8, and both sources usable. Existing token values stayed out of GitHub and verification output.

External HTTPS checks confirmed public `/healthz` returned only process status; the interface, application script, configuration and evidence-status endpoints all required authentication. Authenticated geocoding exposed multiple Taylor candidates; the exact street match was deliberately selected. The hosted Taylor Street to Buchanan Street comparison returned three provider routes with real evidence and 3/6/12-month report windows. Public map styles `streets-v12` and `dark-v11` both responded successfully when sent the actual hosted origin as referrer. Live provider paths and geocodes were retained only in process memory for the check.

The in-app browser reported `ERR_BLOCKED_BY_CLIENT` while opening the protected URL. Therefore hosted visual rendering, browser password entry and native phone handoffs are not certified by this run. Earlier local UI checks and current hosted endpoint checks are distinct. The remaining owner step is to open the preview in Safari/Chrome using the Render-held password and try the phone workflow.

A bounded hosted throttle check sent 121 invalid geocoding queries with varied forwarded headers within 8.23 seconds: 120 returned validation errors and the next returned HTTP 429. No Mapbox requests were made. Separate smaller checks did not establish reliable visitor identity through the proxy path. The final Blueprint therefore sets `TRUST_PROXY_HOPS=0`, and Render startup rejects a nonzero value. Socket-peer throttles are documented as coarse shared limits; the independently verified global budget remains the usage backstop. The test suite also checks that Render cannot start with unverified proxy trust.
