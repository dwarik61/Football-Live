const HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "content-type": "application/json; charset=utf-8"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS });

function parseJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function validHttps(value) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function fixtureId(match) {
  return `football-live:${match.id}`;
}

function matchTitle(match) {
  return `${match.homeTeam?.name || "Home"} vs ${match.awayTeam?.name || "Away"}`;
}

function matchDescription(match) {
  const score = match.score?.fullTime;
  const scoreText = score && score.home !== null && score.away !== null
    ? ` | Score: ${score.home}-${score.away}` : "";
  return [
    match.competition?.name || "Football",
    match.utcDate ? new Date(match.utcDate).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "",
    match.status || "SCHEDULED",
    scoreText
  ].filter(Boolean).join(" | ");
}

function parseMap(env, key) {
  const value = parseJson(env[key], {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function directStreams(env, matchId) {
  const map = parseMap(env, "MATCH_STREAMS_JSON");
  const entries = Array.isArray(map[String(matchId)]) ? map[String(matchId)] : [];
  return entries.filter((s) => {
    if (!s || typeof s.name !== "string" || typeof s.url !== "string" || !validHttps(s.url)) return false;
    return /\.(?:m3u8|mpd)(?:$|\?)/i.test(s.url);
  });
}

function totalSportekLink(env, matchId) {
  const map = parseMap(env, "TOTALSPORTEK_MATCH_URLS_JSON");
  const link = map[String(matchId)];
  return typeof link === "string" && validHttps(link) ? link : null;
}

async function getMatches(env) {
  if (!env.FOOTBALL_DATA_TOKEN) {
    return { matches: [], unavailable: "Add FOOTBALL_DATA_TOKEN to enable live fixtures." };
  }
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endpoint = new URL("https://api.football-data.org/v4/matches");
  endpoint.searchParams.set("dateFrom", from);
  endpoint.searchParams.set("dateTo", to);
  try {
    const response = await fetch(endpoint, {
      headers: { "X-Auth-Token": env.FOOTBALL_DATA_TOKEN }
    });
    if (!response.ok) {
      return { matches: [], unavailable: `Fixture provider returned HTTP ${response.status}.` };
    }
    const body = await response.json();
    return { matches: Array.isArray(body.matches) ? body.matches : [] };
  } catch {
    return { matches: [], unavailable: "Fixture provider could not be reached." };
  }
}

function metaFor(match, env) {
  const external = totalSportekLink(env, match.id);
  const links = external ? [{
    name: "TotalSportek match page",
    category: "website",
    url: external
  }] : [];
  return {
    id: fixtureId(match),
    type: "tv",
    name: matchTitle(match),
    description: matchDescription(match),
    poster: match.competition?.emblem || undefined,
    background: match.homeTeam?.crest || undefined,
    releaseInfo: match.competition?.name || "Football",
    links
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: HEADERS });
    const path = new URL(request.url).pathname;

    if (path === "/" || path === "/health") {
      const hasToken = Boolean(env.FOOTBALL_DATA_TOKEN);
      return json({
        name: "Football Live",
        status: "ok",
        fixtureProviderConfigured: hasToken,
        note: hasToken ? "Fixture provider configured." : "Fixtures are disabled until FOOTBALL_DATA_TOKEN is set."
      });
    }

    if (path === "/manifest.json") {
      return json({
        id: "community.dwarik61.football-live",
        version: "1.0.0",
        name: "Football Live",
        description: "Football fixtures with authorised direct streams and optional match-page links.",
        resources: ["catalog", "meta", "stream"],
        types: ["tv"],
        catalogs: [{ type: "tv", id: "football-live", name: "Football Live", extra: [{ name: "search", isRequired: false }] }],
        idPrefixes: ["football-live:"]
      });
    }

    if (/^\/catalog\/tv\/football-live(?:\/.*)?\.json$/.test(path)) {
      const { matches } = await getMatches(env);
      const metas = matches
        .filter((m) => m && m.id && m.homeTeam && m.awayTeam)
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
        .map((m) => metaFor(m, env));
      return json({ metas });
    }

    const metaMatch = path.match(/^\/meta\/tv\/(?:football-live:)?(\d+)\.json$/);
    if (metaMatch) {
      const { matches } = await getMatches(env);
      const match = matches.find((m) => String(m.id) === metaMatch[1]);
      return match ? json({ meta: metaFor(match, env) }) : json({ meta: null }, 404);
    }

    const streamMatch = path.match(/^\/stream\/tv\/(?:football-live:)?(\d+)\.json$/);
    if (streamMatch) {
      const id = streamMatch[1];
      const streams = directStreams(env, id).map((s) => ({
        name: s.name,
        title: s.title || s.name,
        url: s.url,
        ...(s.behaviorHints ? { behaviorHints: s.behaviorHints } : {})
      }));
      return json({ streams });
    }

    return json({ error: "Not found" }, 404);
  }
};
