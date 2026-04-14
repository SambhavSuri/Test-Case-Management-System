import express from "express";
import cors from "cors";
import path from "path";
import * as db from "./utils/jsonDb";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
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

app.listen(PORT, () => {
  console.log(`TCMS Backend running on http://localhost:${PORT}`);
});
