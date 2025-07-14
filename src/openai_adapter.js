// src/openai_adapter.js

const GEMINI_API_HOST = "generativelanguage.googleapis.com";

async function handleOpenAIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    if (pathname === '/v1/models') {
      return await handleModelsRequest(request);
    }

    if (pathname === '/v1/chat/completions') {
      return await handleChatCompletionsRequest(request);
    }

    return new Response(JSON.stringify({ error: { message: "Not Found", type: "invalid_request_error" } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error("Critical error in handleOpenAIRequest:", e);
    return new Response(JSON.stringify({
      error: {
        message: `An internal error occurred in the proxy: ${e.message}`,
        type: 'proxy_error'
      }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleModelsRequest(request) {
  const apiKey = request.headers.get('authorization')?.split(' ')?.[1];
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: "Authorization header is missing", type: "auth_error" } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const geminiUrl = `https://${GEMINI_API_HOST}/v1beta/models`;
  const geminiHeaders = new Headers({ 'x-goog-api-key': apiKey });

  const geminiResponse = await fetch(geminiUrl, { headers: geminiHeaders });
  if (!geminiResponse.ok) {
    const errorBody = await geminiResponse.text();
    console.error("Failed to fetch models from Google:", errorBody);
    return new Response(errorBody, { status: geminiResponse.status, headers: { 'Content-Type': 'application/json' } });
  }

  const geminiJson = await geminiResponse.json();
  const openaiModels = geminiJson.models
    .filter(model => model.supportedGenerationMethods.includes('generateContent'))
    .map(model => ({
      id: model.name.replace("models/", ""),
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'google',
    }));

  return new Response(JSON.stringify({ object: 'list', data: openaiModels }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleChatCompletionsRequest(request) {
  const requestBody = await request.json();
  const model = requestBody.model;

  if (!model) {
    return new Response(JSON.stringify({ error: { message: "Model not specified in the request body", type: "invalid_request_error" } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const geminiUrl = `https://${GEMINI_API_HOST}/v1beta/models/${model}:${requestBody.stream ? 'streamGenerateContent' : 'generateContent'}`;
  const geminiRequestBody = convertRequestToGemini(requestBody);
  const apiKey = request.headers.get('authorization')?.split(' ')?.[1];

  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: "Authorization header is missing", type: "auth_error" } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const geminiHeaders = new Headers({
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  });

  const geminiResponse = await fetch(geminiUrl, {
    method: 'POST',
    headers: geminiHeaders,
    body: JSON.stringify(geminiRequestBody),
  });

  if (requestBody.stream) {
    // For streaming, we can't easily add headers later, so the main handler will do it.
    // The TransformStream is passed back up.
    const { readable, writable } = new TransformStream();
    streamGeminiToOpenAI(geminiResponse.body, writable, model);
    // Note: The main handler will wrap this in a new Response with CORS headers.
    // This is a conceptual simplification; in reality, the headers are added to the *final* response.
    // For edge functions, returning a ReadableStream directly is fine, headers are added by the wrapper.
    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } else {
    const geminiJson = await geminiResponse.json();
    const openaiJson = convertResponseToOpenAI(geminiJson, model);
    return new Response(JSON.stringify(openaiJson), {
      status: 200, // Always return 200 OK, as the error is in the JSON body
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function convertRequestToGemini(openaiRequest) {
  const geminiRequest = { contents: [], generationConfig: {} };
  for (const message of openaiRequest.messages) {
    if (message.role === 'user') {
      geminiRequest.contents.push({ role: 'user', parts: [{ text: message.content }] });
    } else if (message.role === 'assistant') {
      geminiRequest.contents.push({ role: 'model', parts: [{ text: message.content }] });
    }
  }
  if (openaiRequest.max_tokens) geminiRequest.generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  if (openaiRequest.temperature) geminiRequest.generationConfig.temperature = openaiRequest.temperature;
  if (openaiRequest.top_p) geminiRequest.generationConfig.topP = openaiRequest.top_p;
  return geminiRequest;
}

function convertResponseToOpenAI(geminiResponse, model) {
  const now = Math.floor(Date.now() / 1000);
  if (geminiResponse.error) {
    return createErrorResponse(geminiResponse.error.message, model, 'gemini_api_error');
  }

  const promptFeedback = geminiResponse.promptFeedback;
  if (promptFeedback?.blockReason) {
    return createErrorResponse(`[PROMPT BLOCKED] Reason: ${promptFeedback.blockReason}`, model, 'content_filter');
  }

  const choice = geminiResponse.candidates?.[0];
  if (!choice) {
    return createErrorResponse('An unknown error occurred: No candidates in response.', model, 'unknown_error');
  }

  let messageContent = '';
  let finishReason = choice.finishReason || 'stop';

  if (choice.content?.parts?.[0]?.text) {
    messageContent = choice.content.parts[0].text;
  } else if (finishReason === 'SAFETY') {
    messageContent = `[RESPONSE BLOCKED] The response was blocked by Google's safety filters.`;
  } else if (finishReason === 'RECITATION') {
    messageContent = `[RESPONSE BLOCKED] The response was blocked due to recitation policy.`;
  }

  return {
    id: `chatcmpl-${now}`,
    object: 'chat.completion',
    created: now,
    model: model,
    choices: [{ index: 0, message: { role: 'assistant', content: messageContent }, finish_reason: finishReason }],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0,
    },
  };
}

function createErrorResponse(message, model, finishReason) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `chatcmpl-${now}`,
    object: 'chat.completion',
    created: now,
    model: model,
    choices: [{ index: 0, message: { role: 'assistant', content: message }, finish_reason: finishReason }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

async function streamGeminiToOpenAI(geminiStream, writable, model) {
  const reader = geminiStream.getReader();
  const writer = writable.getWriter();
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        writer.write(textEncoder.encode('data: [DONE]\n\n'));
        break;
      }
      buffer += textDecoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const geminiChunk = JSON.parse(line.substring(6));
            const openaiChunk = convertStreamChunkToOpenAI(geminiChunk, model);
            if (openaiChunk) {
              writer.write(textEncoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            }
          } catch (e) {
            console.error("Error parsing stream chunk:", line, e);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error in stream processing:", e);
    writer.abort(e);
  } finally {
    writer.close();
  }
}

function convertStreamChunkToOpenAI(geminiChunk, model) {
  const now = Math.floor(Date.now() / 1000);
  if (geminiChunk.error) {
    return { id: `chatcmpl-${now}`, object: 'chat.completion.chunk', created: now, model: model, choices: [{ index: 0, delta: { content: `Gemini API Error: ${geminiChunk.error.message}` }, finish_reason: 'error' }] };
  }
  const delta = geminiChunk.candidates?.[0]?.content?.parts?.[0]?.text;
  if (delta === undefined || delta === null) {
    return null;
  }
  return {
    id: `chatcmpl-${now}`,
    object: 'chat.completion.chunk',
    created: now,
    model: model,
    choices: [{ index: 0, delta: { content: delta }, finish_reason: geminiChunk.candidates[0].finishReason || null }],
  };
}

export { handleOpenAIRequest };
