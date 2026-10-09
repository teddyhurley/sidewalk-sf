# Where Sidewalk can get live data

**October 8 deployment update:** A disk-backed staged refresh scheduler is now implemented for the protected Render preview. The local staged refresh passes independent publisher reconciliation. Hosted execution and alert delivery remain unverified; historical references below to manual-only refresh describe the earlier local build. See [DEPLOYMENT.md](DEPLOYMENT.md).

Source documentation reviewed October 7–8, 2026. This is an integration plan, not a claim that these feeds are connected. The sample remains fictional; the local preview now connects Mapbox routing and validated historical police/crash snapshots. No public deployment or scheduled refresh is running.

## Recommended order

Connect daily police reports and reviewed injury-crash history first. Add 311 infrastructure requests next. Treat recent dispatch activity as a separate later pilot. Facility locations belong to a verified directory layer, independent of incident history and route comparisons.

| Layer | Official source | Published refresh | Intended use |
|---|---|---|---|
| Reported incidents | [SFPD reports, `wg3w-h783`](https://data.sf.gov/d/wg3w-h783) | Daily, scheduled by 10 a.m. Pacific | Six months of selected, relevant report categories; 3/6/12-month choices |
| Injury collisions | [SFDPH crashes, `ubvf-ztfx`](https://data.sf.gov/d/ubvf-ztfx) | Quarterly; approximately one month after quarter end | Longer pedestrian-involved collision context after category validation |
| Street/sidewalk issues | [SF311 cases, `vw6y-z8j6`](https://data.sf.gov/d/vw6y-z8j6) | Daily, approximately 10 a.m. | Dated requests for blocked sidewalks, curb issues and streetlights |
| Recent activity | [Dispatched calls, `gnap-fj3t`](https://data.sf.gov/d/gnap-fj3t) | Every 10 minutes plus an additional 10-minute delay | Separate recent-activity layer, never added to report counts |
| Public housing | [SFHA property list](https://sfha.org/housing-programs/public-housing), [HUD development point layer](https://egis.hud.gov/arcgis/rest/services/cpdmaps/pih/MapServer/0) | No freshness guarantee established | Cross-check current classification, public address and representative map position |
| Halfway houses | [BOP Residential Reentry Center directory](https://www.bop.gov/business/rrc_directory.jsp) | No refresh guarantee verified | Federal RRC subset; verify public address and current operation |

These are publisher schedules, not guarantees that every record has arrived. The latest event date, metadata edit date, ingestion date, and reporting coverage are different facts.

## What “live” can mean

**Police reports:** publication follows approval; records can later change or disappear. Use `incident_date` for the selected period, not `report_datetime`. Deduplicate code rows by report identifier and review supplemental-report treatment before aggregation. Public coordinates are anonymized intersections, so no claim can attribute a report to a particular building. [Official explanation](https://sfdigitalservices.gitbook.io/dataset-explainers/sfpd-incident-report-2018-to-present), [City publication schedule](https://catalog.data.gov/dataset/police-department-incident-reports-2018-to-present).

**Collisions:** quarterly injury data is historical context, not a current crash alert. Validate the pedestrian-involvement filter; avoid inflating crash totals by joining party/victim rows. Use the same verified period across alternatives. Proposed pilot default: 24 months ending at the latest reviewed release boundary; disclose lag and any changes to street design. This is a product choice requiring validation, not a statistically established optimum. [City metadata](https://catalog.data.gov/dataset/traffic-crashes-resulting-in-injury).

**311:** useful for possible route improvements, but multiple requests can concern one issue and some issues are never reported. Missing coordinates limit mapping. Display the request date and status; an open case does not prove an obstruction remains. Start with infrastructure categories, not generalized complaints about people. The City directs read-only users to its data portal; the former Open311 API is no longer supported. [Official explanation](https://sfdigitalservices.gitbook.io/dataset-explainers/311-cases).

**Dispatch:** the published real-time dataset covers a rolling 48 hours of open and closed calls. Calls can be unverified and may never become a police report. Locations are masked to intersections; sensitive fields are suppressed. Do not infer a hidden location, count the same activity as both a call and a report, or treat disappearance from this rolling feed as resolution. Display explicit status, timestamps and delay; expiration/staleness must suppress present-tense claims. The public feed is unsuitable for an emergency-monitoring promise. [Official explanation](https://sfdigitalservices.gitbook.io/dataset-explainers/law-enforcement-dispatched-calls-for-service).

## Connected facility directory — October 8, 2026

The local live app maps **61 source-reviewed public listings**: 2 current public-housing developments, 51 former-public-housing locations, 1 halfway house and 7 additional residential reentry programs. Former housing and reentry housing have separate labels and controls. Near-route filtering and citywide browsing are implemented. The fictional sample retains four invented examples; real listings are never attached to it.

The full [coverage register](FACILITY_COVERAGE.md) describes included sites, the 850-row City portfolio reconciliation, a merged duplicate, seven unresolved SFAPD program addresses and other exclusions. Exact sources and approximate positions are linked from every live pin. Publisher points are used for former housing and Cameo House; nine public addresses use Census interpolation. None is an entrance survey or footprint. Housing portfolio update: May 21, 2026. Sources checked: October 8, 2026. Review expires after January 6, 2027 unless deliberately renewed.

The [audit receipt](facility-validation.json) preserves the selected City records, row-to-pin mapping and public geocoding results. Former housing includes completed replacement phases at historic public-housing sites; it does not classify every current unit. Residential reentry programs are not automatically called halfway houses. Missing listings remain unknown; no full-city completeness claim is made. All categories are neutral and independent of route recommendations and crime/crash totals. No additional credentials are needed.

The HUD point service previously returned no SF matches; it was not used and that result is not evidence of no facilities. The new City source supplies representative points for this expansion. No temporary Mapbox geocodes or individual resident data are stored. Update the directory only after public-source and classification review; automatic refresh is not implemented.

## Time-window contract

The implemented demo defaults to six calendar months of incidents, with 3/6/12-month choices. Both endpoints are inclusive, anchored to its fixed fictional assessment date, October 7, 2026. Six months therefore displays April 7–October 7, 2026. Month-end cutoffs clamp to the last valid day. Collision history remains January 1, 2024–December 31, 2025. Departure time is still a planning note, not a time-of-day risk filter.

Changing the report period updates counts, map bands, details and export consistently. Missing coverage for part of that period yields unavailable report counts while retaining independently valid collision context. The “Only 3 months of incident coverage” scenario demonstrates this distinction.

In a real pilot, distinguish **fully retrieved publisher snapshot** from **complete reporting of all events**; the latter cannot be claimed. Display the requested event-date window, extraction success, source refresh, newest observed record and reporting-delay caveat. Never silently shorten a requested six-month window to whatever records arrived. If retrieval or geographic coverage fails, withhold that layer. Review reports from the full requested period on refresh so backdated additions, corrections and removals are handled.

Six months balances recency against sparse observations, but is a product hypothesis. Test whether users understand the date range, publication lag and how 3/12-month views change their interpretation. Do not compare raw totals from different-sized windows as a trend.

## Implementation requirements and production follow-up

1. **Acquire a bounded snapshot.** Use DataSF's public read APIs, stable pagination, explicit fields, event-date filters and schema checks. Validate endpoint versions and quotas at implementation time. Existing read-only SODA2 metadata/aggregate probes succeeded without a token for crashes, reports and HIN; new dispatch and 311 payloads have not been probed in this follow-up.
2. **Normalize and reconcile.** Keep source-native IDs; reject missing identity/geometry; deduplicate; reconcile deletions; count rejected rows. Validate report categories and crash taxonomy with sampled records and independent checks.
3. **Publish a quality manifest.** Store dataset ID, source link, extraction timestamp, source refresh, requested/loaded periods, pagination completion, categories, valid/missing geometry counts and transformation version. Gate each source independently. Never label a successful download “complete crime coverage.”
4. **Match reviewed context.** Keep real data server-side in a spatial index. Use a reviewed SF boundary and a tested geometry library/PostGIS. Validate intersection displacement before offering route-specific police bands; broaden or withhold context if route distinctions are unsupported. Existing 25/50/100 m demo thresholds are illustrative.
5. **Launch in stages.** Verify hand-reviewed routes and failure scenarios, test comprehension, then run a limited opt-in pilot. Refresh jobs would be a later deployment feature; none has been scheduled here. Keep dispatch out until status transitions, masking, expiry and failure behavior pass review.

**Current owner access:** Mapbox and Socrata tokens are saved and working for the local preview. A production host/origin is needed only before public live use. A Socrata app token is recommended for ingestion quotas, but no paid data subscription or personal account password was required for the existing public source audit. Facility coverage needs verified source work, not a credential. Details: [ACCESS.md](ACCESS.md).

The first three engineering steps now pass for the selected report/crash snapshots. Block attribution now uses a spatial index and official Census polygons; exact city-boundary clipping and broader production indexing remain improvements; human review remains a release gate. Adding a token alone does not connect real evidence or validate a route assessment.

## Local implementation update — October 7, 2026

The report/crash ingestion, quality gates, snapshot integrity, 3/6/12-month street-block context with geometric bypass choices and bounded evidence-guided alternatives and route-level historical crash counts now work locally. Publisher totals and a second geographic calculation match; see `VERIFICATION.md`. Refresh remains manual and source-specific stale policies still apply. Public launch awaits actual comprehension and domain reviews. The facility directory is connected separately; HIN, dispatch and 311 layers remain unconnected.

The October 8 block update bundles audited DataSF `e2st-aufe` geometry. Optional `npm run data:blocks` refreshes require Python with Shapely 2 (`BOUNDARY_PYTHON` selects its interpreter), reconcile all source rows, repair and record invalid polygon topology, and replace the file only on success. No new credentials are needed beyond the saved read-only Socrata token; normal app/demo startup needs only Node. Missing or invalid boundaries withhold the report map and report routing objective while independent crash context can remain available.
