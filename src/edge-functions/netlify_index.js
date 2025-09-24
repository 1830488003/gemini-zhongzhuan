import worker from '../worker.js';

// The new logic from the reference project handles CORS and OPTIONS requests internally.
// We must wrap the export to correctly pass Netlify's `context.env` to the worker.
//
// By removing `async` and `await`, we return the promise immediately.
// This allows the Netlify runtime to handle the stream directly,
// bypassing the 60-second function execution timeout for the stream's duration.
export default (request, context) => {
  const url = new URL(request.url);

  // If the path starts with /v1/, it's an API request, handle it with the worker.
  // This ensures that requests from clients like SillyTavern are logged.
  if (url.pathname.startsWith('/v1/')) {
    // Pass the entire context object, not just context.env,
    // so the worker can access context.blobs for persistent logging.
    return worker.fetch(request, context);
  }

  // Otherwise, it's a request for a static asset (like the test page).
  // We pass it to the next handler in the chain, which is Netlify's static file server.
  return context.next();
};

export const config = {
  path: '/*',
};
