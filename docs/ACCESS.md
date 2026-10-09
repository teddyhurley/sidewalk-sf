# Exactly what is needed

**October 8 update:** [teddyhurley/sidewalk-sf](https://github.com/teddyhurley/sidewalk-sf) contains the complete public source, and GitHub's automated checks pass. Render recognizes the repository and Blueprint but requires a payment method before setup can continue. Paid activation, token transfer and hosted verification remain pending. See [DEPLOYMENT.md](DEPLOYMENT.md).

## To use the fictional demo

Nothing. It runs with Node 22+ or static hosting. No OpenAI key, Mapbox key, Socrata token, account, or uploaded location history is required.

## To verify live routing

1. A Mapbox account with Geocoding v6, Directions walking, and GL map usage enabled, including its billing/usage settings.
2. A dedicated **public `pk.` token** in the ignored local `.env` as `MAPBOX_PUBLIC_TOKEN`. Public read scopes for map styles/fonts are sufficient for the map; verify endpoint access in the account. Never send a password or secret/write-scoped token.
3. For production with URL-restricted browser tokens, a separate public server token in `MAPBOX_SERVER_TOKEN` for the geocoding/Directions proxy. Browser referrer restrictions do not apply cleanly to Node requests. Both credentials are public-scope `pk.` tokens; the server token stays server-side. Local verification can use one dedicated token if its restrictions permit both request types.
4. The intended production origin and Node hosting destination to configure token restrictions, rate limits, request-log retention, and secret/environment settings. The Sites preview hosts the static demo only.

Do not paste tokens into a public repository. Configure them locally or through the hosting provider’s environment settings. The browser token is necessarily visible to Mapbox GL. Configure usage alerts/limits and verify current prices before opening live access broadly.

## To connect real SF evidence

A Socrata application token in `SOCRATA_APP_TOKEN` is recommended for the separate source-audit/ingestion process. Public SODA2 metadata and aggregate queries worked without one during this build. Production quotas and newer SODA3 query requirements may differ. An application token is not a personal account password or a secret API-key pair.

**A token alone does not finish the real-data integration.** The ingestion pipeline and quality gates are now implemented. The complete refresh, publisher-total reconciliation, and computational real-record attribution checks now pass. Human domain/comprehension reviews in `VALIDATION.md` remain. The saved Socrata token is configured, and no additional credential is currently needed for the local preview. V1 intentionally cannot turn a token into an unreviewed safety assessment.

## Public GitHub project

The complete source is published at [teddyhurley/sidewalk-sf](https://github.com/teddyhurley/sidewalk-sf). The first complete source commit is `ca77ccd5e23df1c54b3ea5ec171296d6635cd755`; its published files matched the reviewed local source byte-for-byte. Credentials and raw evidence snapshots are excluded. Existing portfolio projects were not modified.

Repository creation used the authenticated GitHub browser; subsequent source publication used the GitHub connector. No personal access token was requested. The private Sites source repository is separate from the public GitHub portfolio.

## Selected hosting

Render is selected for this PM interview portfolio: a Hobby workspace, one small $7/month web service and a 1 GB persistent disk at $0.25/month, before taxes and usage. No paid service has been activated. The remaining owner action is to add a payment method in Render and approve activation and transfer of the existing Mapbox/Socrata tokens into Render. Deployment steps are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Model vs execution environment

Astra is a model; Work is a mode for carrying out tasks and producing deliverables. This build ran in the existing local Codex workspace. The source research subtask was explicitly launched with available `gpt-6-astra`. The active chat model was not switched; “Pro” reasoning and a change of the current chat’s execution mode were not verified or claimed. See [official Models](https://learn.chatgpt.com/docs/models?surface=app) and [Work guide](https://learn.chatgpt.com/docs/get-started-with-work).

## Recent activity and facility layers

DataSF dispatch and 311 are public dataset candidates, not purchased feeds or currently connected integrations. API/schema validation and a per-source quality pipeline remain necessary. 61 reviewed public facility locations are bundled for live mode, using SFHA/City housing classifications and public program/operator corroboration, with Census or City representative positions. No extra credential or paid geocoder was required. The directory is partial and requires manual source re-review within 90 days. No owner credential supplies complete facility coverage. See [live-data plan](LIVE_DATA_PLAN.md).

## Add the requested Socrata token

1. Sign into DataSF/Socrata and open the profile menu → Developer Settings → Create New App Token.
2. Use a unique name such as `teddyhurley-sidewalk-sf`; description: “Read public SF collision and incident data.” Choose App Token; this workflow does not need an API key/secret pair.
3. In the same ignored `.env` file as Mapbox, set `SOCRATA_APP_TOKEN=your_token_here`. Replace an existing empty line instead of creating duplicate keys. Save without sharing the token in chat.
4. Tell the collaborator “saved.” It can rerun the read-only refresh and inspect only redacted results. The current workspace has passed the mechanical checks and enables the local preview. Public deployment remains on hold.

[Official token creation instructions](https://support.socrata.com/hc/en-us/articles/210138558-Generating-App-Tokens-and-API-Keys).

## Saved trips and map-app handoff

No new credential is needed for tabs, local saved trip inputs, walking instructions or Apple/Google links with optional typed stops. Exact live route persistence/export is **not enabled**. The July 21, 2026 Mapbox Product Terms, §2.10.1, prohibit storing/exporting Navigation API results; a permanent-geocoding setting does not change Navigation rights. To enable exact saved live paths, obtain appropriate provider permission or choose and validate another routing provider. Nothing additional is needed from the owner to test the current local workflow.
