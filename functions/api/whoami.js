// GET /api/whoami
// Reports the Cloudflare Access identity for the current request, if any.

export async function onRequestGet(context) {
  const { request } = context;
  const email = request.headers.get("Cf-Access-Authenticated-User-Email") || null;
  return new Response(JSON.stringify({ email }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
