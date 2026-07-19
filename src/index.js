import { handleClaude } from "./api/claude.js";
import { handleStorage } from "./api/storage.js";
import { handleWhoami } from "./api/whoami.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/claude" && request.method === "POST") {
      return handleClaude(request, env);
    }
    if (url.pathname === "/api/storage") {
      return handleStorage(request, env);
    }
    if (url.pathname === "/api/whoami" && request.method === "GET") {
      return handleWhoami(request);
    }

    // Anything else falls through to the static app itself
    // (index.html and friends), served from the assets binding.
    return env.ASSETS.fetch(request);
  },
};
