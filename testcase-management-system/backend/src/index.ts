import express from "express";
import cors from "cors";
import path from "path";
import * as db from "./utils/jsonDb";
import multer from "multer";
import { promises as fs } from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const upload = multer({ dest: path.join(__dirname, "..", "uploads") });

// --- Example generic routes for JSON local storage ---

app.get("/api/:collection", async (req, res) => {
  try {
    const data = await db.readCollection(req.params.collection);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/:collection/:id", async (req, res) => {
  try {
    const item = await db.findById(req.params.collection, req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/:collection", async (req, res) => {
  try {
    const newItem = await db.insert(req.params.collection, req.body);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/:collection/:id", async (req, res) => {
  try {
    const updated = await db.update(req.params.collection, req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/:collection/:id", async (req, res) => {
  try {
    const success = await db.remove(req.params.collection, req.params.id);
    if (!success) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Auth stub mapping to users
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await db.readCollection("users");
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ token: "mock-jwt-token-123", user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// ── AI Generate Test Cases from BRD ───────────────────────
app.post("/api/ai/generate", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const LITELLM_API_BASE = process.env.LITELLM_API_BASE || "";
    const LITELLM_USERNAME = process.env.LITELLM_USERNAME || "";
    const LITELLM_PASSWORD = process.env.LITELLM_PASSWORD || "";
    const LITELLM_MODEL = process.env.LITELLM_MODEL || "gemini/gemini-2.0-flash-lite";

    if (!LITELLM_API_BASE || LITELLM_API_BASE === "your_uri_here") {
      return res.status(500).json({ error: "LITELLM_API_BASE not configured in .env" });
    }
    if (!LITELLM_USERNAME || LITELLM_USERNAME === "your_username_here") {
      return res.status(500).json({ error: "LITELLM_USERNAME not configured in .env" });
    }

    // Extract text from the uploaded file
    let text = "";
    const filePath = file.path;
    const ext = (file.originalname || "").toLowerCase().split(".").pop();

    if (ext === "txt") {
      text = await fs.readFile(filePath, "utf-8");
    } else if (ext === "pdf") {
      const pdfParse = require("pdf-parse");
      const buffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (ext === "docx") {
      // Read docx as raw XML and extract text between tags
      const buffer = await fs.readFile(filePath);
      const raw = buffer.toString("utf-8");
      text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length < 50) {
        text = "Could not parse DOCX content. Please try TXT or PDF.";
      }
    } else {
      return res.status(400).json({ error: "Unsupported file type. Use PDF, DOCX, or TXT." });
    }

    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});

    // Truncate text if too long
    const maxChars = 30000;
    if (text.length > maxChars) text = text.substring(0, maxChars);

    // Call Gemini API
    const prompt = `You are a senior QA engineer. Analyze the following Business Requirements Document (BRD) and generate comprehensive test cases.

For each test case, provide:
- title: A clear, concise test case title
- description: What this test case validates
- preconditions: Any setup required before executing
- steps: An array of step objects, each with "step" (action to perform) and "expected" (expected result)
- priority: One of "Critical", "High", "Medium", "Low"
- type: One of "Functional", "Regression", "Smoke", "Integration", "Performance", "Security"

Return ONLY a valid JSON array of test case objects. No markdown, no code blocks, just the JSON array.

BRD Document:
${text}`;

    const litellmUrl = `${LITELLM_API_BASE}/chat/completions`;

    const basicAuth = Buffer.from(`${LITELLM_USERNAME}:${LITELLM_PASSWORD}`).toString("base64");

    const litellmRes = await fetch(litellmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        model: LITELLM_MODEL,
        messages: [
          { role: "system", content: "You are a senior QA engineer who generates comprehensive test cases from requirement documents." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8192,
      })
    });

    if (!litellmRes.ok) {
      const errBody = await litellmRes.text();
      console.error("LiteLLM API error:", errBody);
      return res.status(500).json({ error: "LiteLLM API error", details: errBody });
    }

    const litellmData = await litellmRes.json();
    const rawText = litellmData?.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown code blocks if present)
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let testCases: any[] = [];
    try {
      testCases = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", cleaned.substring(0, 500));
      return res.status(500).json({ error: "Failed to parse AI response", raw: cleaned.substring(0, 1000) });
    }

    if (!Array.isArray(testCases)) {
      testCases = [testCases];
    }

    res.json({ testCases, documentChars: text.length });
  } catch (error: any) {
    console.error("AI generate error:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`TCMS Backend running on http://localhost:${PORT}`);
});
