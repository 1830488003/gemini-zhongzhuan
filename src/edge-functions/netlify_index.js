import { handleRequest } from "../handle_request.js";

// All CORS logic is now handled by netlify.toml,
// so this file can be very simple.
export default async (req, context) => {
  return handleRequest(req);
};

export const config = {
  path: "/*"
};
