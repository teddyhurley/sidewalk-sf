# Hosting decision for the PM portfolio

**October 8 update:** The complete [public GitHub source](https://github.com/teddyhurley/sidewalk-sf) is published and automated checks pass. Following owner approval of recurring cost and token transfer, the [protected Render preview](https://sidewalk-sf.onrender.com) is active. Render confirmed $7/month compute plus $0.25/month disk before tax and additional usage. The first hosted source refresh, password gate and live comparison passed. See [DEPLOYMENT.md](DEPLOYMENT.md) for access and operating details. Broad public-app launch remains subject to the validation gates.

## Historical decision record — October 7

The following records the earlier selection and pause; the October 8 status above supersedes its repository, publication and storage assumptions.

Decision recorded October 7, 2026. The owner confirmed `teddyhurley/sidewalk-sf` as the desired public repository and asked that hosting be chosen for PM interviews. This is a selected deployment approach, not a purchased service or a completed deployment. No budget authorization has been recorded.

**Publication on hold:** the owner subsequently prioritized local demo testing and verification of the real data feeds before going online. Keep the project local while completing the evidence-readiness and product-validation gates below. No repository or hosting service was created during the follow-up. Hosting remains a later step.

## Selected approach

Use Render's free **Hobby workspace** with one **$7/month web service** (0.5 CPU, 512 MB; current plan identifier `0.5c-512mb`). The existing Node server can host the interface and routing endpoints together. Paid compute avoids idle spin-down. Retain the standalone fictional demo as an independent fallback.

The live Render pricing page was checked in the browser because its searchable text omitted the compute table. It lists the Hobby workspace at $0 plus compute, the selected service at $7/month, 5 GB/month of workspace bandwidth and 500 standard build minutes. Additional usage is billed separately. Sources: [pricing](https://render.com/pricing), [billing and paid-service behavior](https://render.com/docs/faq).

Render's free web service remains useful during development, but it sleeps after 15 minutes of inactivity and can take approximately one minute to restart. For an interviewer opening the app without warning, avoiding that delay is the strongest reason to pay. Free static hosting can serve the fictional demo without needing a running backend. [Free-service limits](https://render.com/docs/free).

## Initial cost expectations

| Item | Initial expectation | Limits |
|---|---|---|
| Render Hobby workspace | $0/month | Compute and usage charges are separate |
| One small Render web service | $7/month base | Taxes and usage beyond included allowances may add cost |
| Mapbox | $0 at modest interview/demo traffic | Current free allowances: 50,000 web map loads, 100,000 temporary geocoding requests and 100,000 Directions requests per month; usage is account-wide |
| Public SF source access | No purchased data feed planned | Token quotas and source availability still require monitoring |
| Custom domain | Deferred | Use the included hosting address initially |
| Persistent database / refresh workers | Deferred | Price separately when the reviewed evidence pipeline's storage and refresh requirements are known |

Mapbox's current allowances are from its [pricing page](https://www.mapbox.com/pricing). $0 is an expectation based on light use, not a guaranteed billing cap. A $10–15 monthly planning budget is reasonable for the initial routing demo; it is not an enforced spending limit and does not quote a complete future data platform.

## Interview value

Prioritize a responsive public demo, clear source dates, defensible route trade-offs, graceful failure behavior, user-comprehension findings and an accurate PM case study. A paid server primarily improves readiness when the app is opened. More compute should be added only for measured load or a defined data-processing need.

The portfolio story should distinguish the shipped fictional workflow, verified live routing, remaining real-evidence validation and actual research findings. No higher hosting tier establishes data quality or pedestrian safety.

## Before deployment

- Create/access the selected public GitHub repository. The connector lookup returned not found or inaccessible during this check; repository creation was not completed.
- Connect a Render account to GitHub. Use the Hobby workspace; the $25/month Pro workspace is unnecessary for this initial project.
- Configure the selected web service only after its cost is accepted. No paid service has been activated here.
- Bind the app to `0.0.0.0` using Render's assigned `PORT`; keep the start command appropriate for Node 22+.
- Set Mapbox environment variables in Render, verify production token restrictions and usage notifications, and keep the local `.env` out of Git and archives.
- Validate the hosted interface, real routing, provider errors and fictional/live separation.
- Price durable evidence storage and refresh jobs when their implementation is concrete. No recurring jobs have been scheduled.
