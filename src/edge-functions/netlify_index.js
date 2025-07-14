import worker from "../worker.js";

// The new logic from the reference project handles CORS and OPTIONS requests internally.
// We can simply export its fetch method.
export default worker.fetch;

export const config = {
  path: "/v1/*"
};
