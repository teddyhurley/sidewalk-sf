# Launch and validation plan

All targets below are proposed decision rules, not measured results. Dates are relative to readiness, not invented commitments from participants.

## Current release order — owner update, October 7, 2026

Public deployment is on hold. Complete local evidence engineering and validation, then test comprehension and polish the demo before publishing. The earlier optional portfolio-first sequence below is superseded by this priority.

Current implementation audit:

- Live Mapbox address confirmation, walking Directions and GL maps passed local browser checks in both themes, including a 390 × 844 phone viewport. The original ten-pair sample used native alternatives and each returned one route. The new bounded waypoint search is checked separately in `VERIFICATION.md`; alternatives remain optional.
- The ingestion and independent per-source quality gates are implemented. A complete refresh, independent publisher-total reconciliation, and snapshot integrity checks now pass. The local real-evidence preview is enabled; public deployment remains on hold.
- 86 automated tests pass, including normalization, taxonomy, stale/partial source behavior, snapshot integrity, and API output separation. They do not establish live source accuracy.
- Independent geometry calculations covered ten real provider lines with constructed test points. The follow-up checked all 1,278 mapped crash points against ten real routes: all corridor counts agreed. Human interpretation and field review remain.
- Official block geometry is bundled and audited; independent attribution matched every block count for 3,719 mapped six-month reports. The bounded evidence-guided search has separate report-overlap and crash objectives, tested with real provider examples. Neither establishes safety.
- The sample facility layer is fictional. The live directory contains 61 public source-reviewed listings in four distinct categories; geocoding, classification provenance and review deadlines are checked. On-site operating conditions, entrances and full city coverage remain unverified.
- Fresh phone/desktop checks covered themes, report windows, partial/stale coverage, facilities and live/sample separation. A retained sample-map transition bug was found and fixed. The real preview was also checked end to end. User comprehension and domain review remain outstanding.

Release gates, in order:

1. Implement and reconcile reviewed real incident and pedestrian-involved collision snapshots; validate category/date/key semantics and missing-coordinate treatment.
2. Independently verify matching on at least ten real route examples; withhold unsupported distinctions caused by anonymized locations or uncertain coverage.
3. Validate source dates, reporting lag, stale/missing states and source separation end to end. Verify any real facility directory independently before showing it.
4. Complete live-provider, phone/desktop, theme, keyboard and failure-state checks; confirm no sample evidence appears in live mode.
5. Run the comprehension study and fix consequential misunderstandings. Record actual results and remaining limitations.
6. Publish only when these gates are satisfied for the included layers. Exclude unfinished layers rather than representing them as verified.

## Stage 1 — portfolio demonstration (after the local gates)

Publish the clearly fictional demo with the source repository, README, architecture, evidence audit, and test instructions. Keep the fictional label in screenshots and presentations. Use a private preview for review; make the final portfolio URL public only when its source/access destination is agreed. Live APIs are optional and not required to evaluate the demo.

Release checklist: tests pass; no credentials in the repository; no location inputs in analytics or URLs; desktop/phone layouts checked in both themes; keyboard controls, input labels, focus styles and dialogs checked; sample exports preserve provenance; stale/missing coverage cannot look like a zero. Avoid claiming formal WCAG certification from a manual pass.

## Stage 2 — moderated comprehension study

Recruit five to eight adults who walk in SF and sometimes plan unfamiliar trips. Recruitment is a plan, not completed research. Avoid asking participants to walk an unfamiliar route for the experiment; use fictional planning tasks. Obtain consent and avoid collecting precise home/work addresses.

Run a 20–30 minute session:

1. Ask how they currently decide between walking routes and what information they seek. Do not introduce a desired answer.
2. Present the sample journey with a five-minute detour allowance. Ask them to choose a route and explain why.
3. Ask what a collision/report count means, whether one route has been established as safer, and what is missing.
4. Change the tolerance to zero and introduce incomplete/stale evidence. Ask what they would do next.
5. Ask them to locate the source window and explain whether the data describes tonight.
6. Let them change the theme and use the flow on a phone. Observe input, scrolling, map/list comprehension and contrast issues.

Record task completion, time, assistance, comprehension errors, quoted feedback with consent, and explicit uncertainty. Do not collect exact locations. The first study is directional; five participants do not establish population-level validity.

Proposed gates:

| Measure | Pilot decision rule | Why |
|---|---|---|
| Core task completion without assistance | At least 4 of first 5 participants | Basic usability signal, not a confidence interval |
| Identifies extra minutes and evidence difference | At least 4 of 5 | Tests the product’s value proposition |
| Interprets the app as a safety guarantee | Any occurrence triggers copy/design review | False confidence is a countermetric |
| Recognizes sample/stale/incomplete mode | All first 5 participants | Provenance is essential to this release |
| Finds source dates without prompting | At least 4 of 5 | Checks whether transparency is usable |

Keep a research log with `participant pseudonym`, `task`, `observation`, `interpretation`, `change`, and `follow-up result`. A blank log is better than fictional findings.

## Stage 3 — real-data engineering gate

Before attaching data to live routes:

- Obtain working provider tokens and run end-to-end routing tests for ambiguous addresses, one route, multiple routes, out-of-envelope locations and provider failures.
- Define a common, complete historical window for each source. Maximum dates and metadata freshness alone are insufficient.
- Verify pedestrian-involvement category semantics; review all source classes and incomplete/unknown records with a knowledgeable reviewer.
- Implement server-side bounded retrieval, deterministic pagination, total-count reconciliation, entity deduplication, rejected-record tallies, snapshot versioning, deletion reconciliation and source-specific refresh policies.
- Audit police location shifts, missing-coordinate rates, data revisions and pre/post-April 24, 2024 spatial differences. Suppress distinctions that cannot survive those uncertainties.
- Verify HIN `geom` shapes and segment interpretation. Do not mistake all exported centerline rows for flagged HIN membership; confirm inclusion semantics before overlay. Treat crossing vs following separately.
- Independently calculate at least ten route examples in GIS. Include mid-segment, boundary, duplicate, shared-corridor, missing-coordinate, long-route, and zero-record cases.
- Test 25/50/100 m (or justified revised tolerances). If an apparent difference reverses with plausible alignment uncertainty, show uncertainty and withhold a directional callout.
- Review reporting bias and exposure denominators. Never infer individual risk or create a count/km risk score.
- Obtain a domain review from an SF transportation/data practitioner. Record comments and unresolved questions.

Only then run a small opt-in real-data planning pilot. It can establish comprehension/usefulness; it cannot establish reduced crime or injury.

## Learning and iteration

Primary outcome: a participant can explain the route trade-off and limits before choosing. Countermetrics: overconfidence, misinterpretation of shifted locations, hidden missingness, and discouraging a walk based on ambiguous report counts. Secondary measures: task time, unaided completion, return use when another planning need occurs.

Do not add analytics by default. If telemetry becomes necessary, collect consented aggregate events such as `comparison_completed`, `evidence_opened`, and `insufficient_coverage_shown`, excluding addresses, coordinates, route geometries, full URLs and free text. Specify retention and opt-out before launch.

Sequence: initial sessions → one prioritized change → repeat the same tasks with three to five additional participants → report what changed and what remains uncertain. A launch report must include actual sample sizes, observed results, denominators, recruitment limitations, and negative findings.

## Release and rollback

Version evidence separately from code. A failed refresh keeps the prior snapshot visibly stale, not silently current. Schema drift disables the affected layer. Provider failure leaves the demo available and displays an actionable error. Remove a live layer immediately if deduplication, coordinate interpretation, or completeness is wrong; document the incident before re-enabling it.

## Follow-up validation gates

- Test six-month comprehension against 3/12-month alternatives: ask users to identify exact dates and explain why a count changes. Do not interpret different-length raw totals as a trend.
- Confirm partial report coverage is understood as unavailable, while collision context can remain independently usable.
- Test whether neutral facility markers still create an unsupported danger inference; adjust labels, defaults or prominence if that occurs. Verify actual site type/status and directory recency before showing any real locations.
- For live sources, reconcile backdated updates/deletions and distinguish a fully retrieved snapshot from exhaustive reporting. Validate the spatial precision against route separation before showing police context as route-specific.
- Defer dispatch launch until open/closed/expired/unknown behavior, publication delay, masked locations, omissions and refresh failure are independently checked. No dispatch call should be counted again as a police report.

## Block and guided-search comprehension gates

Ask participants to explain why adjacent blocks can share one report, why an unshaded block is not evidence of safety, and why 2020 geography can differ from today's street. Have them compare a route that reduces one evidence measure but increases the other, identify an option beyond their detour limit, and update alternatives after changing the report window. Test the fixed 30+ threshold and 15/50 m overlap sensitivity with a GIS/domain reviewer before public use. Measure usefulness and comprehension; do not claim the bounded search finds an optimal or safer route.

## Multiple selection and expanded scope checks

Ask users to select and remove two adjacent areas, explain why the combined count can be lower than their individual sum, and identify the date range and included categories. Verify they understand that a zero published homicide/rape count does not establish that none occurred. Compare their interpretation of “crime reports” with an official UCR total. Recheck the report-shading threshold with a domain reviewer after category scope changes; no human comprehension result is implied by the passing automated/API checks.


Directory comprehension follow-up: ask users to distinguish current from former public housing, explain the broader reentry category, and recognize that citywide viewing does not mean exhaustive coverage. Test the scrollable directory when markers overlap. The source review reconciled 850 City records and documented seven unresolved SFAPD program addresses; neither those checks nor the test count confirms current occupancy or an on-site inspection.

## Map-first repeat-use and handoff checks

Observe a first-time and repeat planning session. Ask users to find the report period, distinguish missing from zero, locate a methodology explanation, collapse controls and choose a walk. Then save/reopen a live trip and ask whether they expect the old path to be retained; it is not. Have users explain why Apple/Google may use avoided streets. Target accurate understanding before reducing more visible context. Test links on supported iOS and Android versions; verify walking mode and intended endpoint matches manually. These research/device checks remain unperformed.

For optional handoff stops, test zero/one/three stops, verify their exact order on supported Apple/Google phone apps, and compare the streets chosen between them with the intended route. Test an unsupported app/browser and ensure the user notices ignored stops. Do not claim that adding checkpoints guarantees continuity or a measured improvement in route retention.
