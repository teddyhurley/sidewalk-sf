# Reviewed housing and reentry directory

Source review: October 8, 2026. Re-review due January 6, 2027. **61 public-place listings; partial SF coverage.** There are 2 current public-housing listings, 51 former-public-housing listings, 1 halfway house and 7 other residential reentry programs. These are location counts, not counts of buildings, units, residents or incidents.

## Housing coverage and classification

[SFHA’s current Public Housing page](https://sfha.org/housing-programs/public-housing) lists Plaza East and North Beach Place. Mixed-program developments are not classified unit by unit. Planned conversions are not treated as completed conversions.

The [City’s MOHCD portfolio](https://data.sf.gov/d/pyxv-n29e) returned 850 unique development records, equal to the publisher count, with unchanged source-update metadata before and after retrieval. Publisher update: May 21, 2026. The audit selected 52 construction-complete former-housing records: 28 RAD, 15 HOPE SF, four individually reviewed HOPE VI and five SFHA scattered-site records. Classification history is cross-checked against the [SFHA 2024 annual plan, PDF pages 28–41](https://sfha.org/files/documents/Annual%20Plan%202024.pdf). Two Alice Griffith records share 2500 Arelious Walker Drive and effectively identical coordinates; they are combined into one pin, giving 51 former-housing listings. This category includes completed replacement phases at historic sites, and does not imply that every current unit was formerly public housing.

Only the relevant public-place fields are retained. Generic affordable housing, generic transitional housing and confidential residences are not automatically imported. City coordinates are representative marketing points. They do not outline a development or identify an entrance. Original buildings remaining within Sunnydale/Potrero and all separate buildings within large sites are not exhaustively represented.

## Reentry coverage and exclusions

All 13 transitional-housing program names in the [SFAPD February 2026 catalog](https://media.api.sf.gov/documents/Complete_SFAPD_Catalog_of_Reentry_Services_For_Website_-_2.25.2026.pdf) were reviewed. Six had a corroborated public residential address and were mapped: Drake / New Horizons, Minna, TRP Academy, Joseph McFee, CW Hotel and Billie Holiday. Cameo House is independently supported by [CJCJ’s current residential program page](https://www.cjcj.org/our-programs/cameo-house) and the City portfolio. Taylor Street Center retains the separate halfway-house label from federal/operator listings. Residential reentry is a broader category; it includes programs that also serve other populations. No inference about an individual’s history, health or behavior is made.

| Catalog program not mapped | Reason |
|---|---|
| FOF TAYA | Current catalog names the program but does not publish a verified residential address. |
| Leroy Looper Graduate Program | Older sources name Sharon Hotel / Sixth Street; the current operator page says Eddy and Larkin. No pin until the address conflict is resolved. Do not substitute Looper Residence at 875 Post. |
| Phatt Chance | Operator contact page provides a mailing address, not an explicitly identified residence. |
| Our House | Operator names Lower Haight but its footer is the organizational office; no verified public residence address. |
| Her House | No unambiguous public residential address verified in reviewed operator/current City sources. |
| Her House Expansion | Program verified, residence address not verified. |
| Senior Ex-Offender Program | Current catalog describes scattered residential sites without a public site-by-site directory; operator/service offices excluded. |

The RSN office and Westside page-footer address are excluded. Phatt Chance’s contact page explicitly gives a mailing address. Confidential shelters are excluded even when a broad City dataset supplies a point. Private homes, treatment centers without verified residential reentry classification, day-reporting offices and proposed projects are outside the current directory. There is no claim of a complete private or CDCR facility inventory.

## Community and Reddit lead review — October 8, 2026

Community directories and program partners were checked as address leads. This follow-up added **zero pins**: the directory remains 61 reviewed locations with seven catalog programs unmapped. Reddit searches did not produce a corroborated residence address. A community listing is useful for discovery, but is not automatically proof of a residential site or current operation. No private or confidential location is inferred.

| Lead | Finding and disposition |
|---|---|
| Phatt Chance / SF-GOSO | The community search listing repeats an address that the [operator explicitly labels as mailing](https://phattchance.org/contact-us/). Excluded as a residence. |
| Her House / Sister’s Circle | The [partner contact section](https://www.sisterscircle.net/partners.html) names 1153 Oak. [Westside’s contact page](https://www.westside-health.org/contact-us) uses it for organizational and case-management contact. Residential co-location remains unverified; no pin added. |
| Senior Ex-Offender Program / SF-GOSO | The [operator](https://www.bhpmss.org/senior-ex-offender-program) describes two homes but supplies service/contact addresses, without linking each home to a public address. No service hub is plotted as a residence. |
| FOF TAYA / Norma Hotel | [Local reporting from 2019](https://missionlocal.org/2019/11/twenty-three-beds-for-justice-involved-youth-slated-for-norma-hotel-at-23rd-and-mission/) and the 2022 City catalog are historical leads, not confirmation of the current FOF TAYA site. |
| Leroy Looper, Our House, Her House Expansion | Operator/partner descriptions did not resolve the earlier conflict or missing residence addresses. |

Two SF-GOSO pages were visible in search listings but failed direct retrieval with HTTP 502; they are recorded as leads, not fully retrieved source evidence. The [audit](facility-validation.json) retains source links and decisions. Resolving the remaining gaps requires a current public operator/City listing that explicitly identifies the residential site; simply finding a geocodable contact address does not resolve them.

## User experience and maintenance

After requesting live routes, open **Housing & reentry locations**. Each of PH, FH, HH and RH has its own toggle. **Near selected route** uses 50/150/300 m point-to-route distance; **Across San Francisco** displays the entire reviewed directory within the checked categories. **Fit shown locations on map** frames those pins. Map markers use compact teardrop pins that shrink as the live map zooms out. At street scale, their category initials appear; at overview scale, a small dot replaces the initials. Zoom controls are available on the map. Source dates, category and public source links are available from every marker and list entry. The scrollable list provides an accessible alternative when markers overlap. Positions and straight-line proximity do not establish entrances, access or walking distance.

Source-listed status is not a field inspection, live occupancy feed or confirmation of current admissions. Six newly geocoded public reentry addresses each matched one Census address-range response; full receipts are preserved in [facility-validation.json](facility-validation.json). Existing three Census matches are retained; Cameo and former-housing coordinates use the City portfolio. No temporary Mapbox geocodes are persisted. Review dates expire individually after no more than 90 days, and never advance just because the app restarts. All categories are independent of route search, evidence counts and detour eligibility.

To update: retrieve the publisher count and metadata; fetch only necessary fields in stable ID order; reconcile unique rows against the count and unchanged metadata; review classification/current operator and public address; merge records for the same site; record exclusions; verify positions; deliberately update review dates; run the tests and inspect the map. Do not blindly renew all records. This is a manual review workflow, not a background feed.

## Included listings

The linked source collection and detailed status note for each listing are in [sf-facilities-reviewed.json](../assets/sf-facilities-reviewed.json). [The audit](facility-validation.json) retains the City row-to-pin mapping and public address-match receipts.

| Category | Listing | Public address |
|---|---|---|
| Public housing | North Beach Place | 455 Bay Street, San Francisco, CA 94133 |
| Public housing | Plaza East Apartments | 1300 Buchanan Street, San Francisco, CA 94115 |
| Former public housing | 1101 Connecticut | 1101 Connecticut St, San Francisco, CA 94107 |
| Former public housing | 1491 Sunnydale Avenue (Casala aka Parcel Q) | 1491 Sunnydale Ave, San Francisco, CA 94134 |
| Former public housing | 1760 Bush | 1760 Bush St, San Francisco, CA 94109 |
| Former public housing | 1880 Pine | 1880 Pine St, San Francisco, CA 94109 |
| Former public housing | 227 Bay | 227 Bay St, San Francisco, CA 94133 |
| Former public housing | 25 Sanchez | 25 Sanchez St, San Francisco, CA 94114 |
| Former public housing | 255 Woodside | 255 Woodside Ave, San Francisco, CA 94131 |
| Former public housing | 2698 California | 2698 California St, San Francisco, CA 94115 |
| Former public housing | 290 Malosi (Sunnydale Block 6) | 290 Malosi St, San Francisco, CA 94134 |
| Former public housing | 345 Arguello | 345 Arguello Blvd, San Francisco, CA 94118 |
| Former public housing | 350 Ellis | 350 Ellis St, San Francisco, CA 94102 |
| Former public housing | 3850 18th | 3850 18th St, San Francisco, CA 94114 |
| Former public housing | 430 Turk | 430 Turk St, San Francisco, CA 94102 |
| Former public housing | 462 Duboce | 462 Duboce Ave, San Francisco, CA 94117 |
| Former public housing | 491 31st | 491 31st Ave, San Francisco, CA 94121 |
| Former public housing | 666 Ellis | 666 Ellis St, San Francisco, CA 94109 |
| Former public housing | 939-951 Eddy | 939 Eddy St, San Francisco, CA 94109 |
| Former public housing | 990 Pacific | 990 Pacific Ave, San Francisco, CA 94133 |
| Former public housing | Alemany | 951 Ellsworth St, San Francisco, CA 94110 |
| Former public housing | Alice Griffith Apartments Phase 4 | 2800 Arelious Walker Dr, San Francisco, CA 94124 |
| Former public housing | Alice Griffith Phase 1 | 2600 Arelious Walker Dr, San Francisco, CA 94124 |
| Former public housing | Alice Griffith Phase 2 | 2700 Arelious Walker Dr, San Francisco, CA 94124 |
| Former public housing | Alice Griffith — Phases 3A / 3B | 2500 Arelious Walker Dr, San Francisco, CA 94124 |
| Former public housing | Bernal Dwellings HOPE VI | 3138 Kamille Ct, San Francisco, CA 94110 |
| Former public housing | Clementina Towers | 320 & 330 Clementina St, San Francisco, CA 94103 |
| Former public housing | Eve Community Village (Potrero Block B) | 1108 Connecticut St, San Francisco, CA 94107 |
| Former public housing | Hayes Valley North  HOPE VI | 650 Linden St, San Francisco, CA 94102 |
| Former public housing | Hayes Valley South HOPE VI | 401 Rose St, San Francisco, CA 94102 |
| Former public housing | Holly Courts | 100 Appleton Ave, San Francisco, CA 94110 |
| Former public housing | Hunters Point East / West | 1068 Palou Ave, San Francisco, CA 94124 |
| Former public housing | Hunters View Phase 1 | 1101 Fairfax Ave, San Francisco, CA 94124 |
| Former public housing | Hunters View Phase 2A | 848 Fairfax Avenue, San Francisco, CA 94124 |
| Former public housing | Hunters View Phase 2B | 901 Fairfax Ave, San Francisco, CA 94124 |
| Former public housing | Hunters View Phase III | 201 West Point Rd, San Francisco, CA 94124 |
| Former public housing | Kennedy Towers (JFK Towers) | 2451 Sacramento St, San Francisco, CA 94115 |
| Former public housing | Mission Dolores | 1855 15th St, San Francisco, CA 94103 |
| Former public housing | Ping Yuen | 655, 711-795 and 895 Pacific Ave, San Francisco, CA 94133 |
| Former public housing | Ping Yuen North | 838 Pacific Ave, San Francisco, CA 94133 |
| Former public housing | Rachel Townsend Apartments | 1750 McAllister St, San Francisco, CA 94115 |
| Former public housing | Robert B. Pitts Apartments | 1150 Scott St, San Francisco, CA 94102 |
| Former public housing | Rosa Parks Apartments | 1251 Turk St, San Francisco, CA 94115 |
| Former public housing | SFHA Scattered Sites - Great Hwy | 2206 Great Highway, San Francisco, CA 94116 |
| Former public housing | SFHA Scattered Sites - Noe | 363 Noe St, San Francisco, CA 94114 |
| Former public housing | SFHA Scattered Sites - Noriega | 4101 Noriega St, San Francisco, CA 94122 |
| Former public housing | SFHA Scattered Sites - Randolph | 200 Randolph St, San Francisco, CA 94132 |
| Former public housing | SFHA Scattered Sites — Eddy | 1357-1371 Eddy St, San Francisco, CA 94115 |
| Former public housing | Sunnydale Block 3A | 1529 Sunnydale Ave, San Francisco, CA 94134 |
| Former public housing | Sunnydale Block 3B | 1533 Sunnydale Ave, San Francisco, CA 94134 |
| Former public housing | Valencia Gardens | 340-370 Valencia St, San Francisco, CA 94103 |
| Former public housing | Westbrook Apartments | 40 Harbor Rd, San Francisco, CA 94124 |
| Former public housing | Westside Courts | 2501 Sutter St, San Francisco, CA 94115 |
| Halfway house | Taylor Street Center | 111 Taylor Street, San Francisco, CA 94102 |
| Reentry housing | Billie Holiday Center | 93 6th St, San Francisco, CA 94103 |
| Reentry housing | CW Hotel — FOF Stabilization Housing | 917 Folsom St, San Francisco, CA 94107 |
| Reentry housing | Cameo House | 424 Guerrero St, San Francisco, CA 94110 |
| Reentry housing | Joseph McFee Center | 3550 Cesar Chavez St, San Francisco, CA 94110 |
| Reentry housing | New Horizons — Drake Hotel | 235 Eddy St, San Francisco, CA 94102 |
| Reentry housing | Positive Directions TRP Academy | 630 Geary St, San Francisco, CA 94102 |
| Reentry housing | The Minna Project | 509 Minna St, San Francisco, CA 94103 |
