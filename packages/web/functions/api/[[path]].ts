// Cloudflare Pages Function: proxy all /api/* requests to the backend API.
// This keeps everything on the same origin (tabby.pages.dev) so session cookies
// work on iOS Safari, which blocks cross-site cookies from fetch() requests.
//
// Required env var in Cloudflare Pages dashboard: API_URL (e.g. https://tabby-api.onrender.com)

interface Env {
  API_URL: string;
}

// Headers that must not be forwarded to/from the upstream server
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

export const onRequest: (context: { request: Request; env: Env; params: Record<string, string | string[]> }) => Promise<Response> = async (context) => {
  const { request, env } = context;
  const apiBase = env.API_URL?.replace(/\/$/, '');

  if (!apiBase) {
    return new Response(JSON.stringify({ error: 'API_URL not configured' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, apiBase);

  // Forward request headers, stripping hop-by-hop
  const reqHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      reqHeaders.set(key, value);
    }
  });

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const upstream = await fetch(target.toString(), {
    method: request.method,
    headers: reqHeaders,
    ...(hasBody && { body: request.body }),
    redirect: 'manual',
  });

  // Forward response headers, stripping hop-by-hop
  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      resHeaders.append(key, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
};
