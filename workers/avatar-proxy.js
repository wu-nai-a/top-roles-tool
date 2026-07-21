/**
 * Cloudflare Worker avatar proxy for browser-side ZIP downloads.
 *
 * Environment variables:
 * - ALLOWED_IMAGE_HOSTS: comma-separated image host allowlist.
 * - ALLOWED_ORIGINS: comma-separated page origin allowlist, or "*" for public demos.
 * - MAX_BYTES: max image size in bytes, default 20971520.
 */

const DEFAULT_ALLOWED_IMAGE_HOSTS = "ttq-pub.oss-cn-beijing.aliyuncs.com";
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, request, env);
    }

    const pageUrl = new URL(request.url);
    const rawUrl = pageUrl.searchParams.get("url");
    if (!rawUrl) {
      return json({ error: "Missing url query parameter" }, 400, request, env);
    }

    let imageUrl;
    try {
      imageUrl = new URL(rawUrl);
    } catch (_) {
      return json({ error: "Invalid url query parameter" }, 400, request, env);
    }

    if (!["https:", "http:"].includes(imageUrl.protocol)) {
      return json({ error: "Unsupported image protocol" }, 400, request, env);
    }

    const allowedHosts = parseCsv(env.ALLOWED_IMAGE_HOSTS || DEFAULT_ALLOWED_IMAGE_HOSTS);
    if (!allowedHosts.includes(imageUrl.hostname)) {
      return json({ error: "Image host is not allowed" }, 403, request, env);
    }

    const upstream = await fetch(imageUrl.toString(), {
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.doubao.com/",
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });

    if (!upstream.ok) {
      return json({ error: `Upstream HTTP ${upstream.status}` }, upstream.status, request, env);
    }

    const contentType = upstream.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return json({ error: "Upstream response is not an image" }, 415, request, env);
    }

    const contentLength = Number(upstream.headers.get("Content-Length") || "0");
    const maxBytes = Number(env.MAX_BYTES || DEFAULT_MAX_BYTES);
    if (contentLength && contentLength > maxBytes) {
      return json({ error: "Image is too large" }, 413, request, env);
    }

    const headers = corsHeaders(request, env);
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=86400");
    const filename = imageUrl.pathname.split("/").pop() || "avatar";
    headers.set("Content-Disposition", `inline; filename="${safeHeaderValue(filename)}"`);

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  },
};

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const allowedOrigins = parseCsv(env.ALLOWED_ORIGINS || "*");
  const origin = request.headers.get("Origin") || "*";
  const allowOrigin = allowedOrigins.includes("*") || allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";
  return new Headers({
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  });
}

function json(payload, status, request, env) {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}

function safeHeaderValue(value) {
  return String(value).replace(/["\\\r\n]/g, "_");
}
