import { handleRequest } from "../handle_request.js";

// This is the authoritative CORS handler.
// It ensures all responses sent back to the browser have the correct headers.
export default async (req, context) => {
  // 1. Handle preflight (OPTIONS) requests immediately.
  // This is crucial for the browser to allow the actual request.
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No Content
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // Cache preflight response for 1 day
      },
    });
  }

  // 2. For actual requests (GET, POST, etc.), get the response from the app logic.
  const response = await handleRequest(req);

  // 3. Clone the response to safely add the CORS headers to it.
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Also good to have on actual response
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

export const config = {
  path: "/*"
};
