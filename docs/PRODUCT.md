# Product decisions and limitations

## Product promise

Help an SF walker compare the time cost and documented historical context of available routes. The product does not certify conditions, predict harm, or tell users that an area is dangerous.

Initial target hypothesis: adults unfamiliar with a particular SF walk who already compare directions and would benefit from a clear explanation of trade-offs. This audience has not yet been validated. Neither visitor status nor any demographic is used to assign risk.

## Consequential decisions

| Decision | Alternative considered | Rationale and cost |
|---|---|---|
| Describe separate evidence types | One safety score | Counts lack exposure denominators and differ in coverage, meaning, and bias. Costs some apparent simplicity; preserves defensibility. |
| Search around dark report blocks and crash clusters | Accept one route or blend evidence into a safety score | Up to twelve waypoint probes seek separate, measured reductions on real provider paths. Keep the fastest reference; prefer improvements within the detour allowance; disclose either trade-off. This adds cost and is not exhaustive or a risk model. |
| Keep shortest-duration ordering | Re-rank by fewer reports | A count difference is not a causal improvement in risk. The UI can explain a difference without calling it the best route. |
| Gate real evidence separately | Overlay public points immediately | Dataset accessibility does not establish correct granularity, coverage, deduplication, or comparable periods. The local preview now passes mechanical checks; public launch still requires human review. |
| Clickable official street blocks with explicit proximity | Arbitrary squares, precise incident pins or a danger heatmap | Street-shaped areas are easier to relate to a walk. Masked report points inform adjacent blocks within 35 m; counts can repeat across blocks and do not locate incidents within premises. The 2020 boundaries and margins remain imperfect. |
| No precise police incident pins | Put every report on the map | Police locations are shifted and circumstances are missing. Exact dots imply unsupported precision and can stigmatize places. |
| Surface missing and stale states | Always produce a recommendation | “Insufficient information” is a valid product result. It may lower apparent engagement but avoids false confidence. |
| Use a fictional SF schematic | Present hand-drawn lines as actual routes | A reproducible no-credential demonstration alongside separately labeled live routing. Real addresses orient the sample, so fictional labeling appears prominently and in exports. |
| Departure is a planning note | Change concerns by hour or infer lighting | No validated hour-specific evidence or lighting coverage exists in V1. This is explicit next to the control. |
| Device-local saved trip inputs; exact live path stays in session | Persist live provider route geometry | Mapbox Navigation terms restrict storage/export. Save only typed endpoints/stops, preferences and evidence dates. Reopening explicitly requests a fresh comparison. Fictional routes can be preserved. No accounts or cloud location history. |
| Map and About the data tabs | Keep every disclosure in the primary flow | Reduce repeated reading while retaining windows and unavailable/stale states beside the map. Test comprehension rather than assuming disclosure placement is sufficient. |
| Apple/Google handoff with entered stops | Promise exact-route export | External map apps calculate their own route; provider outputs are not exported. Disclose this before handoff, including possible use of avoided streets. |
| Light, dark, and system themes | Single appearance | Support user preference while preserving provenance and map contrast. Dark mode does not imply nighttime evidence. |
| Amber traffic circles and purple report bands/badges | Reuse route colors for evidence or rely on color alone | Separate traffic collisions from reported crime incidents using labels and shapes in both themes. Route lines use their own stable teal/blue/olive identities. Broad fictional report bands identify screening matches, not exact event locations or danger zones. |
| Neutral facility directory layer | Facility danger labels or housing-based routing penalties | Optional current/former public-housing, halfway-house and reentry-housing markers answer a place-type question. They are isolated from incident/collision counts, ordering and recommendations. Sample locations are invented. Live mode has 61 source-reviewed listings, category filters and citywide browsing, with approximate Census or City representative positions, provenance and a 90-day review deadline; coverage is partial. |
| Six-month report default with 3/12-month alternatives | A single time window for all evidence | Recent reports and lagging collision history need different windows. Exact dates appear together, and changing the incident period never changes collision history. Missing incident coverage is unknown, not zero. Six months is a testable product hypothesis. |

## Scope shipped

One responsive route comparison workflow. Three fictional alternatives for a fixed sample pair, reversible inputs, detour control, optional departure note, separate findings, independent event-date windows, neutral fictional facility layers, evidence dates, sensitivity, and an export that retains fictional labels. Optional Mapbox address confirmation and walking routes are implemented behind credentials. The local preview also uses reconciled historical crash and police snapshots, with independent publisher-total and geographic calculation checks. Users can select several areas using count/date labels. A combined total deduplicates shared reports, and a bypass must clear all selected areas. The live map shows official Census block shapes with fixed count shading for six months by default, with 3/12-month options. Block details expose categories and available geometric bypasses, including walking-time cost and detour eligibility. Evidence-guided search selects options with less dark-block overlap and/or fewer mapped crashes; cards expose both differences. Changed search preferences require an explicit update, and no qualifying reduction is a valid result.

## Scope deliberately deferred

Public real-data launch; comprehensive facility inventory; optimal routing by hazards; streetlight status; sidewalk access; accessibility certification; hills/grade; current construction and closures; turn-by-turn live navigation; exact live-route persistence/export; live tracking; emergency alerts; accounts; reviews; accusations; nationwide support; prediction and causal claims. “No data” does not mean a user’s concern is invalid.

## Limitations to say out loud

- Injury crash datasets omit unreported events; crash injury severity does not necessarily identify an injured pedestrian without party/victim analysis.
- Police reports are not all crime, not all relevant to passersby, and may be corrected or removed. Reporting and enforcement differ across places and groups.
- Intersections and simplified centerlines cannot resolve sidewalk side, premises, or the exact location of an event.
- The same event may fall within several route corridors. Shared records are context, not independent outcomes.
- A longer route may naturally pass more records. Without pedestrian volumes and comparable exposure, neither raw counts nor counts/km estimate individual risk. V1 does not normalize counts into a misleading rate.
- Historical locations may have received street improvements. HIN is a planning layer, not a live warning feed.
- SF bounding-box geocoding is not an exact administrative clip. Provider routes can change and alternatives are not guaranteed.
- A static demo has no backend. Live integrations require a Node host and credentials; the current historical-data preview runs locally and is not publicly deployed.
- No field safety study, user research, accessibility certification, or effect on injuries/crime has been completed.

## Acceptance criteria

Users can identify the shorter route, explain the additional minutes of a detour, tell which evidence type changed, find the observation window, and recognize a fictional or insufficient-data state. The system never silently substitutes a route, mixes fixtures into live results, or renders unavailable coverage as zero. These technical criteria are tested; user comprehension remains to be measured.

## Updated data strategy

Start with daily SFPD reports and reviewed quarterly injury history, then 311 infrastructure requests. Evaluate the 48-hour dispatch feed as a separate recent-activity pilot, not a substitute for six-month reports. Facility coverage needs a verified directory and is never a risk input. Source cadence, access requirements and ingestion gates are in [LIVE_DATA_PLAN.md](LIVE_DATA_PLAN.md).

## Count-first selection and explicit crime scope

Owner feedback prioritized the number of reports and dates over invented block numbers. The interaction now supports several selected shapes, one deduplicated total, separate category counts and clear removal controls. Geometry remains useful for selection and route comparison, while internal IDs no longer appear as place names.

The initial two-category scope omitted Homicide, Rape and Sex Offense. These are now included where present in the reviewed public source. The source withholds confidential and juvenile reports and warns about homicide undercounts; other categories also remain outside the app's allowlist. Calling the displayed value “crime reports” communicates the counting unit without claiming to know the number of criminal events or all violent crimes. No weights are assigned by category or used to manufacture a safety rating.

## Map-first iteration and remaining export constraint

Map now supports collapsing addresses/preferences, route choices and layer controls, selecting a walk, viewing its instructions and saving a trip. Detailed evidence and methodology live in About the data. The first-use explanation is dismissible, but fictional/live labels, observation windows and data failures remain visible during ordinary use.

Live saves preserve planning inputs, not the selected route. This is an explicit product compromise imposed by current provider permissions; saved fictional routes demonstrate exact restoration separately. Apple/Google handoff is a convenience, not continuity of the selected path. Confirm on supported iOS/Android devices before promising a smooth native handoff. Research should test whether people understand this distinction and can find the methodology without rereading it on every trip.

The owner proposed stop addresses to better retain the chosen route in another app. The implemented handoff accepts up to three ordered stops, capped for mobile-browser compatibility. A checkpoint near a key turn may constrain recalculation more usefully than an evenly spaced midpoint, but this is not an exact-path guarantee. Stops currently come from user entry. Automatic extraction/reverse geocoding of Mapbox output is not a workaround for its export restriction. External routing can ignore stops or choose different streets between them; the UI asks users to verify matches and order. Handoff-only stops do not change the in-app comparison.
