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
    const { readable, writable } = new TransformStream();
    streamGeminiToOpenAI(geminiResponse.body, writable, model);
    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } else {
    const geminiJson = await geminiResponse.json();
    const openaiJson = convertResponseToOpenAI(geminiJson, model);
    return new Response(JSON.stringify(openaiJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function convertRequestToGemini(openaiRequest) {
  const geminiRequest = {
    contents: openaiRequest.messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      return { role, parts: [{ text: msg.content }] };
    }),
    generationConfig: {},
    // Add safety settings to block none, mirroring the successful example
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  if (openaiRequest.max_tokens) geminiRequest.generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  if (openaiRequest.temperature) geminiRequest.generationConfig.temperature = openaiRequest.temperature;
  if (openaiRequest.top_p) geminiRequest.generationConfig.topP = openaiRequest.top_p;
  
  return geminiRequest;
}

function mapFinishReason(geminiReason) {
  switch (geminiReason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
      return 'content_filter';
    default:
      return 'stop';
  }
}

function convertResponseToOpenAI(geminiResponse, model) {
  const now = Math.floor(Date.now() / 1000);
  if (geminiResponse.error) {
    return createErrorResponse(geminiResponse.error.message, model, 'gemini_api_error');
  }

  const choice = geminiResponse.candidates?.[0];
  if (!choice) {
    // Handle prompt feedback for blocked prompts
    if (geminiResponse.promptFeedback?.blockReason) {
      return createErrorResponse(`[PROMPT BLOCKED] Reason: ${geminiResponse.promptFeedback.blockReason}`, model, 'content_filter');
    }
    return createErrorResponse('An unknown error occurred: No candidates in response.', model, 'unknown_error');
  }

  let messageContent = choice.content?.parts?.[0]?.text || '';
  let finishReason = mapFinishReason(choice.finishReason);

  const promptTokens = geminiResponse.usageMetadata?.promptTokenCount || 0;
  const completionTokens = geminiResponse.usageMetadata?.candidatesTokenCount || 0;
  
  return {
    id: `chatcmpl-${now}`,
    object: 'chat.completion',
    created: now,
    model: model,
    choices: [{ index: 0, message: { role: 'assistant', content: messageContent }, finish_reason: finishReason }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
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
  const now = Math.floor(Date.now() / 1000);
  const streamId = `chatcmpl-${now}`;
  let lastChunk = null;

  // First, send a chunk with the role, but no content.
  // This is not strictly required, but some clients appreciate it.
  const initialChunk = {
    id: streamId,
    object: 'chat.completion.chunk',
    created: now,
    model: model,
    choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
  };
  await writer.write(textEncoder.encode(`data: ${JSON.stringify(initialChunk)}\n\n`));

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break; // Exit loop when stream is done
      }
      buffer += textDecoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last, possibly incomplete line

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const geminiChunk = JSON.parse(line.substring(6));
            const openaiChunk = convertStreamChunkToOpenAI(geminiChunk, model, streamId, now);
            if (openaiChunk) {
              lastChunk = openaiChunk; // Store the last valid chunk
              await writer.write(textEncoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            }
          } catch (e) {
            console.error("Error parsing stream chunk:", line, e);
          }
        }
      }
    }

    // After the loop, send the final chunk with the finish_reason.
    // This is the key change inspired by the reference project.
    const finalChunk = {
      id: streamId,
      object: 'chat.completion.chunk',
      created: now,
      model: model,
      choices: [{
        index: 0,
        delta: {}, // No content in the final delta
        finish_reason: 'stop' // The reason for finishing
      }],
    };
    await writer.write(textEncoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));

    // Finally, send the [DONE] signal
    await writer.write(textEncoder.encode('data: [DONE]\n\n'));

  } catch (e) {
    console.error("Error in stream processing:", e);
    await writer.abort(e);
  } finally {
    await writer.close();
  }
}

function convertStreamChunkToOpenAI(geminiChunk, model, id, created) {
  if (geminiChunk.error) {
    return { id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content: `Gemini API Error: ${geminiChunk.error.message}` }, finish_reason: 'error' }] };
  }
  const choice = geminiChunk.candidates?.[0];
  if (!choice) return null;

  const delta = choice.content?.parts?.[0]?.text;
  if (delta === undefined || delta === null) {
    return null;
  }
  
  // Per OpenAI spec, stream chunks with content should not have a finish_reason.
  // The finish_reason is sent in a separate, final chunk.
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta: { content: delta }, finish_reason: null }],
  };
}

export { handleOpenAIRequest };
