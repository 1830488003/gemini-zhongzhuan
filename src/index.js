import worker from "./worker.js";

export default {
  async fetch (req, env, context) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/v1/")) {
      return worker.fetch(req, env, context);
    }
    if (env.ASSETS) {
      // @ts-ignore
      return env.ASSETS.fetch(req);
    }
    return new Response("Not Found", { status: 404 });
  }
};
