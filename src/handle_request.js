import { handleOpenAIRequest } from "./openai_adapter.js";

export async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Route OpenAI compatible requests to the adapter
  if (pathname.startsWith('/v1/')) {
    return handleOpenAIRequest(request);
  }


  // The original proxy logic for direct Gemini requests.
  // This part of the code is less likely to be used now but is kept for completeness.
  const search = url.search;
  const targetUrl = `https://generativelanguage.googleapis.com${pathname}${search}`;

  try {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (key.trim().toLowerCase() === 'x-goog-api-key') {
        const apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
        if (apiKeys.length > 0) {
          const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
          headers.set('x-goog-api-key', selectedKey);
        }
      } else if (key.trim().toLowerCase() === 'content-type') {
        headers.set(key, value);
      }
    }

    return await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

  } catch (error) {
    console.error('Failed to fetch in original proxy:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
