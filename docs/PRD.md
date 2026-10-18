# Sidewalk SF — Product Requirements Document

**Author:** Teddy Hurley  
**Date:** October 17, 2026  
**Product baseline:** V1; public portfolio demo with live routing and historical evidence  
**Status:** Requirements for the current product and its next validation cycle. Proposed measures below are not observed user outcomes.

[Open Sidewalk](https://sidewalk-sf.onrender.com) · [Source code](https://github.com/teddyhurley/sidewalk-sf) · [Product decisions](PRODUCT.md) · [Product case study](CASE_STUDY.md)

## 1. Problem, audience and job to be done

Walking directions make time and distance easy to compare. Someone who also wants historical pedestrian-collision or reported-incident context must reconcile sources with different dates, definitions and geographic precision. A single safety score would hide those differences and promise more than the available evidence establishes.

Sidewalk must help a walker compare detour time and historical context while preserving uncertainty when evidence is missing, stale or imprecise. It does not determine whether a route is safe or predict individual harm.

The primary audience hypothesis is adults planning unfamiliar SF walks who want additional context. Portfolio reviewers also need immediate access without credentials or setup. Independent research has not validated demand; [CASE_STUDY.md](CASE_STUDY.md) distinguishes owner feedback from proposed studies.

**Job to be done:** “When choosing between available walks, help me understand what changes along the route and how much extra time it costs, so I can make my own decision.”

## 2. Objectives, scope and non-goals

The release must provide a public route comparison, explain time and evidence together, and handle unavailable layers usefully. Users should inspect routes, save planning inputs and transfer them to Maps without mistaking that handoff for the same path.

V1 covers SF street-address planning, provider-computed walking alternatives, historical pedestrian-involved collisions, selected police-report context, and an explicitly fictional demonstration. Optional public-place directory layers remain separate from route evaluation.

**Non-goals:** safety scores, dangerous-neighborhood labels, demographic or housing-type risk proxies, predictions of harm, complete crime inventories, emergency warnings, current-condition monitoring, live position tracking, turn-by-turn rerouting, accessibility certification, exact live-route storage/export, accounts or national coverage. Departure time is a planning note; it must not imply validated nighttime, lighting or time-of-day analysis.

## 3. Core journeys

1. **Plan:** Enter two SF street addresses, set extra walking time, confirm geocoding matches and compare returned routes.
2. **Understand:** Identify the shortest found route, inspect added minutes, compare collision counts and report-block overlap separately, and check dates and limitations.
3. **Explore:** Change the report window, corridor or detour limit and update the search. Inspect selected blocks and available geometric bypasses.
4. **Choose and reuse:** Select a route, inspect steps, save entered preferences or open Maps with up to three ordered typed stops. Understand that Maps recalculates.
5. **Recover:** Encounter missing evidence, one route, no improvement, provider failure or exhausted usage allowance. Receive an explicit state and recovery action, without invented routes or substituted zeros.

## 4. Functional requirements and acceptance criteria

P0 requirements protect the central comparison and its interpretation. P1 requirements support repeat use. “Implemented” describes source behavior; hosted and phone verification must be recorded separately in [VERIFICATION.md](VERIFICATION.md).

| ID / priority | Requirement and acceptance criteria | Current status |
| --- | --- | --- |
| SW-01 · P0 | **Direct access and clear mode.** The portfolio URL must open without visitor login. Live routing and the fictional demonstration must be visibly distinct. Missing configuration or connectivity must not present invented data as live. | Public portfolio access available; mode boundaries implemented. |
| SW-02 · P0 | **Confirmed endpoints.** Accept SF street addresses, show candidate matches, and require confirmation before routing. Reject unsupported or invalid input explicitly. A sample must accept only its documented address pair and reversal. | Implemented. |
| SW-03 · P0 | **Real alternatives.** Show at most three distinct provider-computed walking paths in duration order. Preserve the shortest found reference; show added minutes and detour eligibility. Reject malformed paths, near-duplicates and obvious loops; never manufacture options to fill three slots. | Implemented. |
| SW-04 · P0 | **Separate comparison measures.** Show mapped pedestrian-involved crash counts within the chosen corridor and approximate walking length alongside blocks with 30+ selected reports. Display both changes when a detour improves one and worsens the other. No combined risk score or “safer” ranking is permitted. | Implemented; release wording explicitly names the 30+ threshold. |
| SW-05 · P0 | **Bounded alternative search.** Search around relevant report blocks and crash clusters when those sources are usable. Prefer within-budget improvements in either measure; label beyond-budget options and partial searches. Finding no qualifying improvement is valid. | Implemented. |
| SW-06 · P0 | **Inspectable evidence.** Provide 3/6/12-month report windows, an independent collision period, and 25/50/100 m collision corridors. Show exact dates, source state, included categories and sensitivity. Missing or stale coverage must produce unavailable values, not zero. | Implemented. |
| SW-07 · P0 | **Block selection.** Let users inspect one or several report areas with count/date labels. Combined counts must deduplicate shared reports. A displayed bypass must clear every selected shape using the defined margin; unknown geometry cannot establish a bypass. | Implemented. |
| SW-08 · P0 | **State consistency.** Changed evidence/search settings must expose an update action. Late responses must not overwrite a newer journey or selection. Endpoint edits must prevent Maps links from opening the previously compared trip until addresses are restored or compared again. | Implemented; automated regression checks cover endpoint edits, clearing, swapping, restoration and a new comparison. Hosted verification is recorded separately. |
| SW-09 · P1 | **Selected walk and local saving.** Selecting a route must reveal its validated provider steps. Save only typed live endpoints/stops, preferences and public evidence dates. Loading a live trip must request a fresh comparison; only fictional samples may restore their exact route. | Implemented. |
| SW-10 · P1 | **Honest Maps handoff.** Use walking mode and user-entered endpoints plus up to three ordered typed stops. Do not export provider geometry or derive hidden stops from it. Warn that external apps recalculate, may ignore stops, and may use different streets. Disable sample handoff; reject invalid or oversized links visibly. | Link construction implemented; native-device route/stop behavior remains to be verified. |
| SW-11 · P1 | **Independent place context.** Optional housing/reentry directory pins must show public provenance, approximate location, partial coverage and review dates. Toggling them must leave route ordering, search and evidence totals unchanged; expired listings must be withheld. | Implemented. |
| SW-12 · P0 | **Reliable evidence refresh.** Validate source retrieval, normalization, integrity and publisher reconciliation before atomically promoting a snapshot. Preserve the previous snapshot after failure, while continuing to withhold any source that becomes stale. | Implemented; current source health must be checked operationally. |

Source contracts are in the [server](../server.mjs), [route search](../lib/route-options.mjs), [interface](../dist/app.mjs) and [saved-trip/handoff module](../dist/lib/walk-plans.mjs). The release must satisfy these criteria even where older design notes describe an earlier local-only stage.

## 5. Data and interpretation constraints

Collision history covers pedestrian-involved injury crashes, not necessarily cases where a pedestrian was injured. The reviewed live collision window is July 1, 2024–June 30, 2026; refreshes do not automatically advance that fixed window. Police context uses the requested calendar-month window and the categories declared by the validated snapshot. Current scope includes Assault, Robbery, Homicide, Rape and Sex Offense where available; it is not a complete inventory or an official violent-crime statistic. See [DATA_SOURCES.md](DATA_SOURCES.md) and [LIVE_DATA_PLAN.md](LIVE_DATA_PLAN.md).

Report locations are masked toward intersections. Census 2020 blocks organize the display, but do not locate events inside a building or identify a particular sidewalk. A report can inform adjacent blocks; selected-area totals must use a union rather than sum their counts. Fixed shading bins are 1–4, 5–14, 15–29 and 30+ reports. Unshaded areas do not establish safety. Geographic margins are product screening choices, not validated uncertainty bounds.

Counts lack pedestrian-exposure denominators; reporting and enforcement can differ across locations. Neither totals nor counts per kilometre establish individual risk. Retrieval checks do not establish completeness of real-world events. Official data still require deduplication, category validation and geometry checks.

The live and fictional paths must remain separate in calculations, labels, saves and exports. Live police identifiers and point coordinates stay server-side; the browser receives bounded aggregates. The facility directory must never become an implicit risk input. Detailed contracts and source freshness policies are in [ARCHITECTURE.md](ARCHITECTURE.md).

## 6. Nonfunctional, privacy and operational requirements

- **Usability and accessibility:** Keep addresses, routes and map together, with detailed methodology in About the data. Changing dates and unavailable states must stay visible on Map. Support keyboard controls, labeled evidence, non-color cues and light/dark/system themes. Formal assistive-technology and phone checks remain part of validation.
- **Bounded performance:** Display search progress, limit provider fan-out and reject excessive inputs. Timeouts and failed probes must preserve valid results where possible and explain partial coverage. Establish phone/desktop timing on a fixed test set before claiming a latency target.
- **Privacy:** No visitor account, continuous location tracking or installed analytics is required. Address queries go to Mapbox when requested; external Maps handoff sends entered trip inputs to that provider. Saved inputs remain on the device. Live provider geometry, geocodes and steps stay in session memory and must not enter persistent saves.
- **Operational reliability:** Enforce provider-request budgets, source-specific freshness and redacted errors. A process-health endpoint must not be mistaken for evidence health. Refresh failures must preserve the last valid snapshot without making stale dates appear current.
- **Cost and integration limits:** Retain bounded search and a single-service portfolio architecture until observed demand warrants change. Usage limits are not a guaranteed billing cap. Provider tokens must remain appropriately separated; billing, logging and retention outside the app require their own review. See [DEPLOYMENT.md](DEPLOYMENT.md).

## 7. Proposed success measures and validation

Begin with five to eight SF walkers completing moderated tasks. Include desktop and phone use and at least one missing-data scenario. Observe manually; no adoption or safety outcome has yet been measured.

| Measure | Proposed acceptance threshold | Response if missed |
| --- | --- | --- |
| First comparison | At least 80% confirm addresses and explain one route trade-off within three minutes without coaching. | Simplify planning, candidate confirmation or route cards. |
| Evidence interpretation | Every participant distinguishes historical reports from current conditions and can find the observation dates. | Revise wording and disclosure placement before broader promotion. |
| Missing-data understanding | Every participant recognizes unavailable data as unknown, not zero or safe. | Change the empty/error states and repeat the task. |
| Save/handoff comprehension | At least 80% explain that saved inputs and external Maps links do not preserve the exact selected path. | Rework labels and handoff flow; keep device limitations explicit. |
| Native handoff integrity | On each supported iOS/Android configuration, verify walking mode, matched endpoints and ordered stops; document ignored-stop behavior. | Adjust supported behavior or withhold unsupported claims. |

Automated checks must cover state transitions, stale-address handoff, source failure, deduplication, geometry and snapshot promotion. Independent geographic calculations and publisher reconciliation test implementation consistency; they do not establish field conditions or reduced harm.

## 8. Release plan, roadmap and open questions

**Current release:** Preserve public portfolio access. Verify the threshold wording and endpoint-edit handoff fix locally and on the deployed revision. Smoke-test a real comparison, source health and the explicit fictional path; then check native handoffs on actual phones. Record the deployed commit and verification scope.

**Next:** Run the comprehension pilot and an independent source/geographic review. Fix misunderstandings before expanding the evidence set. Review freshness, provider usage and missing-data behavior during the pilot; establish operational alerting before unattended wider use.

**Later:** Evaluate infrastructure context, accessibility information or better alternative generation only after confirming usefulness and source fitness. Exact-route continuity requires an explicit provider/architecture decision. City expansion requires new source definitions and validation, not merely a larger geocoding box.

**Open questions:** Do walkers value this extra planning step? Is six months the clearest default report window? Can people interpret shared block counts and competing route measures? Do typed stops improve handoff enough to justify the effort? Which missing source most often prevents a useful comparison? The next roadmap should follow observed answers, not unmeasured engagement or safety claims.
