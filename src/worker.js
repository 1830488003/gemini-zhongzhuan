// @ts-check

/**
 * Final Architecture: Replicating hajimi-main's KeyManager and ActiveRequestManager patterns.
 * This version includes robust key management and intelligent request coalescing for concurrent identical requests.
 */

// --- Configuration ---
const CUSTOM_AUTH_KEY = "67564534";
const BASE_URL = "https://generativelanguage.googleapis.com";
const API_VERSION = "v1beta";
// --- End Configuration ---

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "HttpError";
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
      "AIzaSyB8WZAjGkNvOsJbcnstmCRHZ7WyJ01r8TY", "AIzaSyAXDoNlu9u5dFhbJhkqru9iZXTd2yYn5-8", "AIzaSyAs9OfZmteNgOxy6L3AOQigZlzs8XAs8Jw",
      "AIzaSyBkaiGeEnkive8WwvMAEAne-nbfI4H2vyY", "AIzaSyDe2Viw5hlNTQM5gjQzl_mJqCMxFaSj3uA", "AIzaSyCR2faMADtxo8Hx8zhx-7b2eaEsuZQTtvY",
      "AIzaSyC7BsBAmQBZ8HsfqCjncYBwrwP5yiFXSRQ", "AIzaSyDw-Rju2wboU3hwwpIHg45x5R-IvvU1x38", "AIzaSyABlzNmp2RGAxxV5e13xs788ockChqSaTs",
      "AIzaSyACXBpBeJVH5hKzjM2i9Q5iMXwuBaQHADw", "AIzaSyDGETtwiz0HGTq8N2WBtyIplFM8qI2DvUY", "AIzaSyDJnBIUWUvHx3BgJhWJF6i_f9U8hPB7MPs",
      "AIzaSyB7HyFvYk6OCE9fMLQgAqGE86Vm2sndSdU", "AIzaSyAZnSkEYTrHDllSnUJN5Z4X7Gk6LgolOlQ", "AIzaSyBeKUxcOmpZhMJBsb6p35qZudj2ZrhCE-k",
      "AIzaSyDXVEqcRws1t69t1WZRdgxA7wbCHuqHCXw", "AIzaSyAZusyRzdrVBJpuI10f-8WE2WWKaeFh7X8", "AIzaSyDEC9CGlCL6mJtHwJ8yCLKTSJ4tw0r0Bkw",
      "AIzaSyC1U9RoDbO1ZKEGODAqmsq3xTymtDXIln8", "AIzaSyC1gvzCnW-uXVrhgAz0avPxdEzDBZ84BhE", "AIzaSyDg3bGQE2kRidsza75Jgqd1aLAx1fOkoJg",
      "AIzaSyBycxkw4QcR0WfJii76jJMXqZ6LlbGcaEU", "AIzaSyD-Nck_RoMaC2qc6PFVfaE7GTMNOe4y1D0", "AIzaSyA-ruVqZupqv0qT8oRAWku9xnYbKfrLwkQ",
      "AIzaSyAVKooPAg-S4MKcebFoSbaUNkVzDzFoIo4", "AIzaSyDE3Ojsaf1T8iGqnd_kHchLjge31eUPoJ4", "AIzaSyBeE75a3zINtAIwG4V1UL175aSjNb6pW9c",
      "AIzaSyAlL3tlKO22DrIDkmqs9ScJWFNFwfN4QEI", "AIzaSyBZdBawDf8ZPAKdxHtiywMsV5eHVGlL6Fo", "AIzaSyDNuuj3YPSpdbsfExNJu0PJnz-PXDIQTrs",
      "AIzaSyDt--WY2xGoqM_XNyNMTmq9t5Zqqq1t0tQ", "AIzaSyCqD4Uxj9DjUuqg1ORz2ncZrfcZ9ZebdWw", "AIzaSyDBUenFxYtpl_SH5XDBtbJqLPOH540B9xk",
      "AIzaSyDbc_oT_gcii4LDK6fcqZ8NHNoDdKMOgOU", "AIzaSyB7LOzoGW5DC3q-u6eupw14UoAh_3rZxQ0", "AIzaSyDxawl15iofU9tXv-7SvRVENDlDEtaY5M4",
      "AIzaSyArF3Fb8UHz3fYB8hhmRot1nXOZ7b7Og0M", "AIzaSyApJqDcpJ6EeuM0149xP-UU0WtO76OWZrg", "AIzaSyBd240-bXhtrSv2l7cU1ii5G8-DBQfS0HA",
      "AIzaSyANug4zv8RMBBjyCOZHpMZmKaWTA71KJDw", "AIzaSyB8mSPkJ-kxXTV3gf300C9YjkUceM5d2bM", "AIzaSyAedrnoL7BXuKbOLZM-z6Ll-kLEeYZBQ28",
      "AIzaSyBsX7XxZGj21wMc7Jz3TQ2jPORl3bEIrP8", "AIzaSyDCfTx9vssaUE32lhgNwSMYqyzS5P2HghU", "AIzaSyDrogC_c1_ettNZ2RVCDcbkVVN4pRndH4I",
      "AIzaSyAo1gjCJwTOdmSeFjphBOgH_OYU-j9awBM", "AIzaSyCcgSeznPu_I75xhxOk-dr7DdIG5unaeQM"
    ];
    /** @type {Map<string, number>} */
    this.failedKeys = new Map(); // Store key and timestamp of failure
    this.FAILURE_COOLDOWN = 10 * 60 * 1000; // 10 minutes
    console.log(`KeyManager: Initialized with ${this.keys.length} built-in keys.`);
  }

  getKey() {
    const now = Date.now();
    const availableKeys = this.keys.filter(key => {
      const failureTime = this.failedKeys.get(key);
      return !failureTime || (now - failureTime > this.FAILURE_COOLDOWN);
    });
    if (availableKeys.length === 0) return null;
    return availableKeys[Math.floor(Math.random() * availableKeys.length)];
  }

  reportFailure(key) {
    if (key) {
      this.failedKeys.set(key, Date.now());
      console.warn(`KeyManager: Reported failure for key ...${key.slice(-4)}. Cooldown started.`);
    }
  }
}

/**
 * Manages active in-flight requests to avoid duplicate API calls.
 */
class ActiveRequestManager {
    constructor() {
        /** @type {Map<string, Promise<Response>>} */
        this.pending = new Map();
    }

    /**
     * @param {string} key
     * @returns {Promise<Response> | undefined}
     */
    get(key) {
        return this.pending.get(key);
    }

    /**
     * @param {string} key
     * @param {Promise<Response>} promise
     */
    add(key, promise) {
        this.pending.set(key, promise);
        // Ensure the promise is removed from the map once it's settled.
        promise.finally(() => {
            this.pending.delete(key);
        });
    }
}


// --- Global Instances ---
const keyManager = new KeyManager();
const activeRequestManager = new ActiveRequestManager();


// --- Utility Functions ---

/**
 * Generates a stable SHA-256 hash for a given request object.
 * @param {any} obj
 * @returns {Promise<string>}
 */
async function generateRequestHash(obj) {
    const stableString = JSON.stringify(obj);
    const encoder = new TextEncoder();
    const data = encoder.encode(stableString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


function verifyAuth(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const clientKey = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  if (clientKey !== CUSTOM_AUTH_KEY) {
    throw new HttpError("Unauthorized", 401);
  }
}

// --- Data Transformation ---

function convertMessagesToGemini(messages) {
  /** @type {{parts: {text: string}[]} | null} */
  let system_instruction = null;
  const contents = [];
  let lastRole = null;
  for (const message of messages) {
    const role = message.role === "assistant" ? "model" : "user";
    if (message.role === "system") {
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
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  ];
  const geminiRequest = { contents, generationConfig, safetySettings };
  if (system_instruction) {
    geminiRequest.system_instruction = system_instruction;
  }
  return geminiRequest;
}

function transformStreamChunkToOpenAI(geminiChunk, id, model) {
    if (!geminiChunk.candidates) return "";
    const content = geminiChunk.candidates[0]?.content?.parts?.[0]?.text || "";
    const choice = { index: 0, delta: { content }, finish_reason: geminiChunk.candidates[0]?.finishReason ? "stop" : null };
    return `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model, choices: [choice] })}\n\n`;
}

// --- Core Request Logic ---

/**
 * Executes the actual fetch to the Google API and handles the response.
 * This is wrapped by handleChatCompletions to add request coalescing.
 */
async function executeChatCompletion(request) {
    const openaiRequest = await request.clone().json();
    const model = openaiRequest.model || "gemini-1.5-flash";
    const geminiRequest = transformRequestToGemini(openaiRequest);
    const stream = openaiRequest.stream || false;
    const url = `${BASE_URL}/${API_VERSION}/models/${model}:${stream ? "streamGenerateContent" : "generateContent"}`;
    let lastError = null;

    for (let i = 0; i < 5; i++) {
        const apiKey = keyManager.getKey();
        if (!apiKey) throw new HttpError("No available API keys.", 503);
        const requestUrl = new URL(url);
        requestUrl.searchParams.set("key", apiKey);

        try {
            const response = await fetch(requestUrl.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiRequest) });
            if (response.ok) {
                // To make the response body reusable for coalesced requests, we need to clone it.
                return response.clone();
            }
            keyManager.reportFailure(apiKey);
            lastError = new HttpError(`Google API returned status ${response.status}`, response.status);
        } catch (error) {
            keyManager.reportFailure(apiKey);
            lastError = error;
        }
    }
    throw lastError || new HttpError("All API key attempts failed.", 500);
}


async function handleChatCompletions(request) {
    const requestBody = await request.clone().json();
    const hashKey = await generateRequestHash(requestBody);
    
    let pendingPromise = activeRequestManager.get(hashKey);
    if (pendingPromise) {
        console.log(`Request coalescing: Found active request for hash ${hashKey.slice(0, 8)}...`);
        return (await pendingPromise).clone();
    }

    const executionPromise = executeChatCompletion(request);
    activeRequestManager.add(hashKey, executionPromise);
    
    const response = await executionPromise;

    // Process the response for the original caller
    if (requestBody.stream) {
        const id = `chatcmpl-${Date.now()}`;
        const model = requestBody.model || "gemini-1.5-flash";
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const body = response.body;
        if (!body) throw new HttpError("Response body is null", 500);
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        (async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            try {
                                const jsonStr = line.substring(6);
                                const geminiChunk = JSON.parse(jsonStr);
                                const openaiChunk = transformStreamChunkToOpenAI(geminiChunk, id, model);
                                if (openaiChunk) writer.write(encoder.encode(openaiChunk));
                            } catch (e) { console.error("Error parsing stream chunk:", e, "Line:", line); }
                        }
                    }
                }
            } catch (e) { writer.abort(e); }
            finally {
                writer.write(encoder.encode("data: [DONE]\n\n"));
                writer.close();
            }
        })();
        return new Response(readable, { headers: { "Content-Type": "text/event-stream" } });
    } else {
        const geminiJson = await response.json();
        if (!geminiJson.candidates) throw new HttpError("Invalid response from Gemini", 500);
        const content = geminiJson.candidates[0].content?.parts?.[0]?.text || "";
        const openaiResponse = {
            id: `chatcmpl-${Date.now()}`, object: "chat.completion", created: Math.floor(Date.now() / 1000), model: requestBody.model || "gemini-1.5-flash",
            choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
            usage: {
                prompt_tokens: geminiJson.usageMetadata?.promptTokenCount || 0,
                completion_tokens: geminiJson.usageMetadata?.candidatesTokenCount || 0,
                total_tokens: geminiJson.usageMetadata?.totalTokenCount || 0,
            },
        };
        return new Response(JSON.stringify(openaiResponse), { headers: { "Content-Type": "application/json" } });
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
        throw new HttpError("No available API keys to fetch models.", 503);
    }
    const url = `${BASE_URL}/${API_VERSION}/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new HttpError(`Failed to fetch models from Google: ${response.status}`, response.status);
        }
        const googleJson = await response.json();
        const openAIResponse = {
            object: "list",
            data: googleJson.models.map(model => ({
                id: model.name.replace("models/", ""),
                object: "model",
                created: new Date(model.createTime).getTime() / 1000,
                owned_by: "google",
            })),
        };
        return new Response(JSON.stringify(openAIResponse), { headers: { "Content-Type": "application/json" } });
    } catch (error) {
        console.error("Error in handleModels:", error);
        keyManager.reportFailure(apiKey);
        throw error;
    }
}

/**
 * Handles requests for the diagnostic status.
 * @returns {Response}
 */
function handleDiagStatus() {
    const status = {
        keys_loaded: keyManager.keys.length,
        keys_in_cooldown: keyManager.failedKeys.size,
    };
    return new Response(JSON.stringify(status), { headers: { "Content-Type": "application/json" } });
}


// --- Main Entry Point ---

async function handleRequest(request, env) {
  const addCors = (response) => {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
  };

  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*" } });
    }

    // No longer need to load keys from env, they are built-in.
    verifyAuth(request);

    const { pathname } = new URL(request.url);
    if (pathname.endsWith("/chat/completions")) {
      const response = await handleChatCompletions(request);
      return addCors(response);
    }
    
    if (pathname.endsWith("/v1/models")) {
        const response = await handleModels();
        return addCors(response);
    }

    if (pathname.endsWith("/v1/diag/status")) {
        const response = handleDiagStatus();
        return addCors(response);
    }

    return addCors(new Response("Not Found", { status: 404 }));

  } catch (error) {
    console.error("Unhandled error in handleRequest:", error);
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    const errorResponse = new Response(JSON.stringify({ error: { message, type: 'server_error' } }), { status, headers: { "Content-Type": "application/json" } });
    return addCors(errorResponse);
  }
}

export default {
  fetch: handleRequest,
};
