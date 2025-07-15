// @ts-check

/**
 * Final Architecture: Replicating hajimi-main's KeyManager and ActiveRequestManager patterns.
 * This version includes robust key management and intelligent request coalescing for concurrent identical requests.
 */

// --- Configuration ---
const CUSTOM_AUTH_KEY = '67564534';
const BASE_URL = 'https://generativelanguage.googleapis.com';
const API_VERSION = 'v1beta';
// --- End Configuration ---

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// --- Core Managers ---

/**
 * Manages API keys, including rotation and temporary failure blacklisting.
 */
class KeyManager {
  constructor() {
    /** @type {string[]} */
    this.keys = [
      'AIzaSyB8WZAjGkNvOsJbcnstmCRHZ7WyJ01r8TY',
      'AIzaSyAXDoNlu9u5dFhbJhkqru9iZXTd2yYn5-8',
      'AIzaSyAs9OfZmteNgOxy6L3AOQigZlzs8XAs8Jw',
      'AIzaSyBkaiGeEnkive8WwvMAEAne-nbfI4H2vyY',
      'AIzaSyDe2Viw5hlNTQM5gjQzl_mJqCMxFaSj3uA',
      'AIzaSyCR2faMADtxo8Hx8zhx-7b2eaEsuZQTtvY',
      'AIzaSyC7BsBAmQBZ8HsfqCjncYBwrwP5yiFXSRQ',
      'AIzaSyDw-Rju2wboU3hwwpIHg45x5R-IvvU1x38',
      'AIzaSyABlzNmp2RGAxxV5e13xs788ockChqSaTs',
      'AIzaSyACXBpBeJVH5hKzjM2i9Q5iMXwuBaQHADw',
      'AIzaSyDGETtwiz0HGTq8N2WBtyIplFM8qI2DvUY',
      'AIzaSyDJnBIUWUvHx3BgJhWJF6i_f9U8hPB7MPs',
      'AIzaSyB7HyFvYk6OCE9fMLQgAqGE86Vm2sndSdU',
      'AIzaSyAZnSkEYTrHDllSnUJN5Z4X7Gk6LgolOlQ',
      'AIzaSyBeKUxcOmpZhMJBsb6p35qZudj2ZrhCE-k',
      'AIzaSyDXVEqcRws1t69t1WZRdgxA7wbCHuqHCXw',
      'AIzaSyAZusyRzdrVBJpuI10f-8WE2WWKaeFh7X8',
      'AIzaSyDEC9CGlCL6mJtHwJ8yCLKTSJ4tw0r0Bkw',
      'AIzaSyC1U9RoDbO1ZKEGODAqmsq3xTymtDXIln8',
      'AIzaSyC1gvzCnW-uXVrhgAz0avPxdEzDBZ84BhE',
      'AIzaSyDg3bGQE2kRidsza75Jgqd1aLAx1fOkoJg',
      'AIzaSyBycxkw4QcR0WfJii76jJMXqZ6LlbGcaEU',
      'AIzaSyD-Nck_RoMaC2qc6PFVfaE7GTMNOe4y1D0',
      'AIzaSyA-ruVqZupqv0qT8oRAWku9xnYbKfrLwkQ',
      'AIzaSyAVKooPAg-S4MKcebFoSbaUNkVzDzFoIo4',
      'AIzaSyDE3Ojsaf1T8iGqnd_kHchLjge31eUPoJ4',
      'AIzaSyBeE75a3zINtAIwG4V1UL175aSjNb6pW9c',
      'AIzaSyAlL3tlKO22DrIDkmqs9ScJWFNFwfN4QEI',
      'AIzaSyBZdBawDf8ZPAKdxHtiywMsV5eHVGlL6Fo',
      'AIzaSyDNuuj3YPSpdbsfExNJu0PJnz-PXDIQTrs',
      'AIzaSyDt--WY2xGoqM_XNyNMTmq9t5Zqqq1t0tQ',
      'AIzaSyCqD4Uxj9DjUuqg1ORz2ncZrfcZ9ZebdWw',
      'AIzaSyDBUenFxYtpl_SH5XDBtbJqLPOH540B9xk',
      'AIzaSyDbc_oT_gcii4LDK6fcqZ8NHNoDdKMOgOU',
      'AIzaSyB7LOzoGW5DC3q-u6eupw14UoAh_3rZxQ0',
      'AIzaSyDxawl15iofU9tXv-7SvRVENDlDEtaY5M4',
      'AIzaSyArF3Fb8UHz3fYB8hhmRot1nXOZ7b7Og0M',
      'AIzaSyApJqDcpJ6EeuM0149xP-UU0WtO76OWZrg',
      'AIzaSyBd240-bXhtrSv2l7cU1ii5G8-DBQfS0HA',
      'AIzaSyANug4zv8RMBBjyCOZHpMZmKaWTA71KJDw',
      'AIzaSyB8mSPkJ-kxXTV3gf300C9YjkUceM5d2bM',
      'AIzaSyAedrnoL7BXuKbOLZM-z6Ll-kLEeYZBQ28',
      'AIzaSyBsX7XxZGj21wMc7Jz3TQ2jPORl3bEIrP8',
      'AIzaSyDCfTx9vssaUE32lhgNwSMYqyzS5P2HghU',
      'AIzaSyDrogC_c1_ettNZ2RVCDcbkVVN4pRndH4I',
      'AIzaSyAo1gjCJwTOdmSeFjphBOgH_OYU-j9awBM',
      'AIzaSyCcgSeznPu_I75xhxOk-dr7DdIG5unaeQM',
    ];
    /** @type {Map<string, number>} */
    this.failedKeys = new Map(); // Store key and timestamp of failure
    /** @type {Map<string, number>} */
    this.usageStats = new Map(); // Store key and its usage count
    this.FAILURE_COOLDOWN = 10 * 60 * 1000; // 10 minutes
    console.log(`KeyManager: Initialized with ${this.keys.length} built-in keys.`);
    this.keys.forEach(key => this.usageStats.set(key, 0));
  }

  _incrementUsage(key) {
    if (key) {
      const currentCount = this.usageStats.get(key) || 0;
      this.usageStats.set(key, currentCount + 1);
    }
  }

  getKey() {
    const now = Date.now();
    const availableKeys = this.keys.filter(key => {
      const failureTime = this.failedKeys.get(key);
      return !failureTime || now - failureTime > this.FAILURE_COOLDOWN;
    });
    if (availableKeys.length === 0) return null;
    const key = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    this._incrementUsage(key);
    return key;
  }

  reportFailure(key) {
    if (key) {
      this.failedKeys.set(key, Date.now());
      console.warn(`密钥管理器: 报告密钥 ...${key.slice(-4)} 失效，冷却期开始。`);
    }
  }
}

// --- Global Instances ---
const keyManager = new KeyManager();

/** @type {{force_fake_stream: boolean}} */
let globalSettings = { force_fake_stream: true };

class GlobalLogger {
  constructor(maxSize = 100) {
    this.logs = [];
    this.maxSize = maxSize;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.logs.unshift(logEntry); // Add to the beginning
    if (this.logs.length > this.maxSize) {
      this.logs.pop(); // Remove the oldest
    }
  }

  getLogs() {
    return this.logs;
  }
}
const logger = new GlobalLogger();

// --- Data Transformation ---

function convertMessagesToGemini(messages) {
  /** @type {{parts: {text: string}[]} | null} */
  let system_instruction = null;
  const contents = [];
  let lastRole = null;
  for (const message of messages) {
    const role = message.role === 'assistant' ? 'model' : 'user';
    if (message.role === 'system') {
      if (!system_instruction) system_instruction = { parts: [] };
      if (typeof message.content === 'string') system_instruction.parts.push({ text: message.content });
      continue;
    }
    const parts = [{ text: message.content }];
    if (role === lastRole && contents.length > 0) {
      contents[contents.length - 1].parts.push(...parts);
    } else {
      contents.push({ role, parts });
      lastRole = role;
    }
  }
  return { contents, system_instruction };
}

function transformRequestToGemini(openaiRequest) {
  const { contents, system_instruction } = convertMessagesToGemini(openaiRequest.messages || []);
  const generationConfig = {
    temperature: openaiRequest.temperature,
    maxOutputTokens: openaiRequest.max_tokens,
    topP: openaiRequest.top_p,
    topK: openaiRequest.top_k,
    stopSequences: typeof openaiRequest.stop === 'string' ? [openaiRequest.stop] : openaiRequest.stop,
    candidateCount: openaiRequest.n,
  };
  Object.keys(generationConfig).forEach(key => generationConfig[key] === undefined && delete generationConfig[key]);
  const safetySettings = [
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  ];
  const geminiRequest = { contents, generationConfig, safetySettings };
  if (system_instruction) {
    geminiRequest.system_instruction = system_instruction;
  }
  return geminiRequest;
}

// --- Core Request Logic ---

const generateId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomChar = () => characters[Math.floor(Math.random() * characters.length)];
  return Array.from({ length: 29 }, randomChar).join('');
};

const reasonsMap = {
  STOP: 'stop',
  MAX_TOKENS: 'length',
  SAFETY: 'content_filter',
  RECITATION: 'content_filter',
};

const transformCandidates = (key, cand) => {
  const message = { role: 'assistant', content: null };
  if (cand.content?.parts?.[0]?.text) {
    message.content = cand.content.parts[0].text;
  }
  return {
    index: cand.index || 0,
    [key]: message,
    logprobs: null,
    finish_reason: reasonsMap[cand.finishReason] || cand.finishReason,
  };
};
const transformCandidatesMessage = transformCandidates.bind(null, 'message');
const transformCandidatesDelta = transformCandidates.bind(null, 'delta');

const transformUsage = data => ({
  completion_tokens: data.candidatesTokenCount,
  prompt_tokens: data.promptTokenCount,
  total_tokens: data.totalTokenCount,
});

const checkPromptBlock = (choices, promptFeedback, key) => {
  if (choices.length) {
    return;
  }
  if (promptFeedback?.blockReason) {
    choices.push({
      index: 0,
      [key]: null,
      finish_reason: 'content_filter',
    });
  }
  return true;
};

const processCompletionsResponse = (data, model, id) => {
  const obj = {
    id,
    choices: data.candidates.map(transformCandidatesMessage),
    created: Math.floor(Date.now() / 1000),
    model: model,
    object: 'chat.completion',
    usage: data.usageMetadata && transformUsage(data.usageMetadata),
  };
  if (obj.choices.length === 0) {
    checkPromptBlock(obj.choices, data.promptFeedback, 'message');
  }
  return obj;
};

const sseline = obj => `data: ${JSON.stringify(obj)}\n\n`;

async function executeNonStreamRequest(model, geminiRequest, signal) {
  const url = `${BASE_URL}/${API_VERSION}/models/${model}:generateContent`;
  const retryAttempts = 5;
  const attemptLogs = [];

  for (let i = 0; i < retryAttempts; i++) {
    const apiKey = keyManager.getKey();
    if (!apiKey) {
      attemptLogs.push(`Attempt ${i + 1}: No available API keys.`);
      continue;
    }

    const keyIdentifier = `...${apiKey.slice(-4)}`;
    logger.log(`第 ${i + 1} 次尝试 (非流式): 使用密钥 ${keyIdentifier} 请求模型 ${model}。`);
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('key', apiKey);

    try {
      const fetchResponse = await fetch(requestUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest),
        signal: signal,
      });

            if (fetchResponse.ok) {
                logger.log(`第 ${i + 1} 次尝试 (非流式): 密钥 ${keyIdentifier} 请求成功。`);
                return await fetchResponse.json();
            }

      const errorBody = await fetchResponse.text();
      let errorType = `HTTP ${fetchResponse.status}`;
      switch (fetchResponse.status) {
        case 400:
          errorType = '400 INVALID_ARGUMENT / FAILED_PRECONDITION';
          break;
        case 403:
          errorType = '403 PERMISSION_DENIED';
          break;
        case 404:
          errorType = '404 NOT_FOUND';
          break;
        case 429:
          errorType = '429 RESOURCE_EXHAUSTED';
          break;
        case 500:
          errorType = '500 INTERNAL_SERVER_ERROR';
          break;
        case 503:
          errorType = '503 UNAVAILABLE';
          break;
        case 504:
          errorType = '504 DEADLINE_EXCEEDED';
          break;
      }
            const errorMessage = `Google API 错误: ${errorType} (密钥 ${keyIdentifier})。详情: ${errorBody}`;
            attemptLogs.push(`第 ${i + 1} 次尝试失败: ${errorMessage}`);
            logger.log(`第 ${i + 1} 次尝试失败 (非流式): ${errorMessage}`, 'ERROR');
      keyManager.reportFailure(apiKey);
    } catch (error) {
            if (error.name === 'AbortError') {
                const errorMessage = `请求被客户端中断 (密钥 ${keyIdentifier})。可能原因：客户端超时或断开连接。`;
                attemptLogs.push(`第 ${i + 1} 次尝试失败: ${errorMessage}`);
                logger.log(errorMessage, 'INFO');
            } else {
                const errorMessage = `网络错误 (密钥 ${keyIdentifier}): ${error.message}`;
                attemptLogs.push(`第 ${i + 1} 次尝试失败: ${errorMessage}`);
                logger.log(`第 ${i + 1} 次尝试失败 (非流式): ${errorMessage}`, 'ERROR');
                keyManager.reportFailure(apiKey);
            }
    }
  }
  const detailedError = `All ${retryAttempts} API key attempts failed for non-stream request. Logs:\n${attemptLogs.join(
    '\n',
  )}`;
  logger.log(detailedError, 'CRITICAL');
  throw new HttpError(detailedError, 500);
}

async function handleChatCompletions(request) {
  const controller = new AbortController();
  request.signal.addEventListener('abort', () => {
    logger.log('客户端连接已断开，正在中止外部请求。', 'INFO');
    controller.abort();
  });

  const openaiRequest = await request.clone().json();
  const model = openaiRequest.model || 'gemini-1.5-flash';
  const geminiRequest = transformRequestToGemini(openaiRequest);
  const stream = openaiRequest.stream || false;
  let streamMode = openaiRequest.stream_mode || 'real';
  const id = `chatcmpl-${generateId()}`;

    // --- Global Fake Stream Override ---
  if (globalSettings.force_fake_stream && stream) {
    streamMode = 'fake';
    logger.log('全局设置: 强制使用“假流式”模式。', 'INFO');
  }

  // --- Fake Streaming Logic ---
  if (stream && streamMode === 'fake') {
    const readable = new ReadableStream({
      async start(streamController) {
        // Immediately send a keep-alive comment to establish the connection
        // and prevent the client from timing out while we wait for the full response.
        streamController.enqueue(': connection established\n\n');

        let keepaliveIntervalId;
        const sendKeepAlive = () => {
          try {
            streamController.enqueue(': keep-alive\n\n');
          } catch (e) {
            console.error('Error sending keep-alive:', e);
            if (keepaliveIntervalId) clearInterval(keepaliveIntervalId);
          }
        };
        keepaliveIntervalId = setInterval(sendKeepAlive, 10000);

        try {
          const geminiJson = await executeNonStreamRequest(model, geminiRequest, controller.signal);
          const bodyObj = processCompletionsResponse(geminiJson, model, id);
          streamController.enqueue(sseline(bodyObj));
        } catch (error) {
          console.error('Error in fake streaming execution:', error);
          const errorPayload = { error: { message: error.message, type: 'server_error', code: error.status || 500 } };
          streamController.enqueue(sseline(errorPayload));
        } finally {
          clearInterval(keepaliveIntervalId);
          streamController.enqueue('data: [DONE]\n\n');
          streamController.close();
        }
      },
    });
    return new Response(readable.pipeThrough(new TextEncoderStream()), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  }

  // --- Real Streaming or Non-Streaming Logic ---
  const useStreamEndpoint = stream && streamMode === 'real';
  const url = `${BASE_URL}/${API_VERSION}/models/${model}:${
    useStreamEndpoint ? 'streamGenerateContent?alt=sse' : 'generateContent'
  }`;
  let response;
  const retryAttempts = 5;
  const attemptLogs = [];

  for (let i = 0; i < retryAttempts; i++) {
    const apiKey = keyManager.getKey();
    if (!apiKey) {
      attemptLogs.push(`Attempt ${i + 1}: No available API keys.`);
      break;
    }
    const keyIdentifier = `...${apiKey.slice(-4)}`;
    logger.log(`第 ${i + 1} 次尝试: 使用密钥 ${keyIdentifier} 请求模型 ${model}。`);
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('key', apiKey);

    try {
      const fetchResponse = await fetch(requestUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest),
        signal: controller.signal,
      });

            if (fetchResponse.ok) {
                response = fetchResponse;
                logger.log(`第 ${i + 1} 次尝试: 密钥 ${keyIdentifier} 请求成功。`);
                break;
            }

      const errorBody = await fetchResponse.text();
      let errorType = `HTTP ${fetchResponse.status}`;
      switch (fetchResponse.status) {
        case 400:
          errorType = '400 INVALID_ARGUMENT / FAILED_PRECONDITION';
          break;
        case 403:
          errorType = '403 PERMISSION_DENIED';
          break;
        case 404:
          errorType = '404 NOT_FOUND';
          break;
        case 429:
          errorType = '429 RESOURCE_EXHAUSTED';
          break;
        case 500:
          errorType = '500 INTERNAL_SERVER_ERROR';
          break;
        case 503:
          errorType = '503 UNAVAILABLE';
          break;
        case 504:
          errorType = '504 DEADLINE_EXCEEDED';
          break;
      }
            const errorMessage = `Google API 错误: ${errorType} (密钥 ${keyIdentifier})。详情: ${errorBody}`;
            attemptLogs.push(`第 ${i + 1} 次尝试失败: ${errorMessage}`);
            logger.log(`第 ${i + 1} 次尝试失败: ${errorMessage}`, 'ERROR');
      keyManager.reportFailure(apiKey);
    } catch (error) {
            if (error.name === 'AbortError') {
                const errorMessage = `请求被客户端中断 (密钥 ${keyIdentifier})。`;
                attemptLogs.push(`第 ${i + 1} 次尝试失败: ${errorMessage}`);
                logger.log(errorMessage, 'INFO');
            } else {
                const errorMessage = `网络错误 (密钥 ${keyIdentifier}): ${error.message}`;
                attemptLogs.push(`第 ${i + 1} 次尝试失败: ${errorMessage}`);
                logger.log(`第 ${i + 1} 次尝试失败: ${errorMessage}`, 'ERROR');
                keyManager.reportFailure(apiKey);
            }
    }
  }

    if (!response) {
        const detailedError = `所有 ${retryAttempts} 次API密钥尝试均失败。日志:\n${attemptLogs.join('\n')}`;
        logger.log(detailedError, 'CRITICAL');
        throw new HttpError(detailedError, 500);
    }

  if (useStreamEndpoint) {
    if (!response.body) throw new HttpError('Response body is null', 500);
    const streamState = { buffer: '', firstChunkSent: false };
    const readable = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            streamState.buffer += chunk;
            const lines = streamState.buffer.split('\n');
            streamState.buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  controller.enqueue(JSON.parse(line.substring(6)));
                } catch (e) {
                  console.error('Could not parse stream line:', line);
                }
              }
            }
          },
        }),
      )
      .pipeThrough(
        new TransformStream({
          transform(geminiChunk, controller) {
            if (!geminiChunk.candidates) {
              console.error('Invalid stream chunk:', geminiChunk);
              return;
            }
            const created = Math.floor(Date.now() / 1000);
            const choice = transformCandidatesDelta(geminiChunk.candidates[0]);
            if (!streamState.firstChunkSent) {
              controller.enqueue(
                sseline({
                  id,
                  created,
                  model,
                  object: 'chat.completion.chunk',
                  choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }],
                }),
              );
              streamState.firstChunkSent = true;
            }
            if (choice.delta.content) {
              controller.enqueue(
                sseline({
                  id,
                  created,
                  model,
                  object: 'chat.completion.chunk',
                  choices: [{ index: choice.index, delta: { content: choice.delta.content }, finish_reason: null }],
                }),
              );
            }
            if (choice.finish_reason) {
              controller.enqueue(
                sseline({
                  id,
                  created,
                  model,
                  object: 'chat.completion.chunk',
                  choices: [{ index: choice.index, delta: {}, finish_reason: choice.finish_reason }],
                }),
              );
            }
          },
          flush(controller) {
            controller.enqueue('data: [DONE]\n\n');
          },
        }),
      )
      .pipeThrough(new TextEncoderStream());
    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } else {
    const geminiJson = await response.json();
    const bodyObj = processCompletionsResponse(geminiJson, model, id);
    return new Response(JSON.stringify(bodyObj), { headers: { 'Content-Type': 'application/json' } });
  }
}

// --- Request Handling ---

/**
 * Handles requests for the model list.
 * @returns {Promise<Response>}
 */
async function handleModels() {
  const apiKey = keyManager.getKey();
  if (!apiKey) {
    throw new HttpError('No available API keys to fetch models.', 503);
  }
  const url = `${BASE_URL}/${API_VERSION}/models?key=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new HttpError(`Failed to fetch models from Google: ${response.status}`, response.status);
    }
    const googleJson = await response.json();
    const openAIResponse = {
      object: 'list',
      data: googleJson.models.map(model => ({
        id: model.name.replace('models/', ''),
        object: 'model',
        created: new Date(model.createTime).getTime() / 1000,
        owned_by: 'google',
      })),
    };
    return new Response(JSON.stringify(openAIResponse), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in handleModels:', error);
    keyManager.reportFailure(apiKey);
    throw error;
  }
}

/**
 * Handles requests for the diagnostic status.
 * @returns {Response}
 */
function handleDiagLogs() {
  return new Response(JSON.stringify(logger.getLogs()), { headers: { 'Content-Type': 'application/json' } });
}

function handleDiagStatus() {
  const now = Date.now();
  const keyDetails = keyManager.keys.map(key => {
    const failureTime = keyManager.failedKeys.get(key);
    const cooldownRemaining = failureTime ? Math.max(0, failureTime + keyManager.FAILURE_COOLDOWN - now) : 0;
    const status = cooldownRemaining > 0 ? 'cooldown' : 'available';

    return {
      id: `...${key.slice(-4)}`,
      status: status,
      usageCount: keyManager.usageStats.get(key) || 0,
      cooldownUntil:
        status === 'cooldown' && failureTime ? new Date(failureTime + keyManager.FAILURE_COOLDOWN).toISOString() : null,
    };
  });

  const summary = {
    totalKeys: keyManager.keys.length,
    availableKeys: keyDetails.filter(k => k.status === 'available').length,
    cooldownKeys: keyDetails.filter(k => k.status === 'cooldown').length,
  };

  return new Response(JSON.stringify({ summary, details: keyDetails }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleDiagConfig(request) {
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (typeof body.force_fake_stream === 'boolean') {
        globalSettings.force_fake_stream = body.force_fake_stream;
                logger.log(`全局设置“强制假流式”已更新为: ${globalSettings.force_fake_stream}`, 'SUCCESS');
        return new Response(JSON.stringify({ success: true, settings: globalSettings }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid 'force_fake_stream' value. Must be a boolean." }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    // GET request
    return new Response(JSON.stringify(globalSettings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// --- Main Entry Point ---

async function handleRequest(request, env) {
  const addCors = response => {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  };

  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': '*',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // verifyAuth(request); // Removed custom auth to allow any key from client.

    const { pathname } = new URL(request.url);
    if (pathname.endsWith('/chat/completions')) {
      const response = await handleChatCompletions(request);
      return addCors(response);
    }

    if (pathname.endsWith('/v1/models')) {
      const response = await handleModels();
      return addCors(response);
    }

    if (pathname.endsWith('/v1/diag/status')) {
      const response = handleDiagStatus();
      return addCors(response);
    }

    if (pathname.endsWith('/v1/diag/logs')) {
      const response = handleDiagLogs();
      return addCors(response);
    }

    if (pathname.endsWith('/v1/diag/config')) {
      const response = await handleDiagConfig(request);
      return addCors(response);
    }

    return addCors(new Response('Not Found', { status: 404 }));
  } catch (error) {
    console.error('Unhandled error in handleRequest:', error);
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    const errorResponse = new Response(JSON.stringify({ error: { message, type: 'server_error' } }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
    return addCors(errorResponse);
  }
}

export default {
  fetch: handleRequest,
};
