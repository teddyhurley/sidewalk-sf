# SF walking-route V1: evidence and integration audit

Research access date: October 7, 2026, America/Los_Angeles (the task's date). Findings below distinguish published metadata, observed portal dates, and proposed product rules. The initial documentation audit did not retrieve API payloads. A subsequent read-only machine probe successfully retrieved metadata and aggregate queries for all three datasets. Its results below supersede schema-verification gaps in the initial notes; this still does not validate route assessments.

## Decision

V1 can credibly compare Mapbox walking alternatives by time/distance and show descriptive historical context from City records. It cannot establish personal safety, predict crime or collision risk, or support a safety score. Use no invented observations, victim counts, route metrics, or “safer route” claims. The rules below are product recommendations, not findings from a validated safety study.

## Verified source inventory

| Source | Correct identifier | Purpose |
|---|---|---|
| [Traffic Crashes Resulting in Injury](https://data.sf.gov/Public-Safety/Traffic-Crashes-Resulting-in-Injury/ubvf-ztfx/about_data) | `ubvf-ztfx` | One record per injury crash |
| [Parties Involved](https://data.sf.gov/d/8gtc-pjc6) | `8gtc-pjc6` | One record per involved party; join carefully |
| [Victims Involved](https://data.sf.gov/d/nwes-mmgh) | `nwes-mmgh` | Injury/victim detail; do not count joined rows as crashes |
| [Police Department Incident Reports: 2018 to Present](https://data.sf.gov/Public-Safety/Police-Department-Incident-Reports-2018-to-Present/wg3w-h783/data) | `wg3w-h783` | Report records, potentially several incident-code rows per report |
| [2024 High Injury Network](https://data.sf.gov/d/enwt-3u8m) | `enwt-3u8m` | Current verified HIN vintage; street segment data |
| [Map of 2024 HIN](https://data.sf.gov/Health-and-Social-Services/Map-of-2024-High-Injury-Network/je98-scwe) | `je98-scwe` | Map view, not the underlying dataset |
| [2022 HIN](https://data.sf.gov/d/8vtn-qytr) | `8vtn-qytr` | Historical vintage; do not label current |

DataSF has changed its canonical host from `data.sfgov.org` to `data.sf.gov`; the live portal says the change should not affect use. Existing links redirect.

### Injury crashes

The official metadata describes quarterly release, approximately one month after quarter end. Locations are on a simplified street centerline; complex intersections collapse to one point. Highway crashes are excluded. Modern injury records come from SFPD's Interim Collision System (2018 onward), not directly from SWITRS; pre-2013 injury records use SWITRS. The live portal displayed October 7, 2026 as both data and metadata last updated, while the federal catalog mirror displayed September 25. Neither establishes the most recent complete crash period. TransBASE's public website is retired and redirects to DataSF. Attribute TransBASE/SFDPH/SFPD and record extraction date. [Official metadata](https://data.sf.gov/Public-Safety/Traffic-Crashes-Resulting-in-Injury/ubvf-ztfx/about_data), [federal metadata mirror](https://catalog.data.gov/dataset/traffic-crashes-resulting-in-injury).

Verified schema: `unique_id` (row key), `case_id_pkey` (crash report key), `collision_datetime`, `collision_date`, `tb_latitude`, `tb_longitude`, `cnn_intrsctn_fkey`, `cnn_sgmt_fkey`. Additional published City GIS schema: `point`, `dph_col_grp`, `dph_col_grp_description`, `party1_type`, `party2_type`, `collision_severity`, `number_killed`, `number_injured`, `data_as_of`, `data_updated_at`, `data_loaded_at`. [City GIS copy and column descriptions](https://cdn.arcgis.com/home/item.html?id=a24788281a484e08bd662828b4e0718e).

Implementation recommendation: count distinct `case_id_pkey`; deduplicate raw loads by `unique_id`. Keep missing keys in a rejected-record tally instead of inventing identity. A pedestrian filter must be verified from distinct live category values or the party table; no exact pedestrian category encoding was verified in this audit. Do not rely only on the first two party columns for crashes involving more parties. Label “pedestrian-involved injury crashes” only after the filter has been validated. Injury crashes are not synonymous with injured pedestrians.

### Police reports

Verified fields: `row_id`, `incident_id`, `incident_number`, `incident_code`, `incident_category`, `incident_datetime`, `incident_date`, `report_datetime`, `report_type_code`, `report_type_description`, `filed_online`. A report can produce multiple rows for incident codes; `row_id` identifies a row, not an event. The publisher schedules daily updates by 10:00 Pacific after supervisory approval; reports may change or be removed. Locations are anonymized to nearby intersections. The portal warns that the intersection mapping differs before/after April 24, 2024. [Official dataset and schema](https://data.sf.gov/Public-Safety/Police-Department-Incident-Reports-2018-to-Present/wg3w-h783/data).

Implementation recommendation: deduplicate ingested rows by `row_id`; count distinct `incident_id` for “reports,” after explicit category/date filters, preserving the category list. Do not call this count distinct criminal events or victims. Refresh deletions as well as additions. Confirm current spatial fields in live metadata before integration; `latitude`/`longitude` appear in the City's historical schema notice, but this audit did not verify all current spatial columns. [City schema change notice](https://data.sfgov.org/api/views/xfre-2aqu/files/1938fceb-6c57-4063-841a-eff4b892b0bd?download=true&filename=20180416_Dataset_Change_Notice_-_Police_Incidents.pdf).

### High Injury Network

The verified current vintage is **2024 HIN**, underlying dataset `enwt-3u8m`, published March 23, 2026. It uses 2020–2024 severe/fatal injuries linked across police, hospital, and ambulance records. Metadata says the published dataset is static. It represents selected corridors, not a pedestrian-specific risk estimate, and cannot be recreated from public police crashes alone. Do not interpret absence from HIN as evidence that a street is safe. Geometry and current API field names still need payload/schema verification before computing overlap. [City metadata in federal catalog](https://catalog.data.gov/dataset/2024-high-injury-network), [official Vision Zero links](https://www.visionzerosf.org/maps-data/).

## Mapbox: feasible live routing and address entry

Use `GET https://api.mapbox.com/directions/v5/mapbox/walking/{lon},{lat};{lon},{lat}` with `alternatives=true&geometries=geojson&overview=full&steps=true&access_token=...`. Walking supports up to two alternatives but can return only one route. Directions accepts 2–25 coordinates; the documented maximum is 300 requests/minute. Use returned duration, distance, and geometry. Render only actual returned routes; handle `NoRoute`, invalid token, 403, 429 and network errors honestly. [Directions API](https://docs.mapbox.com/api/navigation/directions/).

For addresses/intersections, use `https://api.mapbox.com/search/geocode/v6/forward` with `q`, `country=us`, a SF bounding box, and a valid token; confirm the chosen result rather than silently selecting an ambiguous match. V6 does not include POIs; businesses/landmarks need Search Box or another separately verified provider. Temporary geocoding cannot be cached; permanent storage requires `permanent=true` plus a card on file or enterprise contract. Geocoding results must accompany a Mapbox map. Default limit is 1,000 requests/minute; autocomplete may bill every keystroke. [Geocoding API](https://docs.mapbox.com/api/search/geocoding/).

Credential ask: provide a dedicated **public Mapbox `pk` token**, allowing the application's actual preview/production origins, with public `styles:read` and `fonts:read` scopes for Mapbox GL JS. No secret/write-scoped token is required. Default public tokens cannot be URL-restricted; create a separate token. Verify Directions and Geocoding access under the account and monitor usage. Never put an `sk` token into client code. [Token management](https://docs.mapbox.com/accounts/guides/tokens/). Pricing is usage-based; do not promise a permanently free deployment. [Current pricing](https://www.mapbox.com/pricing).

## DataSF access and credentials

Use dataset-specific queries, not a full million-row police download from every browser. SODA2.1 remains supported. The newer SODA3 query endpoint requires authentication or app-token identification; public full export endpoints do not. For production ask for a **Socrata application token**, passed server-side as `X-App-Token`; a secret API-key pair or personal password is unnecessary for public data. [SODA3 announcement](https://support.socrata.com/hc/en-us/articles/34730618169623-Introducing-the-new-SODA3-API), [SODA3 endpoint guide](https://support.socrata.com/hc/en-us/articles/43491231777047-Using-the-SODA3-API), [application tokens](https://dev.socrata.com/docs/app-tokens).

Socrata's public pages describe limits inconsistently; avoid a numeric throughput promise. Implement bounded queries, complete pagination, retries/backoff for 429, and explicit failure states. A truncated page is not a complete count.

## Conservative deterministic rules for V1 (proposed)

1. Keep routing order from Mapbox or sort explicitly by returned walking duration. Historical counts never choose a winner or produce a safety rating.
2. Show source layers separately: injury crashes, selected police report categories, HIN. Never combine these into one score.
3. Fix and display a historical time window per source. Prefer completed calendar years for crash comparisons; show actual completeness checks, not today's date as coverage. For reports distinguish incident date from filing date.
4. If proximity is used, show the exact distance rule, e.g. “records mapped within 100 m of this route.” This is an application-selected buffer, not a validated danger radius. Report geodesic point-to-line distance, not distance to sampled route vertices. Count each source entity only once per route even if buffers overlap.
5. Shifted police points and centerline crashes cannot identify exact sidewalk sides or premises. Avoid precise incident pins, sensitive narratives, and assertions that a record happened on the route. Prefer aggregate context and named intersection/corridor explanations.
6. HIN overlap requires verified segment geometry, a documented tolerance for map alignment, and separate treatment of crossing versus following a corridor. Until validated, display the official layer without an overlap metric.
7. Maintain statuses `not connected`, `loading`, `available`, `partial`, `stale`, `unavailable`. Missing/failed/partial data must never become a zero. Store source/vintage, retrieved-at time, filters, complete-page status, rejected records and methodology version.
8. If showing a demonstration, label the entire experience as a demonstration and all invented examples as illustrative. Never mix illustrative and retrieved numbers in a seemingly live result.

## Practical release gate

Ready to implement: address entry, actual walking alternatives, accessible map/list views, source catalog and limitations, and explicit unavailable states. A connected-data release additionally needs credentials configured, one verified sample response per source, current schema/value validation, pagination and deduplication checks, completeness dates, geographic clipping, and tests that missing data cannot render as zero or influence ranking. No evidence here supports a safety/risk model.

## Subsequent machine verification — October 7, 2026 (Pacific)

The saved [aggregate and schema audit](source-audit-2026-10-07.json) records exact retrieval timestamps. Public SODA2 queries returned:

| Dataset | Rows at retrieval | Earliest / latest event date | Interpretation |
|---|---:|---|---|
| Injury crashes | 66,384 | Jan 1, 2005 / Aug 31, 2026 | Maximum event date is not a complete-period guarantee |
| SFPD reports | 1,069,860 | Jan 1, 2018 / Oct 5, 2026 | Rows are not distinct incidents or victims |
| 2024 HIN | 5,917 | Static vintage | Verify feature inclusion semantics before overlap metrics |

Verified current police spatial fields: `latitude`, `longitude`, `point`. Verified HIN geometry: `geom` (multiline), with `cnn_sgmt_pkey` and `full_street_name`. The crash category aggregate includes `Vehicle-Pedestrian`, `Bicycle-Pedestrian`, `Vehicle-Bicycle-Pedestrian`, and `Pedestrian Only or Pedestrian-Parked Car`, plus non-pedestrian and unknown classes. These exact values are available for a future explicit allowlist; the semantic completeness of that filter still requires source/party-table review. No raw police narratives were downloaded. No source counts were applied to a route.

The read-only tool can be rerun with `node --env-file-if-exists=.env scripts/audit-sources.mjs`. It verifies required fields and saves aggregate observations, but is not an ingestion pipeline, cache-completeness test, or a real-evidence activation mechanism.

## Follow-up: recent activity, infrastructure and facilities

Additional publisher documentation has been reviewed for the real-time dispatch feed `gnap-fj3t`, daily 311 cases `vw6y-z8j6`, SFHA program classifications and the BOP RRC directory. Their roles, cadence, limitations, official references and verification status are in [LIVE_DATA_PLAN.md](LIVE_DATA_PLAN.md). These new sources have not been ingested or connected to route results. The existing machine audit still covers only crashes, police reports and HIN.

The app now demonstrates distinct event-date windows: six months of reports by default (3/6/12 selectable) and a separate 24-month collision period. All dates and records shown in the demo remain invented. Public-housing and halfway-house example markers form an independent directory layer; their presence is never evidence of danger.

## Implemented ingestion, pending full live validation

The separate `scripts/ingest-evidence.mjs` pipeline now selects the 24-month crash event window July 1, 2024–June 30, 2026, and 12 months of initial Assault/Robbery report rows for later 3/6/12-month filtering. This longer collision window acknowledges sparse observations and publication lag; it does not establish completeness. Dates are explicit and can be deliberately reviewed/updated through CLI parameters.

Pedestrian inclusion joins the full [party dataset](https://data.sfgov.org/d/8gtc-pjc6), rather than relying on first/second-party fields or the crash-group label alone. Police categories are checked against the [incident-code crosswalk](https://data.sfgov.org/d/ci9u-8awy). The collision source uses simplified street-centerline coordinates; police locations are anonymized. Consequently, real police counts are coarse area context. The current live preview uses official Census block polygons and associates reports with blocks within 35 m of their masked published points. Adjacent blocks can share reports. Walking overlap alongside the darkest blocks is a descriptive search objective, while individual report counts are never attributed to a route or used to rank safety. The proximity and bypass margins are product choices, not source-validated danger or uncertainty boundaries.

See `ARCHITECTURE.md` for gates and `VERIFICATION.md` for completed checks. A full snapshot is enabled for local review only. Its mapped totals match independent publisher queries. The older aggregate audit above remains evidence only of schema/aggregate availability at its recorded time.


### Route and report-map iteration, October 8

[Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/) supports walking requests through multiple coordinates, but `alternatives=true` does not guarantee an alternate. The adapter now makes up to twelve evidence-guided waypoint requests (six generic probes without evidence); every displayed route remains a provider walking result. Mapbox does not support arbitrary custom walking avoidance polygons, so the adapter measures returned paths rather than assuming a probe avoided its target. SFPD's [official dataset explanation](https://sfdigitalservices.gitbook.io/dataset-explainers/sfpd-incident-report-2018-to-present) describes masked intersection placement and omissions. This motivates coarse aggregation and explicit limits; it does not validate a danger surface or certify that an area bypass is safer.

## Street-block boundary source — October 8, 2026

[DataSF Census 2020 blocks clipped to the shoreline, `e2st-aufe`](https://data.sf.gov/d/e2st-aufe) supplies block geometry, generally aligned to streets. Census boundaries can also follow water, rail and other features; a 2020 polygon does not establish current sidewalk layout. The refresh requests only `geoid20,multipolygon`, excluding all population and demographic attributes. The source metadata identifies the [PDDL dedication](https://opendatacommons.org/licenses/pddl/1.0/).

All 5,954 source rows reconciled. The supported SF envelope retains 5,950 and excludes four offshore rows. GEOIDs published without the initial zero are left-padded to fifteen digits. Three self-intersecting shapes were repaired with GEOS `make_valid`, preserving polygon parts; the manifest records IDs, reasons and area changes. All retained shapes validate. See `block-boundary-validation.json`.

Report attribution uses published-point containment or ≤35 m proximity to each block. This intentionally permits the same masked intersection report beside several blocks; counts must not be summed. An independent GEOS calculation matched every six-month block count across 3,642 mapped reports, with no unmatched records. See `block-attribution-validation.json`. The calculation validates the implementation, not incident location, comprehensive reporting or individual risk. Fixed 30+ darkness across unequal blocks is not an exposure-adjusted density measure.

## Expanded category audit — October 8, 2026

The previous Assault/Robbery-only snapshot has been replaced locally with five reviewed publisher categories: **Assault, Robbery, Homicide, Rape and Sex Offense**. Aggregate queries confirmed that each exists in the source and its incident-code crosswalk. The complete refresh retrieved 7,950 initial code rows for October 7, 2025–October 7, 2026, normalized to 7,292 distinct reports, with 7,269 mapped and 23 missing/invalid/outside-envelope locations. Taxonomy mismatches, rejected selected rows and conflicting entities were zero. Independent publisher mapped-entity counts matched exactly. This refresh also includes publisher revisions since the previous snapshot, so changes are not attributable solely to the added categories.

The selected six-month window has 3,719 mapped unique reports. Category membership overlaps: Assault 3,177; Robbery 660; Homicide 3; Rape 6; Sex Offense 34. These unusually small public homicide/rape counts must **not** be presented as SF crime totals. Full 3/6/12-month aggregate checks are in `report-category-validation.json`.

The [official DataSF explainer](https://sfdigitalservices.gitbook.io/dataset-explainers/sfpd-incident-report-2018-to-present) states that confidential and juvenile records are withheld and specifically warns that homicide reports are often confidential, causing undercounts. Missing sexual-offense reports cannot be reconstructed from another category or treated as absent events. The app carries this limitation next to the map and treats the categories as selected public report context, not exhaustive violent crime.

The [SFPD Crime Dashboard](https://www.sanfranciscopolice.org/stay-safe/crime-data/crime-dashboard) uses UCR definitions and a hierarchy rule; homicide represents victims while other measures represent incidents. Those aggregate statistics have different semantics and are not inserted into street-block totals. The app does not attempt to infer withheld locations. Additional categories such as weapons offenses, arson or kidnapping-coded miscellaneous reports remain outside the current explicit allowlist until their scope is separately reviewed.


## Reviewed public facility directory — October 8, 2026

Live mode now includes Plaza East Apartments and North Beach Place from SFHA’s current public-housing page, and Taylor Street Center from U.S. Probation/BOP listings with the operator’s August 6, 2026 property list as corroboration. Exact source links, public addresses, limits and refresh procedure are in [LIVE_DATA_PLAN.md](LIVE_DATA_PLAN.md). These are three reviewed listings, not a complete city directory or an inspection of current conditions.

All three public addresses matched once in the Census address geocoder using Public_AR_Current. Matched results, retrieval timestamps and benchmark identifiers are preserved in [facility-validation.json](facility-validation.json). Positions are interpolated along public address ranges; they are not building boundaries or verified entrances. The queried HUD development layer returned no SF matches and was not used for coordinates. Mapbox temporary address results were not retained.

Markers expose sources and review dates, expire after at most 90 days without re-review, and never influence report counts, route search or eligibility. The directory stores no individual resident data. Demo and live facility provenance are validated separately.


## Citywide facility expansion — October 8, 2026

This supersedes the three-entry directory described above. The directory now contains 61 reviewed locations with current public housing, former public housing, halfway houses and reentry housing separated. [MOHCD portfolio pyxv-n29e](https://data.sf.gov/d/pyxv-n29e): 850 rows, 850 unique development IDs, publisher count 850, unchanged rowsUpdatedAt before/after; source update May 21, 2026. Only 52 reviewed former-housing rows and Cameo House are retained in the audit; unrelated and confidential records are not bundled. One duplicate address is merged. SFHA’s annual plan corroborates conversions; current City/operator pages support the reentry categories. Six new Census address matches supplement the existing three. See [coverage, exclusions and per-site sources](FACILITY_COVERAGE.md) and [machine-readable audit](facility-validation.json). This is not a complete city or live occupancy feed.

## Saving and walking-app handoff — checked October 8, 2026

- [Mapbox current Product Terms](https://www.mapbox.com/legal/product-terms), July 21, 2026 edition: §2.10.1 prohibits exporting, downloading, caching or storing Navigation API request results; §2.7.2 restricts Temporary Geocodes. The older archived 2020 temporary-cache language is not used as the implementation contract. Consequently live route geometry, instructions and geocoding results remain in session; saved trips use entered inputs only. This is an implementation reading of published terms, not confirmation of a negotiated exception.
- [Google Maps URLs: directions](https://developers.google.com/maps/documentation/urls/get-started#directions): `api=1`, `origin`, `destination`, `travelmode=walking`. Google calculates the path. Its waypoint support has platform limits and cannot be treated as exact polyline preservation. The app sends no provider waypoints.
- [Apple unified Map URLs](https://developer.apple.com/documentation/mapkit/unified-map-urls): `/directions` with `source`, `destination`, `mode=walking`. New walking links require supported Maps versions (iOS 18.4+); browser/app behavior varies. Apple computes its own path. Native-device handoff has not been validated in this workspace.

Both links contain only entered endpoints and optional ordered stop addresses; they never send saved Mapbox output or evidence counts to either destination. They remain disabled for fictional walks. The selected live route's instructions are planning information in the current open page, without positioning or rerouting.

Handoff adds a San Francisco city hint to typed addresses that do not already include SF or San Francisco. This uses static city context, not provider geocodes. Users must check the external app’s address matches.

### Ordered-stop handoff follow-up

Google's Maps URLs documentation supports ordered `waypoints` with a mobile-browser maximum of three and nine on other supported surfaces; unsupported products may ignore them. The app consistently caps entered stops at three and explicitly sets walking mode. Apple's current unified URL reference lists repeated `waypoint` parameters with address/coordinate/place-name values, plus `mode=walking`; its introduction describes multistop walking URLs. Native-device behavior still needs verification. The older driving-only stop workflow is not taken as a guarantee for a new walking URL. No Mapbox results are converted into these stops.
