import { handleOpenAIRequest } from "./openai_adapter.js";

export async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Route OpenAI compatible requests to the adapter
  if (pathname.startsWith('/v1/')) {
    return handleOpenAIRequest(request);
  }

  // Handle original proxy functionality
  const search = url.search;

  if (pathname === '/' || pathname === '/index.html') {
    return new Response('Proxy is Running! Now with OpenAI compatibility. More Details: https://github.com/tech-shrimp/gemini-balance-lite', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const targetUrl = `https://generativelanguage.googleapis.com${pathname}${search}`;

  try {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (key.trim().toLowerCase() === 'x-goog-api-key') {
        const apiKeys = value.split(',').map(k => k.trim()).filter(k => k);
        if (apiKeys.length > 0) {
          const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
          console.log(`Gemini Selected API Key: ${selectedKey}`);
          headers.set('x-goog-api-key', selectedKey);
        }
      } else {
        if (key.trim().toLowerCase() === 'content-type') {
          headers.set(key, value);
        }
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Referrer-Policy', 'no-referrer');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Failed to fetch:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
