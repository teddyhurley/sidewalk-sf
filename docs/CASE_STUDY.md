# Sidewalk: turning incomplete evidence into a useful choice

**Status:** Built portfolio V1, October 7, 2026. Fictional demonstration plus a locally validated routing and historical-data preview. Public launch awaits human review. No pilot outcomes claimed.

## The opportunity

Walking directions make time and distance easy to compare. A walker who wants to understand historical pedestrian collisions or reported incidents must reconcile other sources, each with different dates, definitions, and geographic precision. The initial concept—“test whether this route is safe”—promised more than these sources can support.

The chosen product question is narrower: **What changes if I take a different available walk, how much time does it add, and what can the evidence actually tell me?**

## The consequential decision

Sidewalk separates collision history and selected reports, keeps duration ordering, and withholds a comparison when evidence is incomplete. It never combines them into a safety score. This decision follows source limitations and ethical/product reasoning; it did not come from user research that has not happened.

The source audit made the trade-off concrete. SFPD coordinates are shifted to intersections and report rows can multiply an incident. Crash records are mapped to simplified centerlines. The current HIN is a fixed 2024 planning vintage. A polished map alone would make this uncertain evidence appear more precise than it is.

## What was built

A complete mobile-friendly interaction: two addresses, detour tolerance, three illustrative options, selected-route map, separate findings, provenance, date windows, sensitivity controls, missing/stale states, and light/dark/system themes. A dependency-free comparison engine is shared between browser and tests. A Node adapter implements confirmed geocoding and actual Mapbox walking alternatives without attaching fictional records to them.

The fictional demo is an explicit product artifact, not a placeholder disguised as live evidence. It makes failure and abstention states reviewable today. A source-audit script checks official metadata and aggregate availability without downloading individual police narratives.

## Technical ownership to demonstrate

- Explain point-to-segment matching and why checking only route vertices fails.
- Show why deduplicating source entities matters at shared segments and in one-to-many police tables.
- Change a detour limit and explain why no alternative can be the correct result.
- Trigger missing/stale evidence and inspect `null` counts rather than zeros.
- Show how a live route is prevented from acquiring sample evidence.
- Explain why public Mapbox tokens, temporary geocoding terms, and server/browser boundaries influence architecture.
- Discuss the source-audit results without treating maximum event dates as completeness guarantees.

## Validation plan and business hypothesis

Start with five to eight relevant SF walkers doing observed planning tasks using fictional examples. The first success metric is comprehension of the trade-off and uncertainty, not a reduction in harm. If users read “fewer reports” as “safe,” revise the presentation before exposing real-data results. The next milestone is a reviewed real-data pilot with independently checked GIS examples.

Distribution hypothesis: recruit through reachable local walking/community or university networks and show a short demo. This has not been tested. The product competes with users' existing map apps and the option to ignore additional context; it needs to earn the extra cognitive effort. Monetization is unresolved. A civic or travel-planning integration may be worth investigating only after usefulness is demonstrated.

Cost model: sessions × geocoding calls + routing calls + map loads, plus ingestion/storage/hosting. Submit-based geocoding avoids per-keystroke calls. Use provider pricing at launch and account quotas; do not invent a free-forever claim or revenue forecast.

## Interview-ready account

“I built a route comparison prototype around a boundary: public incident records cannot certify a walk’s safety. I audited the sources, designed separate evidence views, and tested withholding behavior as carefully as the normal path. The next experiment is whether people can explain the route trade-off without interpreting the result as a safety guarantee.”

This is a prepared explanation of the artifact, not proof of user impact. Replace it with observed learning after the pilot. Be explicit that implementation and research were AI-assisted; explain which decisions, checks, and changes you personally reviewed before presenting ownership.

## Iteration: recency and place context

Follow-up requests introduced a six-month report window and public-housing / halfway-house markers. The implementation separates the underlying questions: dated reports describe recorded activity; a directory describes facility type. Markers are neutral, optional and tested to have no effect on counts or route selection. Three-, six- and twelve-month views share one filtering contract, while collision history keeps its own longer period. A partial-coverage scenario demonstrates why unknown counts must not become zero.

The live-data assessment recommends daily police reports and reviewed quarterly collisions first, followed by infrastructure requests. Dispatch calls have a much faster publication cycle but need a separate interpretation, status and expiry model. See [the source and integration plan](LIVE_DATA_PLAN.md). These are implemented demo behaviors and proposed pilot decisions, not measured user outcomes.

## Local validation follow-up

The implementation now includes a gated real-evidence pipeline, 69 passing automated tests, and an independent geometry cross-check on ten provider routes using constructed points. Browser validation exposed a sample-map transition bug, which was fixed before publication. Connection troubleshooting and taxonomy checks resolved the initial refresh failures. A complete snapshot is now enabled locally: independent publisher totals match, and crash corridor counts agree with a second calculation across ten real routes. Human comprehension and domain reviews remain release gates; this is not a completed public live-data launch.

A key product decision is to aggregate masked police reports into coarse, inspectable display areas, while separately inspecting pedestrian-involved crash locations. Neutral facility-type markers now use a reviewed directory of 61 public locations, with separate labels for current housing, former public housing, halfway houses and other residential reentry programs. The product exposes sources, approximate address positions, partial coverage and review deadlines; site type remains independent of route search and evidence totals. No user research findings or safety outcomes are claimed.


## Iteration: make the map and alternatives usable

Owner feedback on a real trip exposed three shortcomings: the provider returned one walk, a broad 680-report total offered no spatial choice, and a general grid did not match how people navigate blocks. The first iteration added nearby-street alternatives and inspectable squares. The current iteration replaces those squares with official SF Census 2020 block shapes and uses evidence to guide the search itself. This is owner feedback, not a completed user study.

The search probes around dark report blocks and crash clusters, then measures the actual returned walking lines. The fastest found path remains the reference. Selection seeks less dark-block overlap and fewer crash records as separate objectives, prefers reductions within the detour limit, and exposes when one measure improves while the other worsens. It does not force three options when none improve either measure.

On 998 Chestnut Street → 425 Mission Street, the latest test returned approximately 34, 37 and 39 minutes with 16, 15 and 14 mapped crashes in the 50 m corridor. All fit the five-minute allowance. None ran alongside a block meeting the fixed 30+ report threshold, so there was no dark-block reduction to claim. On 1 Market Street → City Hall, an option adding 3.36 minutes reduced dark-block overlap by about 136 m and mapped crashes from 34 to 29. These are integration examples using one historical snapshot, not a citywide success rate or evidence of reduced harm.

The geography decision also required new validation. Masked intersections can inform several adjacent blocks, so summing their counts would inflate report totals. An independent spatial implementation matched every block count for 3,642 six-month reports. It also exposed three invalid shapes in the official boundary source; the refresh now repairs and records them. Source authority does not remove the need to test data quality.

The trade-off is greater provider cost and more explanation in exchange for an actionable comparison. Next research must test whether people can distinguish a block's nearby reports from events inside that block, explain both route measures, recognize the 2020 boundary vintage, and avoid interpreting lighter/unshaded blocks as safe. No research outcomes or safety benefits are claimed.

## Iteration: count-first selections and a coverage correction

The owner asked to remove numbered block names, select several areas, and account for missing violent-crime categories. Review confirmed a real product gap: the initial map counted Assault and Robbery only. The next refresh added the source's Homicide, Rape and Sex Offense categories after code-crosswalk validation, while keeping a prominent warning that confidential/juvenile reports are withheld and homicide is undercounted. This is a correction to scope, not evidence that the source is comprehensive.

Selection now shows report counts and dates, with a server-side union to avoid counting shared intersections twice. In browser QA, two areas displaying 103 and 87 reports yielded 129 unique reports. This is an implementation check, not an impact metric. The suite has 69 passing tests; an independent spatial implementation matched all block counts for the refreshed six-month set of 3,719 mapped reports. Research still needs to test whether people distinguish reports, category memberships, official crime totals and actual risk.


## Expanding coverage without weakening the evidence standard

The owner requested the rest of SF and explicitly chose to include former public housing separately. A City portfolio query reconciled all 850 rows; an exact-program selection and reviewed historical conversions yielded 52 relevant rows and 51 unique locations after merging duplicate phases at one address. Seven additional residential reentry locations were verified. Seven programs in the City’s reentry catalog remain unmapped because a public residence address was unresolved, conflicting or absent. The product shows a partial directory with citywide browsing, category counts, source links and expiring reviews. This demonstrates a defensible scope decision: distinguish the completeness of a data download from the completeness and currency of the world it describes. These are implementation and audit results, not user-research findings or evidence of reduced harm.

## Iteration: everyday use after learning the evidence

Owner feedback asked for a focused map once users understood the disclosures, with saving and transfer to familiar navigation apps. The implemented design separates Map from About the data, uses collapsible controls, and preserves changing dates and missing-data states in the main workflow. Selecting a walk focuses its path and exposes validated provider steps. These are implemented changes based on owner feedback, not yet a validated usability improvement.

Provider review changed the persistence promise. Current Mapbox Navigation terms prohibit storage/export of route results, so live Save trip retains entered endpoints/stops and preferences and requires a fresh comparison when reopened. Fictional saved walks preserve their path. Apple/Google handoff sends endpoints and optional ordered stops entered by the user, with an explicit recalculation warning. This illustrates a PM decision: do not let a polished button promise continuity the product cannot deliver.

The next usability task is repeat use: plan a trip, inspect the evidence, select a route, save it, reopen it, and explain what will change after an external handoff. Measure task completion, time to find relevant context, and correct understanding of saved inputs versus exact paths. Include supported iPhone and Android handoff checks. Exact live-route storage remains a provider/architecture decision; no safety or adoption outcomes are claimed.
