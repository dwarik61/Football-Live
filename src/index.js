const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "content-type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

function getChannels(env) {
  try {
    const parsed = JSON.parse(env.CHANNELS_JSON || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item && typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.streamUrl === "string" &&
      /^https:\/\//i.test(item.streamUrl)
    );
  } catch {
    return [];
  }
}

function metaFor(channel) {
  return {
    id: channel.id,
    type: "tv",
    name: channel.name,
    poster: channel.logo || undefined,
    background: channel.background || undefined,
    description: channel.description || "Live football stream"
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    const channels = getChannels(env);

    if (path === "/" || path === "/health") {
      return json({ name: "Football Live", status: "ok", configuredSources: channels.length });
    }

    if (path === "/manifest.json") {
      return json({
        id: "community.dwarik61.football-live",
        version: "0.1.0",
        name: "Football Live",
        description: "Live football streams from sources you are authorised to use.",
        logo: "https://raw.githubusercontent.com/dwarik61/Football-Live/main/assets/logo.png",
        resources: ["catalog", "meta", "stream"],
        types: ["tv"],
        catalogs: [{ type: "tv", id: "football-live", name: "Football Live" }],
        idPrefixes: ["football-live:"]
      });
    }

    const catalogMatch = path.match(/^\/catalog\/tv\/football-live(?:\/.*)?\.json$/);
    if (catalogMatch) {
      return json({ metas: channels.map(metaFor) });
    }

    const metaMatch = path.match(/^\/meta\/tv\/(.+)\.json$/);
    if (metaMatch) {
      const id = metaMatch[1];
      const channel = channels.find((item) => item.id === id || `football-live:${item.id}` === id);
      return channel ? json({ meta: metaFor(channel) }) : json({ meta: null }, 404);
    }

    const streamMatch = path.match(/^\/stream\/tv\/(.+)\.json$/);
    if (streamMatch) {
      const id = streamMatch[1];
      const channel = channels.find((item) => item.id === id || `football-live:${item.id}` === id);
      if (!channel) return json({ streams: [] });
      return json({
        streams: [{
          name: channel.sourceName || "Football Live",
          title: channel.streamTitle || channel.name,
          url: channel.streamUrl,
          behaviorHints: channel.notWebReady ? { notWebReady: true } : undefined
        }]
      });
    }

    return json({ error: "Not found" }, 404);
  }
};
