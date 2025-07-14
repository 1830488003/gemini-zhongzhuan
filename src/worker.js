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

// --- Global Instances ---
const keyManager = new KeyManager();

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

// --- Core Request Logic ---

const generateId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomChar = () => characters[Math.floor(Math.random() * characters.length)];
  return Array.from({ length: 29 }, randomChar).join("");
};

const reasonsMap = {
  "STOP": "stop",
  "MAX_TOKENS": "length",
  "SAFETY": "content_filter",
  "RECITATION": "content_filter",
};

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

const checkPromptBlock = (choices, promptFeedback, key) => {
  if (choices.length) { return; }
  if (promptFeedback?.blockReason) {
    choices.push({
      index: 0,
      [key]: null,
      finish_reason: "content_filter",
    });
  }
  return true;
};

const processCompletionsResponse = (data, model, id) => {
  const obj = {
    id,
    choices: data.candidates.map(transformCandidatesMessage),
    created: Math.floor(Date.now()/1000),
    model: model,
    object: "chat.completion",
    usage: data.usageMetadata && transformUsage(data.usageMetadata),
  };
  if (obj.choices.length === 0 ) {
    checkPromptBlock(obj.choices, data.promptFeedback, "message");
  }
  return JSON.stringify(obj);
};

const sseline = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

async function handleChatCompletions(request) {
    const openaiRequest = await request.clone().json();
    const model = openaiRequest.model || "gemini-1.5-flash";
    const geminiRequest = transformRequestToGemini(openaiRequest);
    const stream = openaiRequest.stream || false;
    
    const id = `chatcmpl-${generateId()}`;

    if (stream) {
        // This is the "fake streaming" logic.
        // We make a non-streaming request to the backend, but stream the response to the client.
        const readableStream = new ReadableStream({
            async start(controller) {
                const created = Math.floor(Date.now() / 1000);

                // Use the non-streaming URL
                const nonStreamUrl = `${BASE_URL}/${API_VERSION}/models/${model}:generateContent`;
                
                let finalResponse;
                let lastError;

                // Retry loop to find a working key for the non-streaming call
                for (let i = 0; i < 5; i++) {
                    const apiKey = keyManager.getKey();
                    if (!apiKey) {
                        lastError = new HttpError("No available API keys.", 503);
                        break;
                    }
                    const requestUrl = new URL(nonStreamUrl);
                    requestUrl.searchParams.set("key", apiKey);

                    try {
                        const fetchResponse = await fetch(requestUrl.toString(), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(geminiRequest)
                        });

                        if (fetchResponse.ok) {
                            finalResponse = await fetchResponse.json();
                            break; // Success
                        }
                        keyManager.reportFailure(apiKey);
                        lastError = new HttpError(`Google API returned status ${fetchResponse.status}`, fetchResponse.status);
                    } catch (error) {
                        keyManager.reportFailure(apiKey);
                        lastError = error;
                    }
                }

                if (!finalResponse) {
                     const errorChunk = {
                        id, created, model, object: "chat.completion.chunk",
                        choices: [{ index: 0, delta: { content: `Error: ${lastError?.message || 'All API key attempts failed.'}` }, finish_reason: 'error' }]
                    };
                    controller.enqueue(sseline(errorChunk));
                    controller.enqueue("data: [DONE]\n\n");
                    controller.close();
                    return;
                }

                // Now, we have the full response. We need to chunk it for the client.
                const fullMessage = finalResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const finishReason = reasonsMap[finalResponse.candidates?.[0]?.finishReason] || "stop";

                // 1. Send initial role chunk
                controller.enqueue(sseline({
                    id, created, model, object: "chat.completion.chunk",
                    choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }]
                }));

                // 2. Send content chunks
                const chunkSize = 5; // Send 5 characters at a time
                for (let i = 0; i < fullMessage.length; i += chunkSize) {
                    const contentChunk = fullMessage.substring(i, i + chunkSize);
                    controller.enqueue(sseline({
                        id, created, model, object: "chat.completion.chunk",
                        choices: [{ index: 0, delta: { content: contentChunk }, finish_reason: null }]
                    }));
                    await new Promise(resolve => setTimeout(resolve, 5)); 
                }

                // 3. Send final chunk with finish reason
                controller.enqueue(sseline({
                    id, created, model, object: "chat.completion.chunk",
                    choices: [{ index: 0, delta: {}, finish_reason: finishReason }]
                }));

                // 4. Send DONE signal
                controller.enqueue("data: [DONE]\n\n");
                controller.close();
            }
        });

        return new Response(readableStream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });

    } else {
        // This is the standard non-streaming logic.
        let response;
        let lastError;

        for (let i = 0; i < 5; i++) {
            const apiKey = keyManager.getKey();
            if (!apiKey) throw new HttpError("No available API keys.", 503);
            const requestUrl = new URL(`${BASE_URL}/${API_VERSION}/models/${model}:generateContent`);
            requestUrl.searchParams.set("key", apiKey);

            try {
                const fetchResponse = await fetch(requestUrl.toString(), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(geminiRequest)
                });

                if (fetchResponse.ok) {
                    response = fetchResponse;
                    break; // Success
                }
                keyManager.reportFailure(apiKey);
                lastError = new HttpError(`Google API returned status ${fetchResponse.status}`, fetchResponse.status);
            } catch (error) {
                keyManager.reportFailure(apiKey);
                lastError = error;
            }
        }

        if (!response) {
            throw lastError || new HttpError("All API key attempts failed.", 500);
        }
        
        const geminiJson = await response.json();
        const body = processCompletionsResponse(geminiJson, model, id);
        return new Response(body, { headers: { "Content-Type": "application/json" } });
    }
}

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

    // verifyAuth(request); // Removed custom auth to allow any key from client.

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
