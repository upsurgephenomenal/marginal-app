// Backs the /api/whoami route: reports the Cloudflare Access identity
// for the current request, if any.

export async function handleWhoami(request) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email") || null;
  return new Response(JSON.stringify({ email }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
