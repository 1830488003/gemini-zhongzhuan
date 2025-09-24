// @ts-check
import { Buffer } from "node:buffer";

let getStore;
try {
  // @ts-ignore
  ({ getStore } = await import('netlify:blob'));
} catch (e) {
  // ignore
}

// --- Custom Classes & Global Instances (Retained from original project) ---

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

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
    this.keys.forEach(key => this.usageStats.set(key, 0));
  }
  _incrementUsage(key) { if (key) this.usageStats.set(key, (this.usageStats.get(key) || 0) + 1); }
  getKey() {
    const now = Date.now();
    const availableKeys = this.keys.filter(key => {
        const failedTime = this.failedKeys.get(key);
        return failedTime === undefined || (now - failedTime > this.FAILURE_COOLDOWN);
    });
    if (availableKeys.length === 0) return null;
    const key = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    this._incrementUsage(key);
    return key;
  }
  reportFailure(key) { if (key) this.failedKeys.set(key, Date.now()); }
}

class GlobalLogger {
  constructor(maxSize = 100) { this.maxSize = maxSize; }
  async log(store, message, type = 'INFO') {
    if (!store) { console.log(`(No-Store) [${type}] ${message}`); return; }
    try {
      const logEntry = { timestamp: new Date().toISOString(), type, message };
      const logs = (await store.get('latest_logs', { type: 'json' })) || [];
      logs.unshift(logEntry);
      if (logs.length > this.maxSize) logs.splice(this.maxSize);
      await store.setJSON('latest_logs', logs);
    } catch (e) { console.error('Blob Store Write Error:', e); }
  }
  async getLogs(store) {
    if (!store) return [];
    try { return (await store.get('latest_logs', { type: 'json' })) || []; }
    catch (e) { console.error('Blob Store Read Error:', e); return []; }
  }
}

const keyManager = new KeyManager();
const logger = new GlobalLogger();

// --- Core Logic from openai-gemini-main (with adaptations) ---

const BASE_URL = "https://generativelanguage.googleapis.com";
const API_VERSION = "v1beta";
const API_CLIENT = "genai-js/0.21.0";

const makeHeaders = (apiKey) => ({
  "x-goog-api-client": API_CLIENT,
  "x-goog-api-key": apiKey,
  "Content-Type": "application/json",
});

const fixCors = (response) => {
    if (!response) {
        return new Response(null, { status: 204, headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }});
    }
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const handleOPTIONS = () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
    }
  });
};

const DEFAULT_MODEL = "gemini-1.5-flash";
async function handleCompletions (req, logStore) {
  const controller = new AbortController();
  if (req.signal) {
    // @ts-ignore
    req.signal.addEventListener('abort', () => controller.abort());
  }

  let model = DEFAULT_MODEL;
  if (typeof req.model === "string") {
      if (req.model.startsWith("models/")) model = req.model.substring(7);
      else if (req.model.startsWith("gemini-") || req.model.startsWith("gemma-")) model = req.model;
  }

  const geminiRequestBody = await transformRequest(req);
  const TASK = req.stream ? "streamGenerateContent" : "generateContent";
  let url = `${BASE_URL}/${API_VERSION}/models/${model}:${TASK}`;
  if (req.stream) { url += "?alt=sse"; }

  let response;
  const retryAttempts = 5;
  const attemptLogs = [];

  for (let i = 0; i < retryAttempts; i++) {
    const apiKey = keyManager.getKey();
    if (!apiKey) {
      attemptLogs.push(`Attempt ${i + 1}: No available API keys.`);
      continue;
    }
    const keyIdentifier = `...${apiKey.slice(-4)}`;
    await logger.log(logStore, `第 ${i + 1} 次尝试: 使用密钥 ${keyIdentifier} 请求模型 ${model}。`);

    try {
      const fetchResponse = await fetch(url, {
        method: "POST",
        headers: makeHeaders(apiKey),
        body: JSON.stringify(geminiRequestBody),
        signal: controller.signal,
      });

      if (fetchResponse.ok) {
        response = fetchResponse;
        await logger.log(logStore, `第 ${i + 1} 次尝试: 密钥 ${keyIdentifier} 请求成功。`);
        break; // Success, exit loop
      }

      const errorBody = await fetchResponse.text();
      const errorMessage = `Google API Error: ${fetchResponse.status} (Key ${keyIdentifier}). Details: ${errorBody}`;
      attemptLogs.push(`Attempt ${i + 1} failed: ${errorMessage}`);
      await logger.log(logStore, `第 ${i + 1} 次尝试失败: ${errorMessage}`, 'ERROR');
      keyManager.reportFailure(apiKey);

    } catch (error) {
      const errorMessage = `Network Error (Key ${keyIdentifier}): ${error.message}`;
      attemptLogs.push(`Attempt ${i + 1} failed: ${errorMessage}`);
      await logger.log(logStore, `第 ${i + 1} 次尝试失败: ${errorMessage}`, 'ERROR');
      keyManager.reportFailure(apiKey);
    }
  }

  if (!response) {
    const detailedError = `All ${retryAttempts} API key attempts failed. Logs:\n${attemptLogs.join('\n')}`;
    await logger.log(logStore, detailedError, 'CRITICAL');
    throw new HttpError(detailedError, 500);
  }

  if (!response.ok) {
    return fixCors(response);
  }

  let id = "chatcmpl-" + generateId();

  if (req.stream) {
    if (!response.body) {
        throw new HttpError("Response body is null for stream", 500);
    }
    const decodedStream = response.body.pipeThrough(new TextDecoderStream());
    const stream = createStreamTransformer(decodedStream, id, model, req.stream_options?.include_usage);
    return fixCors(new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers }));
  } else {
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
      if (!data.candidates) throw new Error("Invalid completion object");
    } catch (err) {
      await logger.log(logStore, `Error parsing non-stream response: ${err}`, 'ERROR');
      return fixCors(new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers }));
    }
    const body = processCompletionsResponse(data, model, id);
    return fixCors(new Response(body, { status: response.status, headers: { 'Content-Type': 'application/json' } }));
  }
}

const adjustProps = (schemaPart) => {
  if (typeof schemaPart !== "object" || schemaPart === null) return;
  if (Array.isArray(schemaPart)) {
    schemaPart.forEach(adjustProps);
  } else {
    if (schemaPart.type === "object" && schemaPart.properties && schemaPart.additionalProperties === false) {
      delete schemaPart.additionalProperties;
    }
    Object.values(schemaPart).forEach(adjustProps);
  }
};
const adjustSchema = (schema) => {
  if (schema && schema.type && schema[schema.type]) {
    const obj = schema[schema.type];
    if (obj) delete obj.strict;
  }
  return adjustProps(schema);
};

const harmCategory = ["HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT", "HARM_CATEGORY_HARASSMENT"];
const safetySettings = harmCategory.map(category => ({ category, threshold: "BLOCK_NONE" }));

const fieldsMap = {
  frequency_penalty: "frequencyPenalty",
  max_tokens: "maxOutputTokens",
  n: "candidateCount",
  presence_penalty: "presencePenalty",
  seed: "seed",
  stop: "stopSequences",
  temperature: "temperature",
  top_k: "topK",
  top_p: "topP",
};

const transformConfig = (req) => {
  let cfg = {};
  for (let key in req) {
    const matchedKey = fieldsMap[key];
    if (matchedKey) cfg[matchedKey] = req[key];
  }
  if (req.response_format?.type === "json_object") {
    cfg.responseMimeType = "application/json";
  }
  return cfg;
};

const parseImg = async (url) => {
  let mimeType, data;
  if (url.startsWith("http")) {
    const response = await fetch(url);
    mimeType = response.headers.get("content-type");
    data = Buffer.from(await response.arrayBuffer()).toString("base64");
  } else {
    const match = url.match(/^data:(?<mimeType>.*?)(;base64)?,(?<data>.*)$/);
    if (!match || !match.groups) throw new HttpError("Invalid image data", 400);
    ({ mimeType, data } = match.groups);
  }
  return { inlineData: { mimeType, data } };
};

const transformMsg = async ({ content }) => {
  if (!Array.isArray(content)) return [{ text: content || " " }];
  const parts = [];
  for (const item of content) {
    if (item.type === "text") parts.push({ text: item.text });
    else if (item.type === "image_url" && item.image_url) parts.push(await parseImg(item.image_url.url));
    else throw new HttpError(`Unknown or invalid content type: ${item.type}`, 400);
  }
  return parts;
};

const transformMessages = async (messages) => {
  const contents = [];
  let system_instruction;
  for (const item of messages) {
    if (item.role === "system") {
      system_instruction = { parts: await transformMsg(item) };
      continue;
    }
    const role = item.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: await transformMsg(item) });
  }
  return { contents, system_instruction };
};

const transformTools = (req) => {
  if (!req.tools) return {};
  const funcs = req.tools.filter(tool => tool.type === "function");
  funcs.forEach(adjustSchema);
  const function_declarations = funcs.map(schema => schema.function);
  return { tools: [{ function_declarations }] };
};

const transformRequest = async (req) => ({
  ...await transformMessages(req.messages),
  safetySettings,
  generationConfig: transformConfig(req),
  ...transformTools(req),
});

const generateId = () => Array.from({ length: 29 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("");

const reasonsMap = { STOP: "stop", MAX_TOKENS: "length", SAFETY: "content_filter", RECITATION: "content_filter" };

const transformCandidates = (key, cand) => {
  const message = { role: "assistant", content: null };
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
const transformCandidatesMessage = transformCandidates.bind(null, "message");
const transformCandidatesDelta = transformCandidates.bind(null, "delta");

const transformUsage = (data) => ({
  completion_tokens: data.candidatesTokenCount,
  prompt_tokens: data.promptTokenCount,
  total_tokens: data.totalTokenCount
});

const processCompletionsResponse = (data, model, id) => {
  const obj = {
    id,
    choices: data.candidates.map(transformCandidatesMessage),
    created: Math.floor(Date.now()/1000),
    model: model,
    object: "chat.completion",
    usage: data.usageMetadata && transformUsage(data.usageMetadata),
  };
  if (obj.choices.length === 0 && data.promptFeedback?.blockReason) {
    obj.choices.push({ index: 0, message: null, finish_reason: "content_filter" });
  }
  return JSON.stringify(obj);
};

const delimiter = "\n\n";
const sseline = (obj) => `data: ${JSON.stringify(obj)}${delimiter}`;

/**
 * Creates a TransformStream that injects a keep-alive comment every 20 seconds
 * if no other data is flowing through, to prevent idle timeouts.
 * @param {number} interval - The interval in milliseconds to send a keep-alive signal.
 */
function createHeartbeatStream(interval = 20000) {
    let timerId;
    return new TransformStream({
        start(controller) {
            timerId = setInterval(() => {
                controller.enqueue(': keep-alive\n\n');
            }, interval);
        },
        transform(chunk, controller) {
            // Pass through the original chunk
            controller.enqueue(chunk);
            // Reset the timer whenever a chunk passes through.
            clearInterval(timerId);
            timerId = setInterval(() => {
                controller.enqueue(': keep-alive\n\n');
            }, interval);
        },
        flush() {
            clearInterval(timerId);
        }
    });
}


function createStreamTransformer(inputStream, id, model, streamIncludeUsage) {
    const responseLineRE = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
    let buffer = "";
    let is_buffers_rest = false;
    const last = [];

    function parseStream(chunk, controller) {
        buffer += chunk;
        let match;
        while ((match = buffer.match(responseLineRE))) {
            controller.enqueue(match[1]);
            buffer = buffer.substring(match[0].length);
        }
    }

    function parseStreamFlush(controller) {
        if (buffer) {
            console.error("Invalid data in stream buffer:", buffer);
            controller.enqueue(buffer);
            is_buffers_rest = true;
        }
    }

    function toOpenAiStream(line, controller) {
        let data;
        try {
            data = JSON.parse(line);
            if (!data.candidates) throw new Error("Invalid completion chunk object");
        } catch (err) {
            if (!is_buffers_rest) line += delimiter;
            controller.enqueue(line);
            return;
        }
        const obj = {
            id: id,
            choices: data.candidates.map(transformCandidatesDelta),
            created: Math.floor(Date.now() / 1000),
            model: model,
            object: "chat.completion.chunk",
        };

        if (obj.choices.length === 0) {
            if (data.promptFeedback?.blockReason) {
                obj.choices.push({ index: 0, delta: {}, finish_reason: "content_filter" });
                controller.enqueue(sseline(obj));
            }
            return;
        }

        const cand = obj.choices[0];
        if (!cand) return;

        // Handle initial role chunk
        if (!last[cand.index]) {
            controller.enqueue(sseline({ ...obj, choices: [{ ...cand, delta: { role: "assistant", content: "" } }] }));
            last[cand.index] = true; // Mark as sent
        }
        
        // Handle content chunk
        if (cand.delta && cand.delta.content) {
            const contentChunk = {
                ...obj,
                choices: [{ ...cand, finish_reason: null }] // Ensure finish_reason is not in content chunk
            };
            delete contentChunk.choices[0].delta.role;
            controller.enqueue(sseline(contentChunk));
        }

        // Handle final chunk with finish_reason
        if (cand.finish_reason) {
            const finalChunk = {
                ...obj,
                choices: [{
                    index: cand.index,
                    delta: {}, // Delta must be empty
                    logprobs: null,
                    finish_reason: cand.finish_reason,
                }],
                // Conditionally add usage property to satisfy TypeScript
                ...(data.usageMetadata && streamIncludeUsage ? { usage: transformUsage(data.usageMetadata) } : {})
            };
            // This final chunk will be sent by the flush function
            last[cand.index] = finalChunk;
        }
    }

    function toOpenAiStreamFlush(controller) {
        if (last.length > 0) {
            for (const finalChunk of last) {
                // Only send if it's an actual object, not the `true` placeholder
                if (finalChunk && typeof finalChunk === 'object') {
                    controller.enqueue(sseline(finalChunk));
                }
            }
        }
        controller.enqueue(`data: [DONE]${delimiter}`);
    }

    const parser = new TransformStream({
        transform: parseStream,
        flush: parseStreamFlush,
    });

    const transformer = new TransformStream({
        transform: toOpenAiStream,
        flush: toOpenAiStreamFlush,
    });

    const heartbeat = createHeartbeatStream();
    const textEncoderStream = new TextEncoderStream();
    
    inputStream
        .pipeThrough(parser)
        .pipeThrough(transformer)
        .pipeThrough(heartbeat)
        .pipeTo(textEncoderStream.writable);
        
    return textEncoderStream.readable;
}

async function handleModels(logStore) {
    await logger.log(logStore, `Fetching dynamic model list from Google.`);
    const apiKey = keyManager.getKey();
    if (!apiKey) {
        await logger.log(logStore, 'No available API keys to fetch model list.', 'ERROR');
        throw new HttpError("No available API keys", 500);
    }

    const keyIdentifier = `...${apiKey.slice(-4)}`;
    await logger.log(logStore, `Using key ${keyIdentifier} to fetch model list.`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

        const url = `${BASE_URL}/${API_VERSION}/models?key=${apiKey}`;
        const response = await fetch(url, { 
            method: 'GET', 
            headers: { "Content-Type": "application/json" },
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            keyManager.reportFailure(apiKey);
            const errorBody = await response.text();
            const errorMessage = `Failed to fetch model list from Google. Status: ${response.status}. Body: ${errorBody}`;
            await logger.log(logStore, errorMessage, 'ERROR');
            throw new HttpError(errorMessage, 502);
        }

        const googleResponse = await response.json();

        if (!googleResponse.models) {
            const errorMessage = `Google API response for models did not contain a "models" array. Response: ${JSON.stringify(googleResponse)}`;
            await logger.log(logStore, errorMessage, 'ERROR');
            throw new HttpError(errorMessage, 500);
        }

        const openAIResponse = {
            object: "list",
            data: googleResponse.models
                .map(model => ({
                    id: model.name.replace('models/', ''),
                    object: "model",
                    created: Math.floor(Date.now() / 1000),
                    owned_by: "google",
                }))
                .filter(model => model.id.includes('gemini') || model.id.includes('gemma'))
                .sort((a, b) => a.id.localeCompare(b.id)),
        };

        return new Response(JSON.stringify(openAIResponse), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        keyManager.reportFailure(apiKey);
        const errorMessage = error.name === 'AbortError' 
            ? 'Request to Google API timed out after 10 seconds.'
            : `Exception while fetching model list: ${error.message}`;
        
        await logger.log(logStore, errorMessage, 'ERROR');

        if (error instanceof HttpError) throw error;
        throw new HttpError(errorMessage, 504); // 504 Gateway Timeout
    }
}

async function handleDiagLogs(store) {
  const logs = await logger.getLogs(store);
  return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });
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
      cooldownUntil: status === 'cooldown' && failureTime ? new Date(failureTime + keyManager.FAILURE_COOLDOWN).toISOString() : null,
    };
  });
  const summary = {
    totalKeys: keyManager.keys.length,
    availableKeys: keyDetails.filter(k => k.status === 'available').length,
    cooldownKeys: keyDetails.filter(k => k.status === 'cooldown').length,
  };
  return new Response(JSON.stringify({ summary, details: keyDetails }), { headers: { 'Content-Type': 'application/json' } });
}

// --- Main Entry Point ---
export default {
  async fetch (request, context) {
    if (request.method === "OPTIONS") {
      return handleOPTIONS();
    }
    // @ts-ignore
    const logStore = context.blobs ? getStore(context, 'global-logs') : null;
    const errHandler = async (err) => {
      console.error(err);
      const status = err.status ?? 500;
      const message = err.message ?? 'An unknown error occurred.';
      await logger.log(logStore, `Request failed with unhandled error: ${message}`, 'CRITICAL');
      const errorResponse = new Response(JSON.stringify({ error: { message, type: 'server_error' } }), { status, headers: { 'Content-Type': 'application/json' } });
      return fixCors(errorResponse);
    };

    try {
      const { pathname } = new URL(request.url);
      switch (true) {
        case pathname.endsWith("/v1/chat/completions"):
          if (request.method !== "POST") throw new HttpError("Method not allowed", 405);
          const reqJson = await request.json();
          // @ts-ignore
          reqJson.signal = request.signal;
          return await handleCompletions(reqJson, logStore).catch(errHandler);
        case pathname.endsWith("/v1/models"):
          return await handleModels(logStore).then(fixCors).catch(errHandler);
        case pathname.endsWith('/v1/diag/status'):
          return fixCors(handleDiagStatus());
        case pathname.endsWith('/v1/diag/logs'):
          return await handleDiagLogs(logStore).then(fixCors).catch(errHandler);
        default:
          return fixCors(new Response("Not Found", { status: 404 }));
      }
    } catch (err) {
      return errHandler(err);
    }
  }
};
