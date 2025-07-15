import worker from "../worker.js";

// The new logic from the reference project handles CORS and OPTIONS requests internally.
// We must wrap the export to correctly pass Netlify's `context.env` to the worker.
export default (request, context) => {
  return worker.fetch(request, context.env);
};

export const config = {
  path: "/*"
};
