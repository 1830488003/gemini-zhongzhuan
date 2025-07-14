// src/openai_adapter.js

const GEMINI_API_HOST = "generativelanguage.googleapis.com";

async function handleOpenAIRequest(request) {
  if (request.method === 'OPTIONS') {
    return handleOPTIONS();
  }

  const url = new URL(request.url);
  // 从请求体中获取模型名称
  const requestBody = await request.json();
  const model = requestBody.model;

  if (!model) {
    return new Response(JSON.stringify({ error: "Model not specified in the request body" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 构建目标 Gemini URL
  const geminiUrl = `https://${GEMINI_API_HOST}/v1beta/models/${model}:${requestBody.stream ? 'streamGenerateContent' : 'generateContent'}`;

  // 转换请求体
  const geminiRequestBody = convertRequestToGemini(requestBody);

  // 处理 API 密钥
  const apiKey = request.headers.get('authorization')?.split(' ')?.[1];
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Authorization header is missing" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const geminiHeaders = new Headers({
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  });

  // 发送请求到 Gemini
  const geminiResponse = await fetch(geminiUrl, {
    method: 'POST',
    headers: geminiHeaders,
    body: JSON.stringify(geminiRequestBody),
  });

  // 转换响应
  if (requestBody.stream) {
    const { readable, writable } = new TransformStream();
    streamGeminiToOpenAI(geminiResponse.body, writable, model);
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    const geminiJson = await geminiResponse.json();
    if (geminiJson.error) {
        return new Response(JSON.stringify(geminiJson), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    const openaiJson = convertResponseToOpenAI(geminiJson, model);
    return new Response(JSON.stringify(openaiJson), {
      status: geminiResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function convertRequestToGemini(openaiRequest) {
  const geminiRequest = {
    contents: [],
    generationConfig: {},
  };

  // 转换 messages
  for (const message of openaiRequest.messages) {
    // 忽略 system role for now, as Gemini handles it differently.
    // A better implementation might merge the system prompt with the first user prompt.
    if (message.role === 'user') {
      geminiRequest.contents.push({ role: 'user', parts: [{ text: message.content }] });
    } else if (message.role === 'assistant') {
      geminiRequest.contents.push({ role: 'model', parts: [{ text: message.content }] });
    }
  }

  // 转换参数
  if (openaiRequest.max_tokens) {
    geminiRequest.generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  }
  if (openaiRequest.temperature) {
    geminiRequest.generationConfig.temperature = openaiRequest.temperature;
  }
  if (openaiRequest.top_p) {
    geminiRequest.generationConfig.topP = openaiRequest.top_p;
  }
  // Note: stop sequences mapping might be needed
  // if (openaiRequest.stop) {
  //   geminiRequest.generationConfig.stopSequences = Array.isArray(openaiRequest.stop) ? openaiRequest.stop : [openaiRequest.stop];
  // }

  return geminiRequest;
}

function convertResponseToOpenAI(geminiResponse, model) {
  const now = Math.floor(Date.now() / 1000);
  const choice = geminiResponse.candidates?.[0];
  const message = choice?.content?.parts?.[0]?.text || '';

  return {
    id: `chatcmpl-${now}`,
    object: 'chat.completion',
    created: now,
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: message,
        },
        finish_reason: choice?.finishReason || 'stop',
      },
    ],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0,
    },
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
      
      // Gemini streaming responses are newline-separated JSON chunks
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last partial line in the buffer

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
    const delta = geminiChunk.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!delta) {
        return null;
    }

    return {
        id: `chatcmpl-${now}`,
        object: 'chat.completion.chunk',
        created: now,
        model: model,
        choices: [
            {
                index: 0,
                delta: {
                    content: delta,
                },
                finish_reason: geminiChunk.candidates[0].finishReason || null,
            },
        ],
    };
}

function handleOPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export { handleOpenAIRequest };
