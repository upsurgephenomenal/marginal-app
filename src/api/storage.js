// Backs the /api/storage route with a Cloudflare KV namespace bound as
// MARGINAL_KV. Personal data (shared=false) is namespaced under the
// Cloudflare Access-authenticated email, so each signed-in person only
// ever sees their own documents, drafts, and references. Shared data
// (shared=true) is visible to everyone who can reach the app.
//
// GET    /api/storage?key=foo&shared=false
// POST   /api/storage   { key, value, shared }
// DELETE /api/storage    { key, shared }

export async function handleStorage(request, env) {
  if (!env.MARGINAL_KV) {
    return json({ error: "MARGINAL_KV is not bound on this Worker. Add a KV namespace binding under the project's Bindings tab." }, 500);
  }

  const userEmail = request.headers.get("Cf-Access-Authenticated-User-Email") || "local-dev-user";
  const scopedKey = (key, shared) => (shared ? `shared:${key}` : `user:${userEmail}:${key}`);

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");
      const shared = url.searchParams.get("shared") === "true";
      if (!key) return json({ error: "key is required" }, 400);

      const value = await env.MARGINAL_KV.get(scopedKey(key, shared));
      if (value === null) return json({ error: "not found" }, 404);
      return json({ key, value, shared });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const { key, value, shared } = body;
      if (!key) return json({ error: "key is required" }, 400);
      if (typeof value !== "string") return json({ error: "value must be a string (stringify JSON client-side)" }, 400);

      await env.MARGINAL_KV.put(scopedKey(key, !!shared), value);
      return json({ key, value, shared: !!shared });
    }

    if (request.method === "DELETE") {
      const body = await request.json();
      const { key, shared } = body;
      if (!key) return json({ error: "key is required" }, 400);

      await env.MARGINAL_KV.delete(scopedKey(key, !!shared));
      return json({ key, deleted: true, shared: !!shared });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
