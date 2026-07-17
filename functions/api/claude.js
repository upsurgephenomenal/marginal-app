// POST /api/claude
// Proxies chat requests to Cloudflare Workers AI (env.AI), Cloudflare's
// own hosted open-source models. This runs on Cloudflare's free daily
// Neuron allocation — no external API key, no billing account, and no
// credit card required anywhere in this stack.
//
// Expects JSON body: { system, messages, max_tokens }
// Returns a response shaped like { content: [{ type: "text", text }] }
// so the frontend doesn't need to know which model is behind this.

// Swap this for a smaller model (e.g. "@cf/meta/llama-3.1-8b-instruct")
// if you're hitting the daily free Neuron cap and want more calls/day
// at the cost of some quality.
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AI) {
    return json({ error: "Workers AI binding (AI) is not configured on this Pages project. Add it under Settings > Functions > AI bindings." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { system, messages, max_tokens } = body;
  if (!messages) {
    return json({ error: "messages is required" }, 400);
  }

  const chatMessages = [];
  if (system) chatMessages.push({ role: "system", content: system });
  for (const m of messages) {
    chatMessages.push({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    });
  }

  try {
    const result = await env.AI.run(MODEL, {
      messages: chatMessages,
      max_tokens: max_tokens || 1000,
    });
    const text = result && result.response ? result.response : JSON.stringify(result);
    return json({ content: [{ type: "text", text }] });
  } catch (e) {
    return json({ error: "Workers AI request failed: " + e.message }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

