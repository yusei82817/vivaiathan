const MODEL_URL =
  "https://files.innerscene.com/library/container-ship-loaded-5ee3b06d/a4a2ad31200969166550/container-ship-loaded.glb";

const ALLOWED_ORIGINS = new Set([
  "https://yusei82817.github.io",
  "https://vivaiathan.netlify.app",
]);

function corsHeaders(origin) {
  const headers = new Headers({
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, If-Range",
    "Access-Control-Expose-Headers":
      "Accept-Ranges, Content-Length, Content-Range, Content-Type",
  });

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export default async function shipProxy(request) {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response("Origin not allowed", {
      status: 403,
      headers,
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { ...Object.fromEntries(headers), "Allow": "GET, HEAD, OPTIONS" },
    });
  }

  try {
    const upstreamHeaders = new Headers();
    for (const name of ["range", "if-range"]) {
      const value = request.headers.get(name);
      if (value) upstreamHeaders.set(name, value);
    }

    const upstream = await fetch(MODEL_URL, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new Response(
        `Upstream model request failed: ${upstream.status}`,
        {
          status: upstream.status,
          headers,
        },
      );
    }

    const contentLength = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 20 * 1024 * 1024) {
      return new Response("Model exceeds the 20 MB streaming response limit", {
        status: 413,
        headers,
      });
    }

    for (const name of [
      "accept-ranges",
      "content-length",
      "content-range",
    ]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || "model/gltf-binary",
    );
    headers.set("Cache-Control", "public, max-age=3600");

    return new Response(
      request.method === "HEAD" ? null : upstream.body,
      {
        status: upstream.status,
        headers,
      },
    );
  } catch (error) {
    console.error("VIVAIATHAN ship proxy failed:", error);
    return new Response("Unable to retrieve the ship model", {
      status: 502,
      headers,
    });
  }
}
