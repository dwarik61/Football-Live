# Football Live for Nuvio

A Cloudflare Worker addon using the Stremio addon protocol. It discovers football fixtures from football-data.org, can attach explicitly configured TotalSportek match-page links, and returns only authorised direct media URLs that you provide.

## Important limitations

- This project does **not** scrape TotalSportek, extract third-party player URLs, bypass access controls, or manufacture playable links.
- TotalSportek match links are optional and must be supplied as exact HTTPS URLs in `TOTALSPORTEK_MATCH_URLS_JSON`. They are displayed as metadata website links when the Nuvio client supports them; they are not direct video streams.
- Direct playback is offered only for HTTPS HLS `.m3u8` URLs you are authorised to use. The addon does not claim to validate that a provider's stream is currently online or that Nuvio supports every codec/DRM configuration.
- Fixture discovery requires a football-data.org API token. Their free plan has competition and request limits; check their current terms and coverage.
- With no configured authorised streams, match cards can appear but their Sources list will be empty. This is intentional: no fake streams.

## Deploy to the existing Cloudflare Worker

Connect the existing Worker `football-live` to this GitHub repository (`dwarik61/Football-Live`), production branch `main`. The repository includes `wrangler.toml`; deploy with:

```sh
npm install
npx wrangler deploy
```

Do not create a second Worker. The Worker name in `wrangler.toml` is already `football-live`.

## Worker variables

In Cloudflare → Workers & Pages → football-live → Settings → Variables and Secrets, add:

### 1. FOOTBALL_DATA_TOKEN (Secret)

Create an API token from football-data.org and store it as a secret named `FOOTBALL_DATA_TOKEN`. Without it, the addon returns an empty fixture catalogue.

### 2. MATCH_STREAMS_JSON (Variable)

JSON object keyed by football-data.org match ID. Add only direct HTTPS HLS URLs for streams you are authorised to distribute:

```json
{
  "123456": [
    {
      "name": "Official broadcaster",
      "title": "Home FC vs Away FC",
      "url": "https://media.example.org/live/channel/index.m3u8"
    }
  ]
}
```

The example URL is illustrative only and is not a real stream. Replace it with a verified, authorised provider URL. The worker filters for HTTPS URLs ending in `.m3u8`.

### 3. TOTALSPORTEK_MATCH_URLS_JSON (Variable, optional)

Map a fixture ID to its exact public match page URL, if you have verified that page:

```json
{
  "123456": "https://example.org/exact-match-page"
}
```

Do not put a homepage or guessed URL here and expect it to resolve to a particular match. This link opens the match page externally; it is not an in-player stream.

## Nuvio installation

After deployment, test:

- `https://football-live.dwarik61.workers.dev/health`
- `https://football-live.dwarik61.workers.dev/manifest.json`
- `https://football-live.dwarik61.workers.dev/catalog/tv/football-live.json`

Then add this manifest URL in Nuvio:

`https://football-live.dwarik61.workers.dev/manifest.json`

If Nuvio's addon UI accepts Stremio-compatible manifests, Football Live should appear in its TV/live catalogue. Exact display and external-link handling can vary by Nuvio version.

## Local development

```sh
npm install
npx wrangler dev
```
