const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

// --- Low-level fetch wrapper ---
async function ollamaFetch(endpoint, options = {}) {
  const url = `${OLLAMA_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama ${endpoint} failed (${res.status}): ${text}`);
    }
    return res;
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      throw new Error("Ollama is not running. Start it with: ollama serve");
    }
    throw err;
  }
}

// --- Health check ---
async function isOllamaRunning() {
  try {
    await ollamaFetch("/api/tags");
    return true;
  } catch {
    return false;
  }
}

// --- List installed models ---
async function listModels() {
  const res = await ollamaFetch("/api/tags");
  const data = await res.json();
  return (data.models || []).map((m) => ({
    name: m.name,
    size: m.size,
    sizeGb: (m.size / 1e9).toFixed(1),
    modified: m.modified_at,
    digest: m.digest,
    family: m.details?.family,
    parameterSize: m.details?.parameter_size,
    quantization: m.details?.quantization_level,
  }));
}

// --- Pull a model (streaming progress) ---
async function pullModel(modelName, onProgress) {
  const res = await ollamaFetch("/api/pull", {
    method: "POST",
    body: JSON.stringify({ name: modelName, stream: true }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (onProgress) {
          onProgress({
            status: event.status,
            total: event.total || 0,
            completed: event.completed || 0,
            percent:
              event.total > 0
                ? Math.round((event.completed / event.total) * 100)
                : 0,
          });
        }
        if (event.status === "success") {
          return { success: true, model: modelName };
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return { success: true, model: modelName };
}

// --- Delete a model ---
async function deleteModel(modelName) {
  await ollamaFetch("/api/delete", {
    method: "DELETE",
    body: JSON.stringify({ name: modelName }),
  });
  return { success: true };
}

// --- Chat completion (streaming) ---
async function chat(modelName, messages, options = {}) {
  const res = await ollamaFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  });

  return res; // caller handles the stream
}

// --- Single (non-streaming) chat ---
async function chatSync(modelName, messages, options = {}) {
  const res = await ollamaFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  });

  const data = await res.json();
  return {
    content: data.message?.content || "",
    tokensUsed: data.eval_count || 0,
    duration: data.total_duration || 0,
  };
}

// --- Hardware info from Ollama (GPU detection) ---
async function getHardwareInfo() {
  // Ollama doesn't expose a direct hardware API, but we can infer from ps
  // and supplement with OS-level detection
  const os = require("os");

  const info = {
    os: `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0]?.model || "Unknown",
    ram: `${Math.round(os.totalmem() / 1e9)} GB`,
    cores: os.cpus().length,
    platform: os.platform(),
    arch: os.arch(),
  };

  // Try to get GPU info from Ollama's running models endpoint
  try {
    const res = await ollamaFetch("/api/ps");
    const data = await res.json();
    // If models are loaded, we can see VRAM usage
    if (data.models?.length > 0) {
      const m = data.models[0];
      info.gpuDetected = true;
      info.vramUsed = m.size_vram;
    }
  } catch {
    // ps endpoint not critical
  }

  // Determine capability tier
  const ramGb = os.totalmem() / 1e9;
  if (ramGb >= 24) {
    info.tier = "excellent";
    info.message = `You're running ${info.cpu.split("@")[0].trim()} with ${info.ram} of memory. That's excellent — you can run most AI models comfortably.`;
  } else if (ramGb >= 12) {
    info.tier = "good";
    info.message = `You're running ${info.cpu.split("@")[0].trim()} with ${info.ram} of memory. That's solid — you can run most common AI models.`;
  } else {
    info.tier = "basic";
    info.message = `You're running ${info.cpu.split("@")[0].trim()} with ${info.ram} of memory. You can run smaller AI models comfortably.`;
  }

  return info;
}

// --- Model recommendation engine ---
function getRecommendation(familyProfiles, hardwareTier) {
  const hasKids = familyProfiles.some((p) => p.role === "child");
  const hasTeens = familyProfiles.some((p) => p.role === "teen");
  const adultsOnly = !hasKids && !hasTeens;

  const recs = {
    primary: {
      ollama: "llama3.1:8b",
      display: "Llama 3.1 8B",
      category: "general",
      size: "4.7 GB",
      reason: "Handles everyday tasks, writing, and questions well",
    },
    optional: [],
    setupLabel: adultsOnly ? "Quick Setup" : "Family Setup",
    description: adultsOnly
      ? "One model that covers most everyday tasks."
      : "Recommended for your family's mix of ages and needs.",
  };

  if (hasKids) {
    recs.optional.push({
      ollama: "phi3:mini",
      display: "Phi-3 Mini",
      category: "kids",
      size: "2.3 GB",
      reason: "Fast, lightweight, great for homework and age-appropriate help",
    });
  }

  if (hasTeens) {
    recs.optional.push({
      ollama: "mistral-nemo:12b",
      display: "Mistral Nemo 12B",
      category: "research",
      size: "7.1 GB",
      reason: "Stronger reasoning for school research and deeper questions",
    });
  }

  return recs;
}

// --- Vision OCR ---
const DEFAULT_VISION_MODEL = "llama3.2-vision";

// Get the configured vision model (from DB config or default)
function getVisionModel() {
  try {
    const { getConfig } = require("./db");
    const configured = getConfig("vision_model");
    return configured || DEFAULT_VISION_MODEL;
  } catch {
    return DEFAULT_VISION_MODEL;
  }
}

async function ensureVisionModel(onProgress) {
  const visionModel = getVisionModel();
  const models = await listModels();
  const hasVision = models.some((m) => m.name.startsWith(visionModel));
  if (hasVision) return visionModel;

  console.log(`[ollama] Vision model "${visionModel}" not found — pulling...`);
  await pullModel(visionModel, onProgress);
  console.log(`[ollama] Vision model "${visionModel}" pulled successfully`);
  return visionModel;
}

async function imageToText(imageBase64) {
  let lastLoggedPercent = -1;
  const visionModel = await ensureVisionModel((progress) => {
    const p = Math.floor(progress.percent / 10) * 10;
    if (p > lastLoggedPercent) {
      lastLoggedPercent = p;
      console.log(`[ollama] Pulling vision model: ${p}%`);
    }
  });

  const res = await ollamaFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model: visionModel,
      messages: [
        {
          role: "user",
          content: "Extract ALL text from this image exactly as it appears. Preserve the layout, numbers, dates, names, addresses, and any other details. If this is a receipt, invoice, form, or document, be thorough — every number and label matters. Output only the extracted text, nothing else.",
          images: [imageBase64],
        },
      ],
      stream: false,
      options: { temperature: 0.1 },
    }),
  });

  const data = await res.json();
  return data.message?.content?.trim() || "";
}

module.exports = {
  isOllamaRunning,
  listModels,
  pullModel,
  deleteModel,
  chat,
  chatSync,
  getHardwareInfo,
  getRecommendation,
  imageToText,
  ensureVisionModel,
  OLLAMA_BASE,
  DEFAULT_VISION_MODEL,
  getVisionModel,
};
