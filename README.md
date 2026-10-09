# Sidewalk · San Francisco

**Understand the trade-offs along your walk.** An SF-first, mobile-friendly walking-route comparison that makes its evidence limits visible.

Sidewalk is a portfolio V1: a complete fictional-data workflow plus a verified local Mapbox routing adapter and a real-evidence pipeline under validation. **It does not determine whether a route is safe.** No safety score, probability of harm, neighborhood reputation, or demographic proxy is used.

The configured app opens in **Live routing** by default, with the address form expanded. No invented routes are displayed while the server connection is checked. **Fictional demo** remains an explicit option. A server without a Mapbox token displays the labeled sample with a setup notice; a failed connection shows an unavailable state. The standalone demo always stays fictional, including when served over HTTP.

## Deploy a protected preview

The owner-approved test preview is available at [sidewalk-sf.onrender.com](https://sidewalk-sf.onrender.com) with a password. Access instructions and verification limits are in the [deployment guide](docs/DEPLOYMENT.md). It is a small validation pilot; no public safety assurance or broad launch is implied.

The root [Render Blueprint](render.yaml) provisions one web service and a 1 GB evidence disk. It includes password protection, daily staged data refresh with publisher reconciliation, and automatic loading of validated snapshots. See the [deployment guide](docs/DEPLOYMENT.md) for cost, credentials, refresh behavior and remaining hosted checks. Creating the service incurs hosting charges; local use remains available.

## Run in one command

Requires Node.js 22 or newer. No dependency installation, account, or API key is needed for the demo.

```sh
npm start
```

Open <http://127.0.0.1:4173>. Or run `node server.mjs` directly. The static `dist/` directory can also be served at a website's root. Opening `dist/index.html` directly with `file://` will not load ES modules correctly. For a zero-server demo, run `npm run demo:offline` and open the generated `../sidewalk-demo.html` in your browser. It bundles the same tested modules and styles into one file; live routing stays unavailable.

```sh
npm test
npm run check
```

CI runs the same checks on pushes and pull requests. Provider tests use deterministic mocks, never paid live APIs.

## Try the story in 90 seconds

1. Start with the Ferry Building → 425 Mission Street sample. The 14-minute baseline has four fictional collision records in its 50 m corridor.
2. Inspect the 17-minute alternative: one fictional collision record, two fictional reports. The app describes the difference without declaring it safer.
3. Expand **Addresses & preferences** and set extra walking time to zero. The app withholds an alternative within that limit.
4. Open **About the data**, then the corridor sensitivity control; compare 25, 50, and 100 m counts.
5. In **About the data**, select “Incomplete evidence” or “Stale evidence” at the bottom. Numbers disappear rather than becoming zero.
6. Change incident history between 3, 6 and 12 months. The baseline has 1, 2 and 3 fictional reports respectively; its four collision records stay constant.
7. Try “Only 3 months of incident coverage.” A six-month report count is unavailable; switching to three months restores the available sample context.
8. On **Map**, expand **Map layers & selected areas**, toggle public housing / halfway houses, change their distance filter, and open a fictional facility detail. These labels never change the comparison.
9. Switch between light, dark, and system themes in the header. Optional saved walks and the dismissed introduction also persist on this device.

Evidence has its own visual language: **amber circles** for traffic collisions and **purple bands/badges** for reported crime incidents. Route lines use teal, blue and olive colors so evidence types are not confused with route identities. Purple bands show approximate sample route-section context, not event locations or danger zones. Public housing and halfway-house status are not used as danger proxies.

**Every route shape, duration, facility location, record, event date, and refresh date in the sample walk is invented.** Real addresses orient the prototype; route shapes are schematics, not verified street directions. The collision window is January 1, 2024–December 31, 2025. Incident history defaults to April 7–October 7, 2026 (six calendar months); selectable three- and twelve-month views use the same fixed fictional assessment date of October 7, 2026. The demo supports this address pair in either direction and rejects arbitrary inputs explicitly. It never silently maps an arbitrary address onto a sample route.

## What is implemented

| Capability | Status |
|---|---|
| Two addresses, reversal, optional departure note, detour limit | Working sample flow |
| Selectable map and route cards; collision/report context | Working with invented fixtures |
| Metric point-to-segment matching, per-route deduplication, date filters | Tested |
| Incomplete, stale, unavailable, single-route and no-difference behavior | Tested |
| Explicit corridor sensitivity, provenance, source dates, comparison export | Working sample flow |
| Map / About the data tabs; collapsible planning and route choices | Working; data windows and unavailable states remain visible on Map |
| Choose route and inspect walking instructions | Live provider steps follow the selected path in the current session; intermediate routing stops are labeled |
| Device-local saved walks | Live: entered addresses/stops, preferences and evidence dates only; sample: invented paths preserved |
| Apple / Google Maps handoff | Entered endpoints and up to three ordered stop addresses, walking mode, explicit recalculation warning; native-phone handoff still needs verification |
| Light/dark/system themes; preference persistence | Working |
| 3/6/12-month incident history; independent collision window; partial coverage | Working and tested |
| Public-housing / halfway-house layers; 50/150/300 m proximity and details | 61 reviewed live listings in four categories; partial coverage; fictional examples stay in sample mode |
| Geocoding candidates + explicit confirmation + walking alternatives | Verified locally with the saved token; mocked error contracts tested |
| Bounded evidence-guided search around dark report blocks and crash clusters | Up to three distinct provider-computed paths; duplicates and obvious loops rejected |
| Clickable street-block report shading; dates, categories and block bypass choices | Local real-data preview; fixed count bins, no risk ranking |
| Live Mapbox GL map, attribution, temporary provider results | Verified in the local browser in light/dark themes |
| SF source metadata/aggregate audit tool | Included; results and limits in docs |
| Real SF evidence attached to live routes | **Local preview enabled and mechanically validated**; human review and public release pending |

The app keeps routes ordered by walking duration. A sample callout identifies the first eligible alternative with fewer **fictional collision records**, not a risk ranking. Police reports remain separate. Departure time does not alter historical counts, daylight claims, or the provider request.

## Live routing setup

Copy `.env.example` to `.env`, set `MAPBOX_PUBLIC_TOKEN`, then run `npm start`. The token must begin with `pk.`; secret `sk.` tokens are rejected. Choose **Live routing**, enter street addresses, confirm both geocoding candidates, and compare the actual routes returned. With usable evidence, the app probes paths around the darkest report blocks and historical crash clusters, measures the actual returned paths, and selects distinct alternatives that reduce at least one of those two measures. It makes at most twelve additional walking requests; without evidence it checks up to six nearby streets when native alternatives are insufficient. The fastest found path stays as the reference, and within-budget improvements take priority. Changing the incident period, crash corridor or detour limit exposes an Update alternatives control. Every displayed path, duration and distance comes from Mapbox; via-street routes are labeled deliberate detours. Obvious loops and near-duplicates are rejected. Up to three distinct options are shown in walking-time order, including clearly labeled options beyond the detour budget. This is a bounded search, not a guarantee of every possible alternative. The app uses an approximate SF coordinate envelope, not a legal city boundary.

Mapbox Geocoding v6 handles addresses, not POI names. Temporary geocoding requires a Mapbox map and cannot be cached. The app keeps results in page memory, uses `Cache-Control: no-store`, and disables live-result export. It sends address queries and coordinates to Mapbox. The application has no analytics, location tracking, accounts, or request logging; infrastructure and provider logs are outside that promise.

The configured public token is returned to the browser because Mapbox GL needs it. Use a dedicated token and verify scopes, account billing, and allowed URL origins. **Server-side geocoding and Directions requests do not carry a browser referrer; URL-restricted tokens must be tested against this architecture.** If the restriction rejects the proxy, move those requests to the browser with the same public token, or configure the supported `MAPBOX_SERVER_TOKEN` as a dedicated public-scope server token without browser restrictions, separate from the GL token. Do not weaken a production token's restrictions blindly. See [access checklist](docs/ACCESS.md).

Live routing alone does not enable real evidence. Without a validated snapshot and the explicit local preview flag, cards say “Evidence unavailable · no assessment.” A missing dataset never becomes zero reports.

## Real evidence: local validation in progress

`npm run data:refresh` now implements bounded ordered retrieval, row/key reconciliation, before/after source-version checks, report deduplication, category validation, all-party pedestrian matching, excluded-location tallies, and an integrity-checked snapshot. It replaces a local snapshot only after all four source downloads complete; a download failure preserves the previous file. Normalization failures mark the affected source unusable. Snapshot data is ignored by Git and served only through filtered API output.

The full refresh now passes: 7,950 police code rows normalize to 7,292 unique selected reports, of which 7,269 have usable locations; 1,343 pedestrian party rows identify 1,284 crashes, of which 1,278 have usable locations. Independent publisher queries match both mapped totals exactly. Source windows and omissions are explicit; these totals are not all SF crimes or current hazards.

A second geographic calculation checked all 1,278 crash points against ten real walking lines: all 25/50/100 m corridor counts agreed. Maximum distance difference within 200 m was 0.4363 m. This validates calculation consistency, not true event location, field conditions or human risk. See [verification](docs/VERIFICATION.md).

To reproduce the data checks, set `SOCRATA_APP_TOKEN` in the ignored `.env`, run `npm run data:refresh`, then `npm run data:validate`. Inspect `docs/evidence-validation.json` and `docs/publisher-reconciliation.json`. Only after those checks pass, set `LIVE_EVIDENCE_PREVIEW=1` and restart the server for local testing. The checked workspace already has this flag enabled; the distributed example defaults to disabled. The source archive excludes snapshots and credentials.

The gated preview uses pedestrian-involved injury crashes from July 1, 2024–June 30, 2026. Reports use 3/6/12-calendar-month windows anchored to the snapshot date. **Real police context appears in official SF Census 2020 street-block polygons**, clipped to the shoreline. These generally follow streets; parks, water, rail boundaries and streets changed since 2020 can differ. Displayed blocks intersect the route-group bounds plus a 500 m margin. Mapped initial Assault, Robbery, Homicide, Rape and Sex Offense reports are included; police point coordinates and report identifiers stay on the server. A report is associated with every block containing its published point or within 35 m of it. Because SFPD locations are masked toward intersections, adjacent blocks can share reports: do not sum their counts or interpret them as incidents inside a building. Select multiple shaded areas to see a unique combined report count, dates and category breakdown. Count/date labels replace numbered block names. Shared reports are deduplicated on the server; available bypass routes must clear every selected shape by 50 m. This is a geometric comparison, not evidence of lower risk. Confidential and juvenile reports are withheld by the source; homicide is known to be undercounted, and rape/sexual-offense reports may also be absent. Other categories remain outside this selected scope. These are crime-report counts, not a complete inventory or official UCR violent-crime statistics. The map exposes the actual categories declared by the loaded snapshot.

Darker shading means more published reports (1–4, 5–14, 15–29, 30+), not a danger category. Empty map areas do not establish safety or reporting completeness. No police route incident counts, precise crime pins, or safety rankings are produced. A separate reviewed facility directory provides optional public-place pins; its coverage is partial. Retrieval completeness is separate from unknown reporting/publication completeness.

The bundled boundary file contains 5,950 supported polygons from 5,954 official rows. Three invalid source geometries were repaired with GEOS and recorded in the boundary audit. A second spatial implementation matched all block counts for 3,719 mapped six-month reports, with zero unmatched reports. The 97 automated tests include polygon holes, boundary uncertainty, separate routing objectives, settings contracts, hosting protection and validated refresh promotion. See [verification](docs/VERIFICATION.md).

For an optional boundary refresh, run `npm run data:blocks` with Python 3 and Shapely 2 available; `BOUNDARY_PYTHON` can select its interpreter. No Python is needed to run the bundled app or demo. The boundary asset contains geometry and identifiers only, without census demographic attributes.

Refreshes are manual. The enabled local preview requires a server restart after each refresh. No scheduled feed or public real-data pilot is running.

## Project map

```text
dist/                 Portable, buildless web app
  app.mjs             UI, state transitions, export, map rendering
  styles.css          Responsive light/dark design
  lib/geo.mjs         Metric projection and segment distance
  lib/analysis.mjs    Evidence gates and route comparison
  lib/demo.mjs        Explicitly fictional routes and records
  lib/theme.mjs       Theme preference rules
  lib/walk-plans.mjs  Validated save records and walking-app handoff links
  lib/report-areas.mjs Report bins and route/block relationships
  lib/block-geometry.mjs Polygon proximity, overlap and exact bypass checks
  lib/route-metrics.mjs Separate report-overlap and crash measures
  lib/facilities.mjs  Independent neutral facility proximity layer
server.mjs            Static server + bounded Mapbox adapters
lib/                  Ingestion, normalization, quality gates and bounded route search
assets/               Audited public Census block boundaries
scripts/              Source audit, evidence/boundary refresh and packaging checks
test/                 Geometry, evidence, API and theme tests
docs/                 Architecture, product decisions, audit, PM case study
```

## Read the reasoning

- [Architecture and trust boundaries](docs/ARCHITECTURE.md)
- [Product decisions and limitations](docs/PRODUCT.md)
- [Source audit and official references](docs/DATA_SOURCES.md)
- [Live-data sources, cadence and integration plan](docs/LIVE_DATA_PLAN.md)
- [PM case study](docs/CASE_STUDY.md)
- [Launch and validation plan](docs/VALIDATION.md)
- [Exact credentials and remaining access](docs/ACCESS.md)
- [Hosting choice and portfolio budget](docs/HOSTING.md)
- [Verification record](docs/VERIFICATION.md)

## Publish and continue

The standalone demo deploys as static files from `dist/`. The optional live adapter needs a Node host; the static hosted preview does not execute `server.mjs`. For a GitHub Pages *project* subpath, first convert root-relative assets to relative paths or use a custom domain at the root. Do not copy `.env`, tokens, local audit caches, or `.git` from the Sites checkout to a new public repository.

The launch plan separates a public fictional portfolio demonstration from a real-data pilot. Local live-token and map tests passed. No user interviews, measured adoption, or reduction in injury/crime are claimed. Public deployment is on hold until the owner’s local-validation gates are satisfied.

AI-assisted implementation and source research were used. The accompanying case study distinguishes implemented behavior, decisions, hypotheses, and work still needed. Code is MIT; third-party services and datasets have their own terms.


### Reviewed facility pins in live mode

The bundled partial directory contains **61 reviewed public locations**: 2 current public-housing developments, 51 former-public-housing locations, 1 halfway house and 7 other residential reentry programs. The latter categories have separate FH and RH markers and filters. After comparing live routes, open Housing & reentry locations below the map. Choose Near selected route (50/150/300 m) or Across San Francisco, then Fit shown locations on map. Compact teardrop pins shrink as you zoom out and reveal category initials as you zoom in; map zoom controls and keyboard/tap details remain available. Each pin/list entry exposes public sources, dates and location uncertainty. A walkthrough from **111 Taylor Street to 1300 Buchanan Street** shows current/former housing and residential reentry examples. Community/Reddit lead review did not establish additional current residence addresses; mailing and contact addresses remain excluded. See the [coverage and exclusions](docs/FACILITY_COVERAGE.md).

Source checks are dated October 8, 2026; listings expire after January 6, 2027 unless deliberately re-reviewed. No additional token is required. See [the source/review plan](docs/LIVE_DATA_PLAN.md) and [recorded validation](docs/facility-validation.json). Sample mode remains entirely fictional.

### Everyday use, saving and directions

**Map** keeps addresses/preferences, route choices, map layers and a selected-walk view together. **About the data** holds sources, methodology, detailed findings, limitations and sample edge cases. Exact evidence windows and missing/stale states stay on Map; dismissing the short introduction does not suppress them. Select **Use this route** to focus the map and see provider-authored walking steps. The app does not track your position or reroute.

**Save trip** stores only the live addresses and optional handoff stops you typed, preferences and public evidence review dates, locally in this browser. It does not save Mapbox geometry, geocodes, labels or directions. **Load trip** asks for a new address confirmation and comparison; the old route is not silently replaced. **Save sample walk** can preserve the fictional selected route. The Saved walks dialog opens and removes up to 20 records. These records do not sync across devices; browser storage can be cleared or disabled.

Apple/Google buttons hand off the entered endpoints and up to three ordered stop addresses in walking mode. They calculate their own route and may use streets avoided in Sidewalk. This is not exact-route export, and sample-mode handoff is disabled. The exact live path stays in memory only while the page is open. Mapbox's July 21, 2026 [Product Terms](https://www.mapbox.com/legal/product-terms), §2.10.1, prohibit storing/exporting Navigation API results. Permanent geocoding alone does not resolve that restriction. Exact live saved routes require provider permission or a separately reviewed routing provider. No additional token is needed for the currently implemented features.

Handoff adds a San Francisco city hint to typed addresses that do not already include SF or San Francisco. This uses static city context, not provider geocodes. Users must check the external app’s address matches.
