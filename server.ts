import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3006', 10);

// Increase payload limit for base64 files
app.use(express.json({ limit: '50mb' }));

// Helper function for artificial delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Retry logic for Gemini API
async function callGeminiWithRetry(apiKey: string, modelName: string, prompt: string, fileData: { mimeType: string, data: string }, retries = 3) {
  // If a custom API key is provided, we create a temporary instance
  const genAI = apiKey === process.env.GEMINI_API_KEY ? ai : new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  for (let i = 0; i < retries; i++) {
    try {
      const result = await genAI.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: fileData }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });
      return result.text || "";
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const isRateLimit = status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
      
      if (isRateLimit && i < retries - 1) {
        const delay = Math.pow(2, i) * 3000; // Increase initial delay to 3s
        console.log(`Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

// API Routes
app.post("/api/process-ocr", async (req, res) => {
  try {
    const { fileBase64, mimeType, prompt, customApiKey } = req.body;

    if (!fileBase64 || !mimeType || !prompt) {
      return res.status(400).json({ error: "Missing required fields: fileBase64, mimeType, prompt are required." });
    }

    // Use user-provided key if available, otherwise fallback to system key
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API Key not configured on server." });
    }

    const text = await callGeminiWithRetry(
      apiKey,
      "gemini-2.5-flash",
      prompt,
      { mimeType, data: fileBase64 }
    );

    res.json({ text });
  } catch (error: any) {
    console.error("OCR Processing Error:", error);
    const status = error?.status || 500;
    const message = error?.message || "Internal server error during OCR processing";
    res.status(status).json({ error: message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
