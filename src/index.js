import worker from "./worker.js";

export default {
  async fetch (req, env, context) {
    return worker.fetch(req, env, context);
  }
};
