# Football Live for Nuvio

A Stremio-protocol live-TV addon for Nuvio on Android TV and Android mobile.

## Current status

The source code is committed, but the addon is **not deployed yet**. There is no working public manifest URL yet. It does not scrape TotalSportek or extract third-party player URLs. It only returns direct HTTPS HLS/DASH URLs that you are authorised to use.

## Deploy using Cloudflare Workers

1. Create a free Cloudflare account and open **Workers & Pages**.
2. Create a Worker named `football-live-nuvio-addon`.
3. Deploy this repository using Wrangler, or connect this GitHub repository in the Cloudflare dashboard.
4. Set the Worker variable `CHANNELS_JSON` to a JSON array of authorised streams. Example:

```json
[
  {
    "id": "match-001",
    "name": "Example FC vs Sample United",
    "description": "Example live match",
    "streamUrl": "https://YOUR-AUTHORISED-HOST/example/index.m3u8",
    "sourceName": "Official stream"
  }
]
```

Replace the example values with actual fixture details and direct media URLs supplied by a rights-holder or authorised provider. A webpage URL is not a playable stream URL.

5. After deployment, test `https://YOUR-WORKER.workers.dev/health` and `https://YOUR-WORKER.workers.dev/manifest.json`.
6. Paste the manifest URL into Nuvio's Addons section.

## Routes

- `/manifest.json`
- `/catalog/tv/football-live.json`
- `/meta/tv/{id}.json`
- `/stream/tv/{id}.json`

The catalog remains empty until `CHANNELS_JSON` contains authorised stream entries. This avoids fake matches or non-playable links.

## Local development

```bash
npm install
npx wrangler dev
```
