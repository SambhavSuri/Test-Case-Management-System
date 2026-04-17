import express from "express";
import cors from "cors";
import path from "path";
import * as db from "./utils/jsonDb";
import multer from "multer";
import { promises as fs } from "fs";
import { readdirSync } from "fs";
import { spawn, ChildProcess } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const upload = multer({ dest: path.join(__dirname, "..", "uploads") });

// ── Azure DevOps Integration ─────────────────────────────
const AZURE_ORG_URL = process.env.AZURE_ORG_URL || "";
const AZURE_PROJECT = process.env.AZURE_PROJECT || "";
const AZURE_PAT = process.env.AZURE_PAT || "";
const azureAuth = Buffer.from(`:${AZURE_PAT}`).toString("base64");
const azureHeaders = { "Content-Type": "application/json", "Authorization": `Basic ${azureAuth}` };
const azurePatchHeaders = { "Content-Type": "application/json-patch+json", "Authorization": `Basic ${azureAuth}` };

app.get("/api/azure/test-connection", async (_req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured in .env" });
  try {
    const r = await fetch(`${AZURE_ORG_URL}/_apis/projects?api-version=7.0`, { headers: azureHeaders });
    if (!r.ok) return res.status(401).json({ error: "Invalid PAT or org URL", details: await r.text() });
    const data = await r.json();
    const project = data.value?.find((p: any) => p.name === AZURE_PROJECT);
    res.json({ connected: true, org: AZURE_ORG_URL, project: project ? project.name : "Not found", projectId: project?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/azure/users", async (_req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  try {
    const teamsRes = await fetch(`${AZURE_ORG_URL}/_apis/projects/${encodeURIComponent(AZURE_PROJECT)}/teams?api-version=7.0`, { headers: azureHeaders });
    if (!teamsRes.ok) return res.status(500).json({ error: "Failed to fetch teams" });
    const teamsData = await teamsRes.json();
    const allMembers: any[] = [];
    const seen = new Set<string>();
    for (const team of teamsData.value || []) {
      const membersRes = await fetch(`${AZURE_ORG_URL}/_apis/projects/${encodeURIComponent(AZURE_PROJECT)}/teams/${team.id}/members?api-version=7.0`, { headers: azureHeaders });
      if (!membersRes.ok) continue;
      const membersData = await membersRes.json();
      for (const m of membersData.value || []) {
        const identity = m.identity;
        if (identity && !identity.isContainer && !seen.has(identity.uniqueName)) {
          seen.add(identity.uniqueName);
          allMembers.push({ id: identity.id, displayName: identity.displayName, uniqueName: identity.uniqueName, imageUrl: identity.imageUrl });
        }
      }
    }
    res.json(allMembers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/azure/create-workitem", async (req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  const { title, description, assignedTo, tags } = req.body;
  const patchDoc = [
    { op: "add", path: "/fields/System.Title", value: title },
    { op: "add", path: "/fields/System.Description", value: description || "" },
    { op: "add", path: "/fields/System.Tags", value: tags || "TCMS;Escalation" },
  ];
  if (assignedTo) patchDoc.push({ op: "add", path: "/fields/System.AssignedTo", value: assignedTo });
  try {
    const r = await fetch(`${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_apis/wit/workitems/$Issue?api-version=7.0`, {
      method: "POST", headers: azurePatchHeaders, body: JSON.stringify(patchDoc),
    });
    if (!r.ok) { const errText = await r.text(); console.error("Azure create work item error:", errText); return res.status(500).json({ error: "Failed to create work item", details: errText }); }
    const wi = await r.json();
    res.json({ id: wi.id, url: wi._links?.html?.href || `${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_workitems/edit/${wi.id}`, state: wi.fields?.["System.State"] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/azure/workitem/:id", async (req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  try {
    const r = await fetch(`${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_apis/wit/workitems/${req.params.id}?api-version=7.0`, { headers: azureHeaders });
    if (!r.ok) return res.status(404).json({ error: "Work item not found" });
    const wi = await r.json();
    res.json({ id: wi.id, state: wi.fields?.["System.State"], assignedTo: wi.fields?.["System.AssignedTo"]?.displayName || "", title: wi.fields?.["System.Title"], url: wi._links?.html?.href || `${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_workitems/edit/${wi.id}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update work item state
app.put("/api/azure/workitem/:id/state", async (req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  const { state } = req.body;
  if (!state) return res.status(400).json({ error: "State required" });
  try {
    const patchDoc = [{ op: "add", path: "/fields/System.State", value: state }];
    const r = await fetch(`${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_apis/wit/workitems/${req.params.id}?api-version=7.0`, {
      method: "PATCH", headers: azurePatchHeaders, body: JSON.stringify(patchDoc),
    });
    if (!r.ok) { const errText = await r.text(); return res.status(500).json({ error: "Failed to update state", details: errText }); }
    const wi = await r.json();
    res.json({ id: wi.id, state: wi.fields?.["System.State"] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch sprints (iterations) from Azure DevOps across all teams
app.get("/api/azure/sprints", async (_req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  try {
    // Fetch all teams
    const teamsRes = await fetch(`${AZURE_ORG_URL}/_apis/projects/${encodeURIComponent(AZURE_PROJECT)}/teams?api-version=7.0`, { headers: azureHeaders });
    if (!teamsRes.ok) return res.status(500).json({ error: "Failed to fetch teams" });
    const teamsData = await teamsRes.json();

    const allSprints: any[] = [];
    const seen = new Set<string>();

    for (const team of teamsData.value || []) {
      const iterRes = await fetch(`${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/${encodeURIComponent(team.name)}/_apis/work/teamsettings/iterations?api-version=7.0`, { headers: azureHeaders });
      if (!iterRes.ok) continue;
      const iterData = await iterRes.json();
      for (const iter of iterData.value || []) {
        if (seen.has(iter.id)) continue;
        seen.add(iter.id);
        const attrs = iter.attributes || {};
        allSprints.push({
          id: iter.id,
          name: iter.name,
          path: iter.path,
          startDate: attrs.startDate ? attrs.startDate.split("T")[0] : "",
          endDate: attrs.finishDate ? attrs.finishDate.split("T")[0] : "",
          timeFrame: attrs.timeFrame || "future",
        });
      }
    }

    // Also fetch project-level iterations to catch any not assigned to a team
    const projIterRes = await fetch(`${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`, { headers: azureHeaders });
    if (projIterRes.ok) {
      const projIterData = await projIterRes.json();
      const walkNodes = (node: any) => {
        if (node.identifier && !seen.has(node.identifier)) {
          seen.add(node.identifier);
          const attrs = node.attributes || {};
          allSprints.push({
            id: node.identifier,
            name: node.name,
            path: node.path || node.name,
            startDate: attrs.startDate ? attrs.startDate.split("T")[0] : "",
            endDate: attrs.finishDate ? attrs.finishDate.split("T")[0] : "",
            timeFrame: "future",
          });
        }
        for (const child of node.children || []) walkNodes(child);
      };
      // Walk children, skip the root node itself
      for (const child of projIterData.children || []) walkNodes(child);
    }

    res.json(allSprints);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync sprints into test plans
app.post("/api/azure/sync-sprints", async (_req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  try {
    // Fetch sprints
    const sprintsRes = await fetch(`http://localhost:${process.env.PORT || 3001}/api/azure/sprints`);
    if (!sprintsRes.ok) return res.status(500).json({ error: "Failed to fetch sprints" });
    const sprints = await sprintsRes.json();

    // Fetch existing plans
    const plans = await db.readCollection("testplans");

    let created = 0, updated = 0;
    for (const sprint of sprints) {
      const existing = plans.find((p: any) => p.azureIterationId === sprint.id);
      if (existing) {
        // Update dates if changed
        const needsUpdate = existing.startDate !== sprint.startDate || existing.endDate !== sprint.endDate || existing.name !== sprint.name;
        if (needsUpdate) {
          await db.update("testplans", existing.id, {
            name: sprint.name,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
          });
          updated++;
        }
      } else {
        // Create new plan from sprint
        await db.insert("testplans", {
          name: sprint.name,
          description: `Synced from Azure DevOps: ${sprint.path}`,
          status: sprint.timeFrame === "past" ? "Completed" : "In Progress",
          owner: "",
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          createdAt: new Date().toISOString().split("T")[0],
          azureIterationId: sprint.id,
          azureIterationPath: sprint.path,
          assignments: [],
        });
        created++;
      }
    }

    res.json({ synced: sprints.length, created, updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/azure/workitem/:id/comments", async (req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  try {
    const r = await fetch(`${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_apis/wit/workitems/${req.params.id}/comments?api-version=7.0-preview.4`, { headers: azureHeaders });
    if (!r.ok) return res.status(500).json({ error: "Failed to fetch comments" });
    const data = await r.json();
    const comments = (data.comments || []).map((c: any) => ({ id: c.id, text: c.text, createdBy: c.createdBy?.displayName || "Unknown", createdDate: c.createdDate, source: "azure" }));
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/azure/workitem/:id/comments", async (req, res) => {
  if (!AZURE_ORG_URL || !AZURE_PAT) return res.status(500).json({ error: "Azure not configured" });
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Comment text required" });
  try {
    const r = await fetch(`${AZURE_ORG_URL}/${encodeURIComponent(AZURE_PROJECT)}/_apis/wit/workitems/${req.params.id}/comments?api-version=7.0-preview.4`, {
      method: "POST", headers: azureHeaders, body: JSON.stringify({ text: text.trim() }),
    });
    if (!r.ok) return res.status(500).json({ error: "Failed to add comment", details: await r.text() });
    const c = await r.json();
    res.json({ id: c.id, text: c.text, createdBy: c.createdBy?.displayName, createdDate: c.createdDate, source: "tcms" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Automation Runner ────────────────────────────────────
const AUTOMATION_SUITE_DIR = process.env.AUTOMATION_SUITE_PATH || path.resolve(__dirname, "..", "..", "..", "..", "Automated_UI_Test_Cases");
let activeAutomationProcess: ChildProcess | null = null;

// Persistent run state so frontend can reconnect after tab switch
interface AutomationRunState {
  isRunning: boolean;
  outputLines: { type: string; text: string }[];
  progress: { passed: number; failed: number; skipped: number; errors: number; total: number };
  results: any[] | null;
  liveResults: any[];
  runId: string;
  planId: string;
  exitCode: number | null;
}
let automationRunState: AutomationRunState = {
  isRunning: false, outputLines: [], progress: { passed: 0, failed: 0, skipped: 0, errors: 0, total: 0 },
  results: null, liveResults: [], runId: "", planId: "", exitCode: null,
};

// Get current automation run state (for reconnecting after tab switch)
app.get("/api/automation/status", (_req, res) => {
  res.json(automationRunState);
});

// Reconnect to active automation run SSE stream
app.get("/api/automation/reconnect", (req, res) => {
  const clients = (globalThis as any).__automationSSEClients as Set<typeof res> | null;
  if (!clients || !activeAutomationProcess) {
    res.status(404).json({ error: "No active run to reconnect to" });
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache",
    "Connection": "keep-alive", "Access-Control-Allow-Origin": "*",
  });
  clients.add(res);
  req.on("close", () => { clients.delete(res); });
});

// Reset automation state (clear completed run so user can start fresh)
app.post("/api/automation/reset", (_req, res) => {
  automationRunState = {
    isRunning: false, outputLines: [], progress: { passed: 0, failed: 0, skipped: 0, errors: 0, total: 0 },
    results: null, liveResults: [], runId: "", planId: "", exitCode: null,
  };
  res.json({ reset: true });
});

// Cancel the running automation
app.post("/api/automation/cancel", (_req, res) => {
  if (activeAutomationProcess) {
    activeAutomationProcess.kill("SIGTERM");
    activeAutomationProcess = null;
    automationRunState.isRunning = false;
    automationRunState.outputLines.push({ type: "error", text: "Run cancelled by user." });
    res.json({ cancelled: true });
  } else {
    res.json({ cancelled: false, message: "No run in progress" });
  }
});

// List available test files with their test functions
app.get("/api/automation/test-files", async (_req, res) => {
  try {
    const testsDir = path.join(AUTOMATION_SUITE_DIR, "tests");
    const files = readdirSync(testsDir).filter(f => f.startsWith("test_") && f.endsWith(".py")).sort();
    const result = [];
    for (const f of files) {
      const raw = f.replace(/^test_\d+_/, "").replace(".py", "").replace(/_/g, " ");
      const displayName = raw.charAt(0).toUpperCase() + raw.slice(1);
      // Parse test function names from the file
      const content = await fs.readFile(path.join(testsDir, f), "utf-8");
      const testFunctions = content.match(/^def (test_\w+)/gm)?.map(m => m.replace("def ", "")) || [];
      result.push({ filename: f, displayName, testCount: testFunctions.length, tests: testFunctions });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Shared pytest runner helper ─────────────────────────
function startPytestRun(
  req: express.Request, res: express.Response,
  pytestArgs: string[], planId: string,
  initialProgress: { passed: number; failed: number; skipped: number; errors: number },
  preSentResults: Set<string>
) {
  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache",
    "Connection": "keep-alive", "Access-Control-Allow-Origin": "*",
  });

  // Reset run state (preserve initial progress for resume)
  automationRunState = {
    isRunning: true, outputLines: [], progress: {
      passed: initialProgress.passed, failed: initialProgress.failed,
      skipped: initialProgress.skipped, errors: initialProgress.errors,
      total: initialProgress.passed + initialProgress.failed + initialProgress.skipped + initialProgress.errors
    },
    results: null, liveResults: [], runId: "", planId, exitCode: null,
  };

  const sseClients = new Set<typeof res>();
  sseClients.add(res);

  const sendEvent = (data: any) => {
    if (data.type === "output" || data.type === "error" || data.type === "status") {
      automationRunState.outputLines.push({ type: data.type, text: data.line || data.message || "" });
      if (automationRunState.outputLines.length > 3000) automationRunState.outputLines = automationRunState.outputLines.slice(-2000);
    }
    if (data.type === "progress") automationRunState.progress = data;
    for (const client of sseClients) {
      try { client.write(`data: ${JSON.stringify(data)}\n\n`); } catch { sseClients.delete(client); }
    }
  };

  (globalThis as any).__automationSSEClients = sseClients;

  sendEvent({ type: "status", message: `Starting pytest: python3 ${pytestArgs.join(" ")}` });

  const child = spawn("python3", pytestArgs, {
    cwd: AUTOMATION_SUITE_DIR,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  activeAutomationProcess = child;

  let passed = initialProgress.passed, failed = initialProgress.failed;
  let skipped = initialProgress.skipped, errors = initialProgress.errors;
  const sentResultNames = new Set<string>(preSentResults);

  const readLiveResults = async () => {
    try {
      const reportsDir = path.join(AUTOMATION_SUITE_DIR, "reports");
      const allFiles = readdirSync(reportsDir);
      const workerFiles = allFiles.filter(f => f.startsWith("_results_") && f.endsWith(".json"));
      const newResults: any[] = [];
      for (const wf of workerFiles) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(reportsDir, wf), "utf-8"));
          for (const r of data) {
            if (!sentResultNames.has(r.test_name)) {
              sentResultNames.add(r.test_name);
              newResults.push(r);
            }
          }
        } catch {}
      }
      if (newResults.length > 0) {
        automationRunState.liveResults.push(...newResults);
        sendEvent({ type: "result", results: newResults });
      }
    } catch {}
  };

  // Track seen test node IDs to avoid double-counting with xdist
  const countedTests = new Set<string>();

  const processLine = (line: string) => {
    sendEvent({ type: "output", line });

    // Match xdist format: "[gw0] [ 5%] PASSED tests/test_01_login.py::test_tc01_valid_login"
    // Or standard format: "tests/test_01_login.py::test_tc01_valid_login PASSED"
    const xdistMatch = line.match(/\[gw\d+\]\s+\[[\s\d]+%\]\s+(PASSED|FAILED|SKIPPED|ERROR)\s+(.+)/);
    const stdMatch = line.match(/(tests\/\S+::\S+)\s+(PASSED|FAILED|SKIPPED|ERROR)/);

    let status = "";
    let testId = "";
    if (xdistMatch) {
      status = xdistMatch[1];
      testId = xdistMatch[2].trim();
    } else if (stdMatch) {
      status = stdMatch[2];
      testId = stdMatch[1].trim();
    }

    if (status && testId && !countedTests.has(testId)) {
      countedTests.add(testId);
      if (status === "PASSED") passed++;
      else if (status === "FAILED") failed++;
      else if (status === "SKIPPED") skipped++;
      else if (status === "ERROR") errors++;
      sendEvent({ type: "progress", passed, failed, skipped, errors, total: passed + failed + skipped + errors });
      setTimeout(() => readLiveResults(), 100);
    } else if (!status) {
      // Non-test-result line — still send progress for display consistency
    }
  };

  let stdoutBuffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() || "";
    lines.forEach(l => { if (l.trim()) processLine(l); });
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const lines = chunk.toString().split("\n");
    lines.forEach(l => { if (l.trim()) sendEvent({ type: "error", line: l }); });
  });

  child.on("close", async (exitCode) => {
    activeAutomationProcess = null;
    if (stdoutBuffer.trim()) processLine(stdoutBuffer);

    let results: any[] = [];
    try {
      const resultsPath = path.join(AUTOMATION_SUITE_DIR, "reports", "results_final.json");
      const data = await fs.readFile(resultsPath, "utf-8");
      results = JSON.parse(data);
    } catch (e: any) {
      console.error("Could not read results_final.json:", e.message);
      sendEvent({ type: "error", line: "Could not read results_final.json: " + e.message });
    }

    console.log(`Automation complete: ${results.length} results to import`);

    let runId = "";
    if (results.length > 0) {
      try {
        sendEvent({ type: "status", message: "Importing results into TCMS..." });
        const mapSt = (s: string) => s === "PASS" ? "Passed" : s === "FAIL" ? "Failed" : s === "SKIP" ? "Skipped" : "Untested";
        const parseSteps = (s: string) => s ? s.split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean).map(step => ({ step, expected: "" })) : [];

        const allProjects = await db.readCollection("projects");
        let autoProj = allProjects.find((p: any) => p.name === "Automated Tests");
        if (!autoProj) autoProj = await db.insert("projects", { name: "Automated Tests", modules: [{ name: "UI Tests", suites: [] }] });
        const projId = autoProj.id;

        const suiteNames = new Set(results.map((r: any) => r.page || "Automated"));
        let mod = autoProj.modules[0];
        if (!mod) { autoProj.modules = [{ name: "UI Tests", suites: [] }]; mod = autoProj.modules[0]; }
        let suiteUpdated = false;
        for (const s of suiteNames) { if (!mod.suites.includes(s)) { mod.suites.push(s); suiteUpdated = true; } }
        if (suiteUpdated) await db.update("projects", projId, { modules: autoProj.modules });

        const existingCases = await db.readCollection("testcases");
        const runResults: any[] = [];
        for (const r of results) {
          let tc = existingCases.find((t: any) => t.title === r.test_name && t.projectId === projId);
          if (!tc) {
            tc = await db.insert("testcases", {
              title: r.test_name, description: r.expected ? `Expected: ${r.expected}` : "", priority: "Medium", type: "Functional",
              status: "Active", automationStatus: "Automated", locked: true, lastRun: r.timestamp || new Date().toISOString(),
              projectId: projId, suite: r.page || "Automated", steps: parseSteps(r.steps), tags: r.duration ? [`${r.duration}s`] : [],
            });
            existingCases.push(tc);
          } else {
            await db.update("testcases", tc.id, { lastRun: r.timestamp || new Date().toISOString() });
          }
          runResults.push({ testCaseId: tc.id, status: mapSt(r.status), comment: r.remarks || undefined });
        }

        const run = await db.insert("testruns", {
          name: `Automated Run — ${new Date().toISOString().split("T")[0]}`,
          assignedTo: "Automation Script", projectId: projId, planId: planId || undefined,
          status: "In Progress", runType: "Automated", createdAt: new Date().toISOString().split("T")[0], results: runResults,
        });
        runId = run.id;
        sendEvent({ type: "status", message: `Run created: ${runId}` });
      } catch (importErr: any) {
        console.error("Auto-import failed:", importErr);
        sendEvent({ type: "error", line: `Auto-import failed: ${importErr.message}` });
      }
    }

    automationRunState.isRunning = false;
    automationRunState.results = results;
    automationRunState.runId = runId;
    automationRunState.exitCode = exitCode;
    automationRunState.progress = { passed, failed, skipped, errors, total: passed + failed + skipped + errors };

    sendEvent({ type: "complete", results, exitCode, passed, failed, skipped, errors, planId, runId });
    for (const client of sseClients) { try { client.end(); } catch {} }
    sseClients.clear();
    (globalThis as any).__automationSSEClients = null;
  });

  const keepalive = setInterval(() => {
    for (const client of sseClients) { try { client.write(": keepalive\n\n"); } catch { sseClients.delete(client); } }
    if (sseClients.size === 0 && !activeAutomationProcess) clearInterval(keepalive);
  }, 30000);

  req.on("close", () => { sseClients.delete(res); });
}

// Helper: read per-worker JSON files and return completed test names + counts
async function readInterruptedResults(): Promise<{ completedTests: string[]; passed: number; failed: number; skipped: number; errors: number }> {
  const reportsDir = path.join(AUTOMATION_SUITE_DIR, "reports");
  const allFiles = readdirSync(reportsDir);
  const workerFiles = allFiles.filter(f => f.startsWith("_results_") && f.endsWith(".json"));
  const completedTests: string[] = [];
  let passed = 0, failed = 0, skipped = 0, errors = 0;
  for (const wf of workerFiles) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(reportsDir, wf), "utf-8"));
      for (const r of data) {
        if (!completedTests.includes(r.test_name)) {
          completedTests.push(r.test_name);
          if (r.status === "PASS") passed++;
          else if (r.status === "FAIL") failed++;
          else if (r.status === "SKIP") skipped++;
          else errors++;
        }
      }
    } catch {}
  }
  return { completedTests, passed, failed, skipped, errors };
}

// Run pytest with SSE streaming
app.get("/api/automation/run", (req, res) => {
  if (activeAutomationProcess) {
    res.status(409).json({ error: "A run is already in progress" });
    return;
  }

  const filesParam = (req.query.files as string) || "all";
  const planId = req.query.planId as string || "";

  const args = ["-m", "pytest"];
  if (filesParam === "all") {
    args.push("tests/");
  } else {
    filesParam.split(",").forEach(f => {
      const trimmed = f.trim();
      args.push(trimmed.startsWith("tests/") ? trimmed : `tests/${trimmed}`);
    });
  }
  args.push("-n", "2", "-v", "--tb=short", "--color=no");

  startPytestRun(req, res, args, planId, { passed: 0, failed: 0, skipped: 0, errors: 0 }, new Set());
});

// Check for interrupted run (per-worker JSONs exist but no fresh results_final.json)
app.get("/api/automation/interrupted-status", async (_req, res) => {
  if (activeAutomationProcess) return res.json({ interrupted: false, isRunning: true });

  try {
    const reportsDir = path.join(AUTOMATION_SUITE_DIR, "reports");
    const testsDir = path.join(AUTOMATION_SUITE_DIR, "tests");
    let allFiles: string[];
    try { allFiles = readdirSync(reportsDir); } catch { return res.json({ interrupted: false }); }
    const workerFiles = allFiles.filter(f => f.startsWith("_results_") && f.endsWith(".json"));
    if (workerFiles.length === 0) return res.json({ interrupted: false });

    // Check if results_final.json is newer than all worker files (= completed run, not interrupted)
    let resultsFinalMtime = 0;
    try {
      const stat = await fs.stat(path.join(reportsDir, "results_final.json"));
      resultsFinalMtime = stat.mtimeMs;
    } catch {}
    let newestWorkerMtime = 0;
    for (const wf of workerFiles) {
      try { const stat = await fs.stat(path.join(reportsDir, wf)); newestWorkerMtime = Math.max(newestWorkerMtime, stat.mtimeMs); } catch {}
    }
    if (resultsFinalMtime > 0 && resultsFinalMtime >= newestWorkerMtime) return res.json({ interrupted: false });

    const { completedTests, passed, failed, skipped, errors } = await readInterruptedResults();

    // Count total tests from all test files
    let totalCount = 0;
    try {
      const testFileNames = readdirSync(testsDir).filter(f => f.startsWith("test_") && f.endsWith(".py"));
      for (const tf of testFileNames) {
        const content = await fs.readFile(path.join(testsDir, tf), "utf-8");
        const funcs = content.match(/^def (test_\w+)/gm);
        totalCount += funcs?.length || 0;
      }
    } catch {}

    res.json({ interrupted: true, completedCount: completedTests.length, totalCount, passed, failed, skipped, errors });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Resume an interrupted run — skip already-completed tests
app.get("/api/automation/resume", async (req, res) => {
  if (activeAutomationProcess) {
    res.status(409).json({ error: "A run is already in progress" });
    return;
  }

  const planId = req.query.planId as string || "";
  const testsDir = path.join(AUTOMATION_SUITE_DIR, "tests");

  try {
    const { completedTests, passed, failed, skipped, errors } = await readInterruptedResults();
    if (completedTests.length === 0) {
      res.status(400).json({ error: "No interrupted run found to resume" });
      return;
    }

    // Build test_name -> node ID mapping (tests/file.py::test_func)
    const testNodeMap: Record<string, string> = {};
    const testFileNames = readdirSync(testsDir).filter(f => f.startsWith("test_") && f.endsWith(".py"));
    for (const tf of testFileNames) {
      const content = await fs.readFile(path.join(testsDir, tf), "utf-8");
      const funcs = content.match(/^def (test_\w+)/gm)?.map(m => m.replace("def ", "")) || [];
      for (const fn of funcs) { testNodeMap[fn] = `tests/${tf}::${fn}`; }
    }

    // Build pytest args with --deselect for completed tests
    const args = ["-m", "pytest", "tests/", "-n", "2", "-v", "--tb=short", "--color=no"];
    for (const testName of completedTests) {
      const nodeId = testNodeMap[testName];
      if (nodeId) args.push("--deselect", nodeId);
    }

    const preSentNames = new Set(completedTests);
    startPytestRun(req, res, args, planId, { passed, failed, skipped, errors }, preSentNames);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Clear interrupted run files (discard partial results)
app.post("/api/automation/clear-interrupted", async (_req, res) => {
  try {
    const reportsDir = path.join(AUTOMATION_SUITE_DIR, "reports");
    const allFiles = readdirSync(reportsDir);
    const workerFiles = allFiles.filter(f => f.startsWith("_results_") && f.endsWith(".json"));
    for (const wf of workerFiles) {
      try { await fs.unlink(path.join(reportsDir, wf)); } catch {}
    }
    res.json({ cleared: true, filesRemoved: workerFiles.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Import automation results into TCMS
app.post("/api/automation/import-results", async (req, res) => {
  const { results, projectId, planId, runName } = req.body;
  if (!results || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "No results provided" });
  }

  // Auto-find or create "Automated Tests" project
  let targetProjectId = projectId || "";
  if (!targetProjectId) {
    const projects = await db.readCollection("projects");
    let autoProj = projects.find((p: any) => p.name === "Automated Tests");
    if (!autoProj) {
      autoProj = await db.insert("projects", { name: "Automated Tests", modules: [{ name: "UI Tests", suites: [] }] });
    }
    targetProjectId = autoProj.id;
  }

  const mapStatus = (s: string): string => {
    if (s === "PASS") return "Passed";
    if (s === "FAIL") return "Failed";
    if (s === "SKIP") return "Skipped";
    return "Untested";
  };

  const parseSteps = (stepsStr: string): { step: string; expected: string }[] => {
    if (!stepsStr) return [];
    return stepsStr.split("\n").map(s => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean).map(step => ({ step, expected: "" }));
  };

  try {
    // Ensure suites exist in the project structure
    const projects = await db.readCollection("projects");
    const autoProj = projects.find((p: any) => p.id === targetProjectId);
    if (autoProj) {
      const suiteNames = new Set(results.map((r: any) => r.page || "Automated").filter(Boolean));
      let mod = autoProj.modules[0];
      if (!mod) { autoProj.modules = [{ name: "UI Tests", suites: [] }]; mod = autoProj.modules[0]; }
      let updated = false;
      for (const s of suiteNames) {
        if (!mod.suites.includes(s)) { mod.suites.push(s); updated = true; }
      }
      if (updated) await db.update("projects", autoProj.id, { modules: autoProj.modules });
    }

    // Upsert test cases and build run results
    const existingCases = await db.readCollection("testcases");
    const runResults: { testCaseId: string; status: string; comment?: string }[] = [];

    for (const r of results) {
      let tc = existingCases.find((t: any) => t.title === r.test_name && t.projectId === targetProjectId);
      if (!tc) {
        tc = await db.insert("testcases", {
          title: r.test_name,
          description: r.expected ? `Expected: ${r.expected}` : "",
          priority: "Medium",
          type: "Functional",
          status: "Active",
          automationStatus: "Automated",
          locked: true,
          lastRun: r.timestamp || new Date().toISOString(),
          projectId: targetProjectId,
          suite: r.page || "Automated",
          steps: parseSteps(r.steps),
          tags: r.duration ? [`${r.duration}s`] : [],
        });
        existingCases.push(tc);
      } else {
        await db.update("testcases", tc.id, { lastRun: r.timestamp || new Date().toISOString() });
      }
      runResults.push({
        testCaseId: tc.id,
        status: mapStatus(r.status),
        comment: r.remarks || undefined,
      });
    }

    // Create test run
    const run = await db.insert("testruns", {
      name: runName || `Automated Run — ${new Date().toISOString().split("T")[0]}`,
      assignedTo: "Automation Script",
      projectId: targetProjectId,
      planId: planId || undefined,
      status: "In Progress",
      runType: "Automated",
      createdAt: new Date().toISOString().split("T")[0],
      results: runResults,
    });

    const summary = {
      total: runResults.length,
      passed: runResults.filter(r => r.status === "Passed").length,
      failed: runResults.filter(r => r.status === "Failed").length,
      skipped: runResults.filter(r => r.status === "Skipped").length,
    };

    res.json({ runId: run.id, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Download Reports ────────────────────────────────────

// Download automation report (Excel or CSV from the automation suite output)
// Uses the NEWEST data source: in-memory state > per-worker JSONs > results_final.json
app.get("/api/automation/download-report", async (req, res) => {
  const format = (req.query.format as string) || "excel";
  const reportsDir = path.join(AUTOMATION_SUITE_DIR, "reports");

  // Determine the freshest data source
  const getFreshestResults = async (): Promise<any[]> => {
    // 1. If the current session has results (just completed), use those
    if (automationRunState.results && automationRunState.results.length > 0) {
      return automationRunState.results;
    }
    // 2. If there are live results from an in-progress or interrupted run, use those
    if (automationRunState.liveResults && automationRunState.liveResults.length > 0) {
      return automationRunState.liveResults;
    }

    // 3. Check file timestamps — prefer per-worker files if they're newer than results_final.json
    let resultsFinalMtime = 0;
    try {
      const stat = await fs.stat(path.join(reportsDir, "results_final.json"));
      resultsFinalMtime = stat.mtimeMs;
    } catch {}

    let allFiles: string[];
    try { allFiles = readdirSync(reportsDir); } catch { allFiles = []; }
    const workerFiles = allFiles.filter(f => f.startsWith("_results_") && f.endsWith(".json"));

    let newestWorkerMtime = 0;
    for (const wf of workerFiles) {
      try { const stat = await fs.stat(path.join(reportsDir, wf)); newestWorkerMtime = Math.max(newestWorkerMtime, stat.mtimeMs); } catch {}
    }

    // Per-worker files are newer — use them (interrupted/partial run)
    if (workerFiles.length > 0 && newestWorkerMtime > resultsFinalMtime) {
      const results: any[] = [];
      for (const wf of workerFiles) {
        try { results.push(...JSON.parse(await fs.readFile(path.join(reportsDir, wf), "utf-8"))); } catch {}
      }
      const seen = new Set<string>();
      return results.filter(r => { if (seen.has(r.test_name)) return false; seen.add(r.test_name); return true; });
    }

    // Fall back to results_final.json
    if (resultsFinalMtime > 0) {
      try {
        return JSON.parse(await fs.readFile(path.join(reportsDir, "results_final.json"), "utf-8"));
      } catch {}
    }

    // Last resort: try per-worker files even if no results_final exists
    if (workerFiles.length > 0) {
      const results: any[] = [];
      for (const wf of workerFiles) {
        try { results.push(...JSON.parse(await fs.readFile(path.join(reportsDir, wf), "utf-8"))); } catch {}
      }
      const seen = new Set<string>();
      return results.filter(r => { if (seen.has(r.test_name)) return false; seen.add(r.test_name); return true; });
    }

    return [];
  };

  if (format === "excel") {
    try {
      const allFiles = await fs.readdir(reportsDir);
      const excelFiles = allFiles.filter(f => f.startsWith("test_report_") && f.endsWith(".xlsx")).sort().reverse();
      if (excelFiles.length === 0) return res.status(404).json({ error: "No Excel report found. Run may be incomplete." });
      const filePath = path.join(reportsDir, excelFiles[0]);
      res.download(filePath, excelFiles[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // CSV format: generate from freshest results
  try {
    const results = await getFreshestResults();
    if (results.length === 0) return res.status(404).json({ error: "No results available to download." });

    results.sort((a, b) => {
      const numA = parseInt((a.test_id || "TC-9999").split("-")[1]) || 9999;
      const numB = parseInt((b.test_id || "TC-9999").split("-")[1]) || 9999;
      return numA - numB;
    });

    const escCSV = (val: any) => { const s = String(val ?? ""); return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s; };
    const headers = ["Test ID","Test Name","Page","Steps to Reproduce","Expected Result","Actual Result","Status","Duration (s)","Timestamp","Snapshot","Remarks"];
    const rows = results.map(r => [r.test_id, r.test_name, r.page, r.steps, r.expected, r.actual, r.status, r.duration, r.timestamp, r.snapshot, r.remarks].map(escCSV).join(","));
    const csv = [headers.join(","), ...rows].join("\n");

    const ts = new Date().toISOString().replace(/[:.]/g, "-").split("T").join("_");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="test_report_${ts}.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Download per-run report (for any TCMS test run — works for both Manual and Automated)
app.get("/api/test-runs/:runId/report", async (req, res) => {
  try {
    const run = await db.findById("testruns", req.params.runId);
    if (!run) return res.status(404).json({ error: "Test run not found" });

    const testCases = await db.readCollection("testcases");
    const escalations = await db.readCollection("escalations");
    const tcMap = new Map(testCases.map((tc: any) => [tc.id, tc]));
    const runEscalations = new Set(
      escalations.filter((e: any) => e.runId === run.id).map((e: any) => e.testCaseId)
    );

    // Build summary stats
    const results = run.results || [];
    const passed = results.filter((r: any) => r.status === "Passed").length;
    const failed = results.filter((r: any) => r.status === "Failed").length;
    const skipped = results.filter((r: any) => r.status === "Skipped" || r.status === "Untested").length;
    const total = results.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const escCSV = (val: any) => { const s = String(val ?? ""); return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s; };

    // Summary header rows
    const summaryRows = [
      `Run Name,${escCSV(run.name)}`,
      `Run Type,${escCSV(run.runType || "Manual")}`,
      `Status,${escCSV(run.status)}`,
      `Assigned To,${escCSV(run.assignedTo)}`,
      `Created Date,${escCSV(run.createdAt)}`,
      ``,
      `Total Test Cases,${total}`,
      `Passed,${passed}`,
      `Failed,${failed}`,
      `Skipped / Untested,${skipped}`,
      `Pass Rate,${passRate}%`,
      ``,
    ];

    // Data headers
    const dataHeaders = ["Test Case ID","Title","Suite","Steps","Expected Result","Status","Escalated","Tester Comments"];
    const dataRows = results.map((r: any) => {
      const tc = tcMap.get(r.testCaseId) as any;
      const title = tc?.title || "Unknown";
      const suite = tc?.suite || "";
      const steps = tc?.steps?.map((s: any, i: number) => `${i + 1}. ${s.step}`).join("\n") || "";
      const expected = tc?.steps?.map((s: any, i: number) => s.expected ? `${i + 1}. ${s.expected}` : "").filter(Boolean).join("\n") || "";
      const escalated = runEscalations.has(r.testCaseId) ? "Yes" : "No";
      // Combine stepComments into a single string
      const comments = r.stepComments
        ? Object.entries(r.stepComments).map(([idx, c]) => `Step ${Number(idx) + 1}: ${c}`).join("; ")
        : r.comment || "";
      return [r.testCaseId?.substring(0, 10) || "", title, suite, steps, expected, r.status, escalated, comments].map(escCSV).join(",");
    });

    const csv = [...summaryRows, dataHeaders.join(","), ...dataRows].join("\n");

    const safeName = (run.name || "Run").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_Report.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

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
    const LITELLM_MODEL = process.env.LITELLM_MODEL || "gemini/gemini-2.5-flash";

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

    // Use Bearer token auth (LiteLLM virtual key), fall back to Basic auth
    const authHeader = LITELLM_PASSWORD.startsWith("sk-")
      ? `Bearer ${LITELLM_PASSWORD}`
      : `Basic ${Buffer.from(`${LITELLM_USERNAME}:${LITELLM_PASSWORD}`).toString("base64")}`;

    const litellmRes = await fetch(litellmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
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
