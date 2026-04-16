import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

interface TestStep {
  step: string;
  expected: string;
}

interface TestCase {
  id: string;
  title: string;
  description?: string;
  preconditions?: string;
  steps?: TestStep[];
  priority: string;
  type: string;
  status: string;
  automationStatus?: string;
  owner?: string;
  tags?: string[];
  lastRun: string;
  suite?: string;
  projectId?: string;
  planId?: string;
}

interface TestPlan {
  id: string;
  name: string;
  description: string;
  status: string;
  owner: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface ProjectData {
  id: string;
  name: string;
  modules: { name: string; suites: string[] }[];
}

const DEFAULT_TC_FORM = {
  title: "",
  description: "",
  preconditions: "",
  priority: "Medium",
  type: "Functional",
  status: "Active",
  automationStatus: "Not Automated",
  owner: "",
  tags: [] as string[],
  suite: "",
  planId: "",
};

export default function TestCaseRepository() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Tree State
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [selectedSuitesFilter, setSelectedSuitesFilter] = useState<string[] | null>(null);
  const [selectedViewName, setSelectedViewName] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Filters State
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);

  // Detail view state
  const [viewingTC, setViewingTC] = useState<TestCase | null>(null);

  // Modal State
  const [isTCModalOpen, setIsTCModalOpen] = useState(false);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Upload File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Import state
  const [importParsed, setImportParsed] = useState<any[] | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importDone, setImportDone] = useState<{ success: number; total: number } | null>(null);

  // Import destination
  const [importProjectId, setImportProjectId] = useState<string>("");
  const [importSuite, setImportSuite] = useState<string>("");
  const [importNewProjectName, setImportNewProjectName] = useState("");
  const [importNewModuleName, setImportNewModuleName] = useState("");
  const [importNewSuiteName, setImportNewSuiteName] = useState("");
  const [importDestMode, setImportDestMode] = useState<"existing" | "new">("existing");

  // AI Generate state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResults, setAiResults] = useState<any[] | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiImportDone, setAiImportDone] = useState<{ success: number; total: number } | null>(null);

  // New Form State
  const [newTC, setNewTC] = useState({ ...DEFAULT_TC_FORM });
  const [tcSteps, setTcSteps] = useState<TestStep[]>([{ step: "", expected: "" }]);
  const [tagInput, setTagInput] = useState("");
  const [createAnother, setCreateAnother] = useState(false);

  const [newProj, setNewProj] = useState({ name: "" });

  // Inline add/rename state for modules and suites
  const [addingModuleFor, setAddingModuleFor] = useState<string | null>(null); // projectId
  const [newModuleName, setNewModuleName] = useState("");
  const [addingSuiteFor, setAddingSuiteFor] = useState<string | null>(null); // "projId_mod_idx"
  const [newSuiteName, setNewSuiteName] = useState("");
  const [renamingModule, setRenamingModule] = useState<{ projId: string; modIndex: number } | null>(null);
  const [renameModuleValue, setRenameModuleValue] = useState("");
  const [renamingSuite, setRenamingSuite] = useState<{ projId: string; modIndex: number; suite: string } | null>(null);
  const [renameSuiteValue, setRenameSuiteValue] = useState("");

  // Confirmation dialog state (replaces native confirm())
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchData = async () => {
    try {
      const [tcRes, projRes, plansRes] = await Promise.all([
        fetch("http://localhost:3001/api/testcases"),
        fetch("http://localhost:3001/api/projects"),
        fetch("http://localhost:3001/api/testplans")
      ]);
      if (tcRes.ok) setTestCases(await tcRes.json());
      if (projRes.ok) {
        const p = await projRes.json();
        setProjects(p);
        if (p.length > 0 && expandedNodes.size === 0) {
          setExpandedNodes(new Set([p[0].id]));
        }
      }
      if (plansRes.ok) setTestPlans(await plansRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Handle deep-link from global search — runs once after data loads if URL has search params
  const [searchApplied, setSearchApplied] = useState(false);
  useEffect(() => {
    if (loading || searchApplied) return;
    if (testCases.length === 0 || projects.length === 0) return;

    const paramSuite = searchParams.get("suite");
    const paramProjectId = searchParams.get("projectId");
    const paramTcId = searchParams.get("tcId");

    // Only act if all search params are present (from a search click)
    if (!paramSuite || !paramProjectId || !paramTcId) return;

    setSearchApplied(true);

    const proj = projects.find(p => p.id === paramProjectId);
    if (!proj) return;

    const nodesToExpand = new Set<string>([proj.id]);
    proj.modules.forEach((mod, idx) => {
      if (mod.suites.includes(paramSuite)) {
        nodesToExpand.add(`${proj.id}_mod_${idx}`);
      }
    });
    setExpandedNodes(nodesToExpand);
    setSelectedSuite(paramSuite);
    setSelectedSuitesFilter([paramSuite]);
    setSelectedViewName(paramSuite);
    setSelectedProjectId(paramProjectId);

    const tc = testCases.find(t => t.id === paramTcId);
    if (tc) setViewingTC(tc);

    // Clear params so sidebar navigation works normally
    setSearchParams({}, { replace: true });
  }, [loading, testCases, projects]);

  // ── CSV Parser (handles quoted multiline fields) ──────────
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let current = "";
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          current += '"';
          i++; // skip escaped quote
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          row.push(current);
          current = "";
        } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
          row.push(current);
          current = "";
          if (row.some(cell => cell.trim())) rows.push(row);
          row = [];
          if (ch === "\r") i++; // skip \r\n
        } else {
          current += ch;
        }
      }
    }
    // last field/row
    row.push(current);
    if (row.some(cell => cell.trim())) rows.push(row);
    return rows;
  };

  const parseSteps = (raw: string): TestStep[] => {
    if (!raw || !raw.trim()) return [];
    // Split on numbered patterns like "1." "2." etc.
    const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      // Strip leading number + dot: "1. Open login URL" → "Open login URL"
      const cleaned = line.replace(/^\d+\.\s*/, "");
      return { step: cleaned, expected: "" };
    });
  };

  const mapStatus = (raw: string): string => {
    const s = (raw || "").trim().toUpperCase();
    if (s === "PASS" || s === "PASSED") return "PASSED";
    if (s === "FAIL" || s === "FAILED") return "FAILED";
    if (s === "BLOCKED" || s === "BLOCK") return "BLOCKED";
    if (s === "SKIP" || s === "SKIPPED") return "SKIPPED";
    return "DRAFT";
  };

  const handleParseFile = async () => {
    if (!selectedFile) return;

    let rows: string[][] = [];
    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      const text = await selectedFile.text();
      rows = parseCSV(text);
    } else {
      // Excel: .xlsx, .xls
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // raw: true preserves multiline cell content; defval keeps empty cells
      const jsonRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
      rows = jsonRows.map(r => r.map((cell: any) => String(cell ?? "")));
    }

    if (rows.length < 2) { setImportParsed([]); return; }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    // Flexible column matching
    const iTestId = headers.findIndex(h => h.includes("test id") || h === "id");
    const iName = headers.findIndex(h => h.includes("test name") || h === "name" || h === "title");
    const iPage = headers.findIndex(h => h.includes("page") || h.includes("module") || h.includes("suite"));
    const iSteps = headers.findIndex(h => h.includes("steps") || h.includes("reproduce"));
    const iExpected = headers.findIndex(h => h.includes("expected"));
    const iActual = headers.findIndex(h => h.includes("actual"));
    const iStatus = headers.findIndex(h => h.includes("status"));
    const iDuration = headers.findIndex(h => h.includes("duration"));
    const iTimestamp = headers.findIndex(h => h.includes("timestamp") || h.includes("date"));

    const parsed = dataRows.map(r => {
      const get = (idx: number) => (idx >= 0 && idx < r.length) ? r[idx].trim() : "";

      const stepsRaw = get(iSteps);
      const steps = parseSteps(stepsRaw);
      const expectedResult = get(iExpected);
      // Attach expected result to the last step
      if (steps.length > 0 && expectedResult) {
        steps[steps.length - 1].expected = expectedResult;
      }

      return {
        csvId: get(iTestId),
        title: get(iName) || get(iTestId),
        page: get(iPage),
        steps,
        expectedResult,
        actualResult: get(iActual),
        status: mapStatus(get(iStatus)),
        duration: get(iDuration),
        timestamp: get(iTimestamp),
      };
    }).filter(r => r.title);

    setImportParsed(parsed);
  };

  // Build flat list of suites for the import destination picker
  const importSuiteOptions: { projectId: string; projectName: string; moduleName: string; suite: string }[] = [];
  projects.forEach(proj => {
    proj.modules.forEach(mod => {
      mod.suites.forEach(suite => {
        importSuiteOptions.push({ projectId: proj.id, projectName: proj.name, moduleName: mod.name, suite });
      });
    });
  });

  const runImport = async () => {
    if (!importParsed || importParsed.length === 0) return;
    setImportLoading(true);

    let targetProjectId = importProjectId;
    let targetSuite = importSuite;

    // If creating new project/module/suite, do that first
    if (importDestMode === "new") {
      try {
        const projName = importNewProjectName.trim();
        const modName = importNewModuleName.trim();
        const suiteName = importNewSuiteName.trim();
        if (!projName || !modName || !suiteName) {
          setImportLoading(false);
          return;
        }
        // Create project with module and suite
        const res = await fetch("http://localhost:3001/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projName, modules: [{ name: modName, suites: [suiteName] }] })
        });
        const newProj = await res.json();
        targetProjectId = newProj.id;
        targetSuite = suiteName;
      } catch (error) {
        console.error("Error creating destination:", error);
        setImportLoading(false);
        return;
      }
    }

    if (!targetProjectId || !targetSuite) {
      setImportLoading(false);
      return;
    }

    let success = 0;
    for (const row of importParsed) {
      try {
        const payload: any = {
          title: row.title,
          priority: "Medium",
          type: "Functional",
          status: row.status,
          automationStatus: "Automated",
          lastRun: row.timestamp || "Never",
          projectId: targetProjectId,
          suite: targetSuite,
        };
        if (row.steps && row.steps.length > 0) payload.steps = row.steps;
        if (row.expectedResult) payload.description = `Expected: ${row.expectedResult}`;
        if (row.actualResult) payload.description = (payload.description || "") + `\nActual: ${row.actualResult}`;
        if (row.duration) payload.tags = [`${row.duration}s`];

        await fetch("http://localhost:3001/api/testcases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        success++;
      } catch (error) {
        console.error("Error importing row:", error);
      }
    }

    setImportLoading(false);
    setImportDone({ success, total: importParsed.length });
    fetchData();
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportParsed(null);
    setImportDone(null);
    setImportLoading(false);
    setImportProjectId(selectedProjectId || "");
    setImportSuite(selectedSuite || "");
    setImportNewProjectName("");
    setImportNewModuleName("");
    setImportNewSuiteName("");
    setImportDestMode("existing");
  };

  // ── AI Generate functions ─────────────────────────────────
  const resetAI = () => {
    setSelectedFile(null);
    setAiResults(null);
    setAiSelected(new Set());
    setAiError(null);
    setAiGenerating(false);
    setAiImportDone(null);
  };

  const handleAIGenerate = async () => {
    if (!selectedFile) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("http://localhost:3001/api/ai/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Failed to generate test cases");
        setAiGenerating(false);
        return;
      }
      const tcs = data.testCases || [];
      setAiResults(tcs);
      // Select all by default
      setAiSelected(new Set(tcs.map((_: any, i: number) => i)));
    } catch (err: any) {
      setAiError(err.message || "Network error");
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleAiSelect = (idx: number) => {
    const next = new Set(aiSelected);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setAiSelected(next);
  };

  const toggleAiSelectAll = () => {
    if (!aiResults) return;
    if (aiSelected.size === aiResults.length) {
      setAiSelected(new Set());
    } else {
      setAiSelected(new Set(aiResults.map((_, i) => i)));
    }
  };

  const importAIResults = async () => {
    if (!aiResults || aiSelected.size === 0) return;
    if (!selectedSuite || !selectedProjectId) return;
    setAiGenerating(true);
    let success = 0;
    for (const idx of Array.from(aiSelected)) {
      const tc = aiResults[idx];
      if (!tc) continue;
      try {
        await fetch("http://localhost:3001/api/testcases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: tc.title || "Untitled",
            description: tc.description || "",
            preconditions: tc.preconditions || "",
            steps: tc.steps || [],
            priority: tc.priority || "Medium",
            type: tc.type || "Functional",
            status: "Active",
            automationStatus: "Not Automated",
            lastRun: "Never",
            projectId: selectedProjectId,
            suite: selectedSuite,
          })
        });
        success++;
      } catch (err) { console.error("Error importing AI TC:", err); }
    }
    setAiGenerating(false);
    setAiImportDone({ success, total: aiSelected.size });
    fetchData();
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredTestCases.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTestCases.map((tc) => tc.id)));
  };

  const resetTCForm = () => {
    setNewTC({ ...DEFAULT_TC_FORM });
    setTcSteps([{ step: "", expected: "" }]);
    setTagInput("");
  };

  const submitNewTC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTC.title.trim()) return;

    try {
      const stepsToSave = tcSteps.filter(s => s.step.trim() || s.expected.trim());
      const payload: any = {
        ...newTC,
        steps: stepsToSave.length > 0 ? stepsToSave : undefined,
        lastRun: "Never",
        projectId: selectedProjectId || undefined,
        suite: selectedSuite || newTC.suite || undefined,
        tags: newTC.tags.length > 0 ? newTC.tags : undefined,
      };
      if (payload.planId === "") delete payload.planId;
      if (!payload.description) delete payload.description;
      if (!payload.preconditions) delete payload.preconditions;
      if (!payload.owner) delete payload.owner;
      if (!payload.suite) delete payload.suite;

      await fetch("http://localhost:3001/api/testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (createAnother) {
        resetTCForm();
      } else {
        setIsTCModalOpen(false);
        resetTCForm();
      }
      fetchData();
    } catch (error) {
      console.error("Error creating record:", error);
    }
  };

  const submitNewProj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProj.name.trim()) return;
    try {
      await fetch("http://localhost:3001/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProj.name, modules: [] })
      });
      setIsProjModalOpen(false);
      setNewProj({ name: "" });
      fetchData();
    } catch (error) {
      console.error("Error creating record:", error);
    }
  };

  const handleDeleteSelected = async () => {
    for (const id of Array.from(selectedIds)) {
      await fetch(`http://localhost:3001/api/testcases/${id}`, { method: "DELETE" });
    }
    setSelectedIds(new Set());
    fetchData();
  };

  // ── Module & Suite CRUD helpers ──────────────────────────────
  const addModule = async (projId: string) => {
    const name = newModuleName.trim();
    if (!name) return;
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    try {
      await fetch(`http://localhost:3001/api/projects/${projId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proj, modules: [...proj.modules, { name, suites: [] }] })
      });
      setAddingModuleFor(null);
      setNewModuleName("");
      fetchData();
    } catch (error) { console.error("Error adding module:", error); }
  };

  const addSuite = async (projId: string, modIndex: number) => {
    const name = newSuiteName.trim();
    if (!name) return;
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    const updatedModules = [...proj.modules];
    updatedModules[modIndex] = { ...updatedModules[modIndex], suites: [...updatedModules[modIndex].suites, name] };
    try {
      await fetch(`http://localhost:3001/api/projects/${projId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proj, modules: updatedModules })
      });
      setAddingSuiteFor(null);
      setNewSuiteName("");
      fetchData();
    } catch (error) { console.error("Error adding suite:", error); }
  };

  const renameModuleSave = async () => {
    if (!renamingModule || !renameModuleValue.trim()) return;
    const proj = projects.find(p => p.id === renamingModule.projId);
    if (!proj) return;
    const updatedModules = [...proj.modules];
    updatedModules[renamingModule.modIndex] = { ...updatedModules[renamingModule.modIndex], name: renameModuleValue.trim() };
    try {
      await fetch(`http://localhost:3001/api/projects/${renamingModule.projId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proj, modules: updatedModules })
      });
      setRenamingModule(null);
      setRenameModuleValue("");
      fetchData();
    } catch (error) { console.error("Error renaming module:", error); }
  };

  const renameSuiteSave = async () => {
    if (!renamingSuite || !renameSuiteValue.trim()) return;
    const proj = projects.find(p => p.id === renamingSuite.projId);
    if (!proj) return;
    const oldName = renamingSuite.suite;
    const newName = renameSuiteValue.trim();
    const updatedModules = [...proj.modules];
    const suites = [...updatedModules[renamingSuite.modIndex].suites];
    const sIdx = suites.indexOf(oldName);
    if (sIdx !== -1) suites[sIdx] = newName;
    updatedModules[renamingSuite.modIndex] = { ...updatedModules[renamingSuite.modIndex], suites };
    try {
      // Update the project
      await fetch(`http://localhost:3001/api/projects/${renamingSuite.projId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proj, modules: updatedModules })
      });
      // Update all test cases that reference the old suite name
      const casesToUpdate = testCases.filter(tc => tc.suite === oldName && tc.projectId === renamingSuite.projId);
      await Promise.all(casesToUpdate.map(tc =>
        fetch(`http://localhost:3001/api/testcases/${tc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tc, suite: newName })
        })
      ));
      if (selectedSuite === oldName) {
        setSelectedSuite(newName);
        setSelectedSuitesFilter([newName]);
        setSelectedViewName(newName);
      }
      setRenamingSuite(null);
      setRenameSuiteValue("");
      fetchData();
    } catch (error) { console.error("Error renaming suite:", error); }
  };

  const deleteSuite = (e: React.MouseEvent, projId: string, modIndex: number, suiteName: string) => {
    e.stopPropagation();
    const suiteCases = testCases.filter(tc => tc.projectId === projId && tc.suite === suiteName);
    setConfirmDialog({
      title: "Delete Suite",
      message: `Are you sure you want to delete "${suiteName}" and its ${suiteCases.length} test case${suiteCases.length !== 1 ? "s" : ""}?`,
      onConfirm: async () => {
        const proj = projects.find(p => p.id === projId);
        if (!proj) return;
        const updatedModules = [...proj.modules];
        updatedModules[modIndex] = { ...updatedModules[modIndex], suites: updatedModules[modIndex].suites.filter(s => s !== suiteName) };
        try {
          // Delete all test cases in this suite
          await Promise.all(suiteCases.map(tc =>
            fetch(`http://localhost:3001/api/testcases/${tc.id}`, { method: "DELETE" })
          ));
          await fetch(`http://localhost:3001/api/projects/${projId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...proj, modules: updatedModules })
          });
          if (selectedSuite === suiteName) {
            setSelectedSuite(null);
            setSelectedSuitesFilter(null);
            setSelectedViewName(null);
          }
          fetchData();
        } catch (error) { console.error("Error deleting suite:", error); }
        setConfirmDialog(null);
      }
    });
  };

  const deleteModule = (e: React.MouseEvent, projId: string, modIndex: number) => {
    e.stopPropagation();
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    const mod = proj.modules[modIndex];
    const modName = mod?.name || "this module";
    const modSuites = mod?.suites || [];
    const modCases = testCases.filter(tc => tc.projectId === projId && tc.suite && modSuites.includes(tc.suite));
    setConfirmDialog({
      title: "Delete Module",
      message: `Are you sure you want to delete "${modName}", its ${modSuites.length} suite${modSuites.length !== 1 ? "s" : ""}, and ${modCases.length} test case${modCases.length !== 1 ? "s" : ""}?`,
      onConfirm: async () => {
        const updatedModules = proj.modules.filter((_, idx) => idx !== modIndex);
        try {
          // Delete all test cases in this module's suites
          await Promise.all(modCases.map(tc =>
            fetch(`http://localhost:3001/api/testcases/${tc.id}`, { method: "DELETE" })
          ));
          await fetch(`http://localhost:3001/api/projects/${projId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...proj, modules: updatedModules })
          });
          fetchData();
        } catch (error) { console.error("Error deleting module:", error); }
        setConfirmDialog(null);
      }
    });
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const proj = projects.find(p => p.id === id);
    const projName = proj?.name || "this project";
    const projCases = testCases.filter(tc => tc.projectId === id);
    setConfirmDialog({
      title: "Delete Project",
      message: `Are you sure you want to delete "${projName}", all its modules, suites, and ${projCases.length} test case${projCases.length !== 1 ? "s" : ""}?`,
      onConfirm: async () => {
        try {
          // Delete all test cases in this project
          await Promise.all(projCases.map(tc =>
            fetch(`http://localhost:3001/api/testcases/${tc.id}`, { method: "DELETE" })
          ));
          await fetch(`http://localhost:3001/api/projects/${id}`, { method: "DELETE" });
          fetchData();
          if (selectedProjectId === id) {
            setSelectedProjectId(null);
            setSelectedSuite(null);
            setSelectedSuitesFilter(null);
            setSelectedViewName(null);
          }
        } catch (error) { console.error("Error deleting project:", error); }
        setConfirmDialog(null);
      }
    });
  };

  const toggleNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSet = new Set(expandedNodes);
    if (newSet.has(nodeId)) newSet.delete(nodeId);
    else newSet.add(nodeId);
    setExpandedNodes(newSet);
  };

  const selectSuite = (suiteName: string, projectId: string) => {
    setSelectedSuite(suiteName);
    setSelectedSuitesFilter([suiteName]);
    setSelectedViewName(suiteName);
    setSelectedProjectId(projectId);
  };

  const selectModule = (moduleName: string, suites: string[], projectId: string) => {
    setSelectedSuite(null);
    setSelectedSuitesFilter(suites);
    setSelectedViewName(moduleName);
    setSelectedProjectId(projectId);
  };

  const clearSelection = () => {
    setSelectedSuite(null);
    setSelectedSuitesFilter(null);
    setSelectedViewName(null);
    setSelectedProjectId(null);
  };

  // Steps helpers
  const addStep = () => setTcSteps([...tcSteps, { step: "", expected: "" }]);
  const removeStep = (index: number) => {
    if (tcSteps.length <= 1) return;
    setTcSteps(tcSteps.filter((_, i) => i !== index));
  };
  const updateStep = (index: number, field: "step" | "expected", value: string) => {
    const updated = [...tcSteps];
    updated[index] = { ...updated[index], [field]: value };
    setTcSteps(updated);
  };

  // Tags helpers
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !newTC.tags.includes(tag)) {
      setNewTC({ ...newTC, tags: [...newTC.tags, tag] });
    }
    setTagInput("");
  };
  const removeTag = (tag: string) => {
    setNewTC({ ...newTC, tags: newTC.tags.filter(t => t !== tag) });
  };

  const filteredTestCases = testCases.filter(tc => {
    const matchPriority = filterPriority === "All" || tc.priority === filterPriority;
    const matchType = filterType === "All" || tc.type === filterType;
    const matchStatus = filterStatus === "All" || tc.status === filterStatus;
    const matchSuite = selectedSuitesFilter ? (tc.suite && selectedSuitesFilter.includes(tc.suite)) : true;
    return matchPriority && matchType && matchStatus && matchSuite;
  });

  const activeFiltersCount = [filterPriority, filterType, filterStatus].filter(f => f !== "All").length;

  // Column filter dropdown helper
  const ColumnFilter = ({ column, value, setValue, options }: { column: string; value: string; setValue: (v: string) => void; options: string[] }) => (
    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant relative select-none">
      <button
        onClick={(e) => { e.stopPropagation(); setOpenFilterCol(openFilterCol === column ? null : column); }}
        className={`flex items-center gap-1 hover:text-primary transition-colors ${value !== "All" ? "text-primary" : ""}`}
      >
        {column}
        <span className="material-symbols-outlined text-[14px]">{openFilterCol === column ? "expand_less" : "unfold_more"}</span>
        {value !== "All" && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
      </button>
      {openFilterCol === column && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-xl z-50 min-w-[160px] py-1 overflow-hidden">
          {options.map(opt => (
            <div
              key={opt}
              onClick={(e) => { e.stopPropagation(); setValue(opt); setOpenFilterCol(null); }}
              className={`px-4 py-2 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${value === opt ? "bg-primary/10 text-primary font-bold" : "text-on-surface hover:bg-surface-container"}`}
            >
              {opt === "All" ? `All ${column}s` : opt}
              {value === opt && <span className="material-symbols-outlined text-[14px]">check</span>}
            </div>
          ))}
        </div>
      )}
    </th>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-full relative w-full">
      <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">Test Case Repository</h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">Viewing {filteredTestCases.length} out of {testCases.length} total cases {selectedViewName ? `in ${selectedViewName}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedViewName && (
            <button onClick={clearSelection} className="text-sm font-bold text-primary hover:underline mr-4">Show All</button>
          )}
          <button
            onClick={() => { setSelectedFile(null); setIsImportModalOpen(true); }}
            className="bg-surface border border-outline-variant text-on-surface px-4 py-2 rounded-lg text-sm font-bold hover:bg-surface-container-high transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Import
          </button>
          <button
            onClick={() => { setSelectedFile(null); setIsAIModalOpen(true); }}
            className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/20 transition-all flex items-center gap-2 border border-primary/20 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Generate with AI
          </button>
          <div className="relative group">
            <button
              onClick={() => { if (selectedSuite) { resetTCForm(); setIsTCModalOpen(true); } }}
              disabled={!selectedSuite}
              className="gradient-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Test Case
            </button>
            {!selectedSuite && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-on-surface text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Navigate to a suite first to create a test case
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-on-surface"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden px-8 pb-8 gap-6">
        {/* Left sidebar - Repository Explorer */}
        <div className="w-72 bg-surface border border-outline-variant rounded-xl overflow-y-auto no-scrollbar p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Repository Explorer</span>
            <span onClick={() => setIsProjModalOpen(true)} className="material-symbols-outlined text-sm text-primary cursor-pointer font-bold hover:scale-110 transition">create_new_folder</span>
          </div>
          <div className="space-y-4">
            {projects.length === 0 ? (
              <p className="text-xs text-on-surface-variant p-2">No projects found. Create one to begin.</p>
            ) : (
              projects.map(proj => (
                <div key={proj.id} className="space-y-1">
                  {/* Project row */}
                  <div onClick={() => toggleNode(proj.id)} className="flex items-center justify-between px-3 py-2 text-primary font-bold text-sm bg-primary/5 rounded-lg cursor-pointer border border-primary/10 hover:bg-primary/10 transition-colors group/proj">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">{expandedNodes.has(proj.id) ? 'expand_more' : 'chevron_right'}</span>
                      <span className="material-symbols-outlined text-lg">deployed_code</span>
                      {proj.name}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/proj:opacity-100 transition-opacity">
                      <span onClick={(e) => { e.stopPropagation(); setAddingModuleFor(addingModuleFor === proj.id ? null : proj.id); setNewModuleName(""); if (!expandedNodes.has(proj.id)) toggleNode(proj.id); }} className="material-symbols-outlined text-[16px] text-primary hover:scale-110 transition-transform cursor-pointer" title="Add module">create_new_folder</span>
                      <span onClick={(e) => deleteProject(e, proj.id)} className="material-symbols-outlined text-[16px] text-error hover:scale-110 transition-transform cursor-pointer" title="Delete project">delete</span>
                    </div>
                  </div>

                  {/* Inline add module input */}
                  {addingModuleFor === proj.id && (
                    <div className="ml-6 mt-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-[16px]">folder_open</span>
                      <input
                        autoFocus
                        value={newModuleName}
                        onChange={e => setNewModuleName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addModule(proj.id); if (e.key === "Escape") { setAddingModuleFor(null); setNewModuleName(""); } }}
                        className="flex-1 bg-surface border border-outline-variant px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                        placeholder="Module name"
                      />
                      <span onClick={() => addModule(proj.id)} className="material-symbols-outlined text-[16px] text-secondary cursor-pointer hover:scale-110 transition-transform">check</span>
                      <span onClick={() => { setAddingModuleFor(null); setNewModuleName(""); }} className="material-symbols-outlined text-[16px] text-on-surface-variant cursor-pointer hover:scale-110 transition-transform">close</span>
                    </div>
                  )}

                  {expandedNodes.has(proj.id) && proj.modules && proj.modules.map((mod, idx) => {
                    const modNodeId = `${proj.id}_mod_${idx}`;
                    const isRenamingThisModule = renamingModule?.projId === proj.id && renamingModule?.modIndex === idx;
                    return (
                      <div key={idx} className="ml-6 mt-1 space-y-1">
                        {/* Module row */}
                        <div onClick={() => { toggleNode(modNodeId); selectModule(mod.name, mod.suites, proj.id); }} className="flex items-center justify-between px-3 py-2 text-on-surface-variant font-semibold text-sm hover:bg-surface-container rounded-lg cursor-pointer transition-colors group/mod">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="material-symbols-outlined text-lg shrink-0">{expandedNodes.has(modNodeId) ? 'expand_more' : 'chevron_right'}</span>
                            <span className="material-symbols-outlined text-lg text-secondary shrink-0">folder_open</span>
                            {isRenamingThisModule ? (
                              <input
                                autoFocus
                                value={renameModuleValue}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setRenameModuleValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") renameModuleSave(); if (e.key === "Escape") { setRenamingModule(null); setRenameModuleValue(""); } }}
                                className="flex-1 bg-surface border border-outline-variant px-2 py-0.5 rounded text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none min-w-0"
                              />
                            ) : (
                              <span className="truncate">{mod.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/mod:opacity-100 transition-opacity shrink-0">
                            {isRenamingThisModule ? (
                              <>
                                <span onClick={(e) => { e.stopPropagation(); renameModuleSave(); }} className="material-symbols-outlined text-[14px] text-secondary cursor-pointer hover:scale-110 transition-transform">check</span>
                                <span onClick={(e) => { e.stopPropagation(); setRenamingModule(null); setRenameModuleValue(""); }} className="material-symbols-outlined text-[14px] text-on-surface-variant cursor-pointer hover:scale-110 transition-transform">close</span>
                              </>
                            ) : (
                              <>
                                <span onClick={(e) => { e.stopPropagation(); const key = `${proj.id}_mod_${idx}`; setAddingSuiteFor(addingSuiteFor === key ? null : key); setNewSuiteName(""); if (!expandedNodes.has(modNodeId)) toggleNode(modNodeId); }} className="material-symbols-outlined text-[14px] text-secondary cursor-pointer hover:scale-110 transition-transform" title="Add suite">add</span>
                                <span onClick={(e) => { e.stopPropagation(); setRenamingModule({ projId: proj.id, modIndex: idx }); setRenameModuleValue(mod.name); }} className="material-symbols-outlined text-[14px] text-primary cursor-pointer hover:scale-110 transition-transform" title="Rename">edit</span>
                                <span onClick={(e) => deleteModule(e, proj.id, idx)} className="material-symbols-outlined text-[14px] text-error cursor-pointer hover:scale-110 transition-transform" title="Delete">delete</span>
                              </>
                            )}
                          </div>
                        </div>

                        {expandedNodes.has(modNodeId) && mod.suites && mod.suites.map(suite => {
                          const isRenamingThisSuite = renamingSuite?.projId === proj.id && renamingSuite?.modIndex === idx && renamingSuite?.suite === suite;
                          return (
                            <div key={suite} className="ml-6 space-y-1 border-l-2 border-outline-variant/30 pl-2 mt-1">
                              <div
                                onClick={() => { if (!isRenamingThisSuite) selectSuite(suite, proj.id); }}
                                className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/suite ${selectedSuite === suite ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container'}`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="material-symbols-outlined text-lg shrink-0">{selectedSuite === suite ? 'folder_open' : 'folder'}</span>
                                  {isRenamingThisSuite ? (
                                    <input
                                      autoFocus
                                      value={renameSuiteValue}
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => setRenameSuiteValue(e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter") renameSuiteSave(); if (e.key === "Escape") { setRenamingSuite(null); setRenameSuiteValue(""); } }}
                                      className="flex-1 bg-surface border border-outline-variant px-2 py-0.5 rounded text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none min-w-0"
                                    />
                                  ) : (
                                    <span className="truncate">{suite}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover/suite:opacity-100 transition-opacity shrink-0">
                                  {isRenamingThisSuite ? (
                                    <>
                                      <span onClick={(e) => { e.stopPropagation(); renameSuiteSave(); }} className="material-symbols-outlined text-[14px] text-secondary cursor-pointer hover:scale-110 transition-transform">check</span>
                                      <span onClick={(e) => { e.stopPropagation(); setRenamingSuite(null); setRenameSuiteValue(""); }} className="material-symbols-outlined text-[14px] text-on-surface-variant cursor-pointer hover:scale-110 transition-transform">close</span>
                                    </>
                                  ) : (
                                    <>
                                      <span onClick={(e) => { e.stopPropagation(); setRenamingSuite({ projId: proj.id, modIndex: idx, suite }); setRenameSuiteValue(suite); }} className="material-symbols-outlined text-[14px] text-primary cursor-pointer hover:scale-110 transition-transform" title="Rename">edit</span>
                                      <span onClick={(e) => deleteSuite(e, proj.id, idx, suite)} className="material-symbols-outlined text-[14px] text-error cursor-pointer hover:scale-110 transition-transform" title="Delete">delete</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Inline add suite input */}
                        {addingSuiteFor === `${proj.id}_mod_${idx}` && expandedNodes.has(modNodeId) && (
                          <div className="ml-6 border-l-2 border-outline-variant/30 pl-2 mt-1 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">folder</span>
                            <input
                              autoFocus
                              value={newSuiteName}
                              onChange={e => setNewSuiteName(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") addSuite(proj.id, idx); if (e.key === "Escape") { setAddingSuiteFor(null); setNewSuiteName(""); } }}
                              className="flex-1 bg-surface border border-outline-variant px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                              placeholder="Suite name"
                            />
                            <span onClick={() => addSuite(proj.id, idx)} className="material-symbols-outlined text-[14px] text-secondary cursor-pointer hover:scale-110 transition-transform">check</span>
                            <span onClick={() => { setAddingSuiteFor(null); setNewSuiteName(""); }} className="material-symbols-outlined text-[14px] text-on-surface-variant cursor-pointer hover:scale-110 transition-transform">close</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel - Test case table */}
        <div className="flex-1 flex flex-col bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm" onClick={() => { if (openFilterCol) setOpenFilterCol(null); }}>
          {/* Active filters strip */}
          {activeFiltersCount > 0 && (
            <div className="px-6 py-2 bg-primary/5 border-b border-outline-variant/30 flex items-center gap-3">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Filters:</span>
              {filterPriority !== "All" && (
                <span className="inline-flex items-center gap-1 bg-surface border border-outline-variant/40 px-2 py-1 rounded-md text-[10px] font-bold text-on-surface">
                  Priority: {filterPriority}
                  <span onClick={() => setFilterPriority("All")} className="material-symbols-outlined text-[12px] text-on-surface-variant cursor-pointer hover:text-error">close</span>
                </span>
              )}
              {filterType !== "All" && (
                <span className="inline-flex items-center gap-1 bg-surface border border-outline-variant/40 px-2 py-1 rounded-md text-[10px] font-bold text-on-surface">
                  Type: {filterType}
                  <span onClick={() => setFilterType("All")} className="material-symbols-outlined text-[12px] text-on-surface-variant cursor-pointer hover:text-error">close</span>
                </span>
              )}
              {filterStatus !== "All" && (
                <span className="inline-flex items-center gap-1 bg-surface border border-outline-variant/40 px-2 py-1 rounded-md text-[10px] font-bold text-on-surface">
                  Status: {filterStatus}
                  <span onClick={() => setFilterStatus("All")} className="material-symbols-outlined text-[12px] text-on-surface-variant cursor-pointer hover:text-error">close</span>
                </span>
              )}
              <button className="text-[10px] text-error font-bold hover:underline ml-auto" onClick={() => { setFilterPriority("All"); setFilterType("All"); setFilterStatus("All"); }}>Clear All</button>
            </div>
          )}

          <div className="flex-1 overflow-auto no-scrollbar relative min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-full w-full opacity-50"><p>Loading framework datastores...</p></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant sticky top-0 z-20">
                    <th className="px-6 py-4 w-12 cursor-pointer" onClick={toggleAll}>
                      <input className="rounded border border-outline-variant bg-surface text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer pt-1" type="checkbox" checked={filteredTestCases.length > 0 && selectedIds.size === filteredTestCases.length} onChange={() => {}} />
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Title</th>
                    <ColumnFilter column="Priority" value={filterPriority} setValue={setFilterPriority} options={["All", "Critical", "High", "Medium", "Low"]} />
                    <ColumnFilter column="Type" value={filterType} setValue={setFilterType} options={["All", "Functional", "Regression", "Smoke", "Integration", "Performance", "Security", "Other"]} />
                    <ColumnFilter column="Status" value={filterStatus} setValue={setFilterStatus} options={["All", "Active", "Draft", "PASSED", "FAILED", "BLOCKED", "SKIPPED", "DRAFT"]} />
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Owner</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Last Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredTestCases.map((tc) => (
                    <tr key={tc.id} className="hover:bg-primary/5 transition-colors group cursor-pointer" onClick={() => setViewingTC(tc)}>
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="rounded border border-outline-variant bg-surface text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                          type="checkbox"
                          checked={selectedIds.has(tc.id)}
                          onChange={() => toggleSelection(tc.id)}
                        />
                      </td>
                      <td className="px-4 py-5 text-xs font-bold text-primary">{tc.id.substring(0, 8)}</td>
                      <td className="px-4 py-5">
                        <div className="text-sm font-semibold text-on-surface">{tc.title}</div>
                        {tc.tags && tc.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {tc.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded">{tag}</span>
                            ))}
                            {tc.tags.length > 3 && <span className="text-[9px] text-on-surface-variant font-bold">+{tc.tags.length - 3}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          tc.priority === 'Critical' ? 'bg-error text-white shadow-sm shadow-error/20' :
                          tc.priority === 'High' ? 'bg-error/80 text-white shadow-sm shadow-error/20' :
                          tc.priority === 'Medium' ? 'bg-tertiary/10 text-tertiary' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {tc.priority}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px] text-secondary">
                            {tc.type === 'Functional' ? 'function' : tc.type === 'Regression' ? 'replay' : tc.type === 'Smoke' ? 'local_fire_department' : tc.type === 'Security' ? 'shield' : tc.type === 'Performance' ? 'speed' : 'category'}
                          </span>
                          {tc.type}
                        </div>
                      </td>
                      <td className="px-4 py-5"><span className="bg-secondary/10 border border-secondary/20 text-secondary px-2.5 py-1 rounded text-[10px] font-extrabold uppercase">{tc.status}</span></td>
                      <td className="px-4 py-5 text-xs text-on-surface-variant font-medium">{tc.owner || "—"}</td>
                      <td className="px-4 py-5 text-xs text-on-surface-variant font-medium">{tc.lastRun}</td>
                    </tr>
                  ))}
                  {filteredTestCases.length === 0 && (
                    <tr className="bg-surface-container-low/50">
                      <td colSpan={8} className="text-center py-24">
                        <div className="flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">{selectedSuite ? 'folder_open' : 'account_tree'}</span>
                          <p className="text-on-surface-variant font-bold text-lg mb-2">{selectedSuite ? 'Empty Suite' : 'Select a Suite'}</p>
                          <p className="text-sm text-on-surface-variant/70 mb-6">
                            {selectedSuite
                              ? `No test cases are currently assigned to ${selectedViewName || 'this suite'}.`
                              : 'Navigate to a suite from the explorer to view and create test cases.'}
                          </p>
                          {selectedSuite && (
                            <button onClick={() => { resetTCForm(); setIsTCModalOpen(true); }} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg transition-colors text-sm">
                              + Create Test Case
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Floating action bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl flex items-center gap-8 border border-white/40 z-50 transition-all animation-slide-up">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm">{selectedIds.size}</span>
            <span className="text-sm font-bold text-on-surface tracking-tight">Test Cases Selected</span>
          </div>
          <div className="h-6 w-px bg-outline-variant"></div>
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary text-xs font-bold transition-all">
              <span className="material-symbols-outlined text-lg">play_arrow</span> Run
            </button>
            <button
              className="flex items-center gap-2 text-error hover:brightness-125 text-xs font-bold transition-all group"
              onClick={handleDeleteSelected}
            >
              <span className="material-symbols-outlined text-lg group-hover:scale-110 transition">delete</span> Delete
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CREATE TEST CASE — Full-Screen Two-Panel Modal
          ═══════════════════════════════════════════════════════════════ */}
      {isTCModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4 py-6">
          <form onSubmit={submitNewTC} className="bg-surface w-full max-w-[960px] max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-outline-variant flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-outline-variant/50 bg-surface shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold font-headline text-on-surface">Create Test Case</h3>
                {selectedSuite && (
                  <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">folder</span>
                    {selectedSuite}
                  </span>
                )}
              </div>
              <span onClick={() => { setIsTCModalOpen(false); resetTCForm(); }} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1.5 transition-colors text-xl">close</span>
            </div>

            {/* Body — Two Columns */}
            <div className="flex flex-1 overflow-hidden">

              {/* Left Column — Main Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                    Title <span className="text-error">*</span>
                  </label>
                  <input
                    autoFocus
                    required
                    value={newTC.title}
                    onChange={e => setNewTC({ ...newTC, title: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm"
                    placeholder="Enter test case name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea
                    value={newTC.description}
                    onChange={e => setNewTC({ ...newTC, description: e.target.value })}
                    rows={3}
                    className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none"
                    placeholder="Add a description for this test case..."
                  />
                </div>

                {/* Preconditions */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Preconditions</label>
                  <textarea
                    value={newTC.preconditions}
                    onChange={e => setNewTC({ ...newTC, preconditions: e.target.value })}
                    rows={3}
                    className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none"
                    placeholder="Define any preconditions about the test..."
                  />
                </div>

                {/* Steps and Expected Results */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-3 uppercase tracking-wider">Steps and Results</label>
                  <div className="space-y-3">
                    {tcSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 items-start group">
                        <div className="flex items-center gap-2 pt-3 shrink-0">
                          <span className="material-symbols-outlined text-on-surface-variant/40 text-sm cursor-grab">drag_indicator</span>
                          <span className="w-6 h-6 rounded-md bg-surface-container flex items-center justify-center text-[11px] font-bold text-on-surface-variant">{idx + 1}</span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            {idx === 0 && <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Step</p>}
                            <textarea
                              value={step.step}
                              onChange={e => updateStep(idx, "step", e.target.value)}
                              rows={3}
                              className="w-full bg-surface-container-low border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none"
                              placeholder="Details of the step"
                            />
                          </div>
                          <div>
                            {idx === 0 && <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Expected Result</p>}
                            <textarea
                              value={step.expected}
                              onChange={e => updateStep(idx, "expected", e.target.value)}
                              rows={3}
                              className="w-full bg-surface-container-low border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none"
                              placeholder="Expected result"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className={`pt-3 shrink-0 ${tcSteps.length <= 1 ? 'invisible' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                        >
                          <span className="material-symbols-outlined text-error/60 hover:text-error text-[18px] transition-colors">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button type="button" onClick={addStep} className="flex items-center gap-1.5 text-primary text-xs font-bold hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-[16px]">add</span> Add Step
                    </button>
                  </div>
                </div>

                {/* Attachments (mock) */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Attachments</label>
                  <div className="border border-dashed border-outline-variant rounded-lg p-4 flex items-center gap-3 bg-surface-container-low/50 hover:bg-surface-container-low transition-colors cursor-pointer relative">
                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={() => {}} />
                    <span className="material-symbols-outlined text-on-surface-variant">upload_file</span>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Upload Files</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">Max. file size: 50 MB | Max. files: 10 (per upload)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column — Test Case Fields Sidebar */}
              <div className="w-[300px] bg-surface-container-low/50 border-l border-outline-variant/50 overflow-y-auto p-6 space-y-5 shrink-0">

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">Test Case Fields</span>
                </div>

                {/* Owner */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Owner</label>
                  <input
                    value={newTC.owner}
                    onChange={e => setNewTC({ ...newTC, owner: e.target.value })}
                    className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm"
                    placeholder="e.g. Sambhav Suri"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                    State <span className="text-error">*</span>
                  </label>
                  <select value={newTC.status} onChange={e => setNewTC({ ...newTC, status: e.target.value })} className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                    <option>Active</option>
                    <option>Draft</option>
                    <option>Approved</option>
                    <option>Deprecated</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                    Priority <span className="text-error">*</span>
                  </label>
                  <select value={newTC.priority} onChange={e => setNewTC({ ...newTC, priority: e.target.value })} className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                {/* Type of Test Case */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                    Type of Test Case <span className="text-error">*</span>
                  </label>
                  <select value={newTC.type} onChange={e => setNewTC({ ...newTC, type: e.target.value })} className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                    <option>Functional</option>
                    <option>Regression</option>
                    <option>Smoke</option>
                    <option>Integration</option>
                    <option>Performance</option>
                    <option>Security</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Automation Status */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                    Automation Status <span className="text-error">*</span>
                  </label>
                  <select value={newTC.automationStatus} onChange={e => setNewTC({ ...newTC, automationStatus: e.target.value })} className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                    <option>Not Automated</option>
                    <option>Automated</option>
                    <option>Planned</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {newTC.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md">
                        {tag}
                        <span onClick={() => removeTag(tag)} className="material-symbols-outlined text-[12px] cursor-pointer hover:text-error transition-colors">close</span>
                      </span>
                    ))}
                  </div>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm"
                    placeholder="Add tags and hit ↵"
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-outline-variant/40 pt-4">
                  <span className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">Plan & Suite</span>
                </div>

                {/* Assign to Test Plan */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Assign to Test Plan</label>
                  <select value={newTC.planId} onChange={e => setNewTC({ ...newTC, planId: e.target.value })} className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                    <option value="">No Plan (Unassigned)</option>
                    {testPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </div>

                {/* Mapped Suite — always set since modal only opens when a suite is selected */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Mapped Suite</label>
                  <div className="w-full bg-surface-container border border-outline-variant px-3 py-2.5 rounded-lg text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[16px]">folder</span>
                    <span className="font-semibold">{selectedSuite}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-8 py-4 border-t border-outline-variant/50 bg-surface shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={e => setCreateAnother(e.target.checked)}
                  className="rounded border border-outline-variant bg-surface text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-on-surface-variant font-medium">Create another</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setIsTCModalOpen(false); resetTCForm(); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-5 py-2.5 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Create</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Project Creation Modal */}
      {isProjModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <form onSubmit={submitNewProj} className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-headline text-on-surface">Create Project</h3>
              <span onClick={() => setIsProjModalOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container p-1 rounded-full transition-colors">close</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Project Name</label>
                <input autoFocus required value={newProj.name} onChange={e => setNewProj({ ...newProj, name: e.target.value })} className="w-full bg-surface-container border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition" placeholder="e.g. Project Beta" />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setIsProjModalOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="bg-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:opacity-90 active:scale-95 transition">Create Engine</button>
            </div>
          </form>
        </div>
      )}

      {/* Import CSV/Excel Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4 py-6">
          <div className="bg-surface w-full max-w-[900px] max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-outline-variant flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-outline-variant/50 shrink-0">
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Bulk Import Test Cases</h3>
                <p className="text-xs font-medium text-on-surface-variant mt-1">
                  {importDone ? `Import complete.` : importParsed ? `${importParsed.length} test cases parsed. Review and confirm.` : "Upload a CSV file with your test cases."}
                </p>
              </div>
              <span onClick={() => { setIsImportModalOpen(false); resetImport(); }} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1.5 transition-colors text-xl">close</span>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {/* ── Step 1: Upload ── */}
              {!importParsed && !importDone && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface-container transition-colors group relative cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    />
                    <span className="material-symbols-outlined text-4xl text-primary bg-primary/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">upload_file</span>
                    <p className="text-sm font-bold text-on-surface text-center">Drag and drop your file here</p>
                    <p className="text-[11px] font-semibold text-on-surface-variant text-center mt-1">Supports CSV, Excel (.xlsx, .xls) files up to 20MB</p>
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">description</span>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-on-surface truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <span onClick={() => setSelectedFile(null)} className="material-symbols-outlined text-sm text-error cursor-pointer">delete</span>
                    </div>
                  )}
                  <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Expected CSV Columns</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Test ID", "Test Name", "Page", "Steps to Reproduce", "Expected Result", "Actual Result", "Status", "Duration (s)", "Timestamp"].map(col => (
                        <span key={col} className="px-2 py-1 bg-surface border border-outline-variant/40 text-[10px] font-bold text-on-surface-variant rounded">{col}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Preview ── */}
              {importParsed && !importDone && (
                <div className="space-y-4">
                  <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
                    <div className="max-h-[400px] overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container border-b border-outline-variant sticky top-0 z-10">
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-8">#</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Test ID</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Page/Suite</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Steps</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {importParsed.map((row, idx) => (
                            <tr key={idx} className="hover:bg-primary/5 transition-colors">
                              <td className="px-4 py-2.5 text-[10px] font-bold text-on-surface-variant">{idx + 1}</td>
                              <td className="px-4 py-2.5 text-xs font-mono font-bold text-primary">{row.csvId}</td>
                              <td className="px-4 py-2.5 text-sm font-medium text-on-surface max-w-[200px] truncate">{row.title}</td>
                              <td className="px-4 py-2.5 text-xs text-on-surface-variant">{row.page || "—"}</td>
                              <td className="px-4 py-2.5 text-xs text-on-surface-variant">{row.steps?.length || 0} steps</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  row.status === "PASSED" ? "bg-secondary/10 text-secondary" :
                                  row.status === "FAILED" ? "bg-error/10 text-error" :
                                  "bg-surface-container text-on-surface-variant"
                                }`}>{row.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Destination picker */}
                  <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 space-y-4">
                    <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">Import Destination</p>

                    {/* Tabs: existing vs new */}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setImportDestMode("existing")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${importDestMode === "existing" ? "bg-primary text-white shadow-sm" : "bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container"}`}>
                        Existing Suite
                      </button>
                      <button type="button" onClick={() => setImportDestMode("new")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${importDestMode === "new" ? "bg-primary text-white shadow-sm" : "bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container"}`}>
                        Create New
                      </button>
                    </div>

                    {importDestMode === "existing" ? (
                      <div>
                        <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Select Suite</label>
                        <select
                          value={importProjectId && importSuite ? `${importProjectId}::${importSuite}` : ""}
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) { setImportProjectId(""); setImportSuite(""); return; }
                            const [pId, s] = val.split("::");
                            setImportProjectId(pId);
                            setImportSuite(s);
                          }}
                          className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm"
                        >
                          <option value="">— Select a destination suite —</option>
                          {importSuiteOptions.map((opt, i) => (
                            <option key={i} value={`${opt.projectId}::${opt.suite}`}>
                              {opt.projectName} / {opt.moduleName} / {opt.suite}
                            </option>
                          ))}
                        </select>
                        {!importSuite && (
                          <p className="text-[10px] text-error font-bold mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">warning</span>
                            Please select a suite to import into.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">New Project Name <span className="text-error">*</span></label>
                          <input value={importNewProjectName} onChange={e => setImportNewProjectName(e.target.value)}
                            className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none shadow-sm"
                            placeholder="e.g. Web Portal" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Module Name <span className="text-error">*</span></label>
                          <input value={importNewModuleName} onChange={e => setImportNewModuleName(e.target.value)}
                            className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none shadow-sm"
                            placeholder="e.g. Authentication" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Suite Name <span className="text-error">*</span></label>
                          <input value={importNewSuiteName} onChange={e => setImportNewSuiteName(e.target.value)}
                            className="w-full bg-surface border border-outline-variant px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none shadow-sm"
                            placeholder="e.g. Login Tests" />
                        </div>
                        {(!importNewProjectName.trim() || !importNewModuleName.trim() || !importNewSuiteName.trim()) && (
                          <p className="text-[10px] text-error font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">warning</span>
                            All three fields are required to create a new destination.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 3: Done ── */}
              {importDone && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h4 className="text-xl font-bold font-headline text-on-surface">Import Successful</h4>
                  <p className="text-sm text-on-surface-variant text-center">
                    Successfully imported <span className="font-bold text-secondary">{importDone.success}</span> out of <span className="font-bold">{importDone.total}</span> test cases.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-outline-variant/50 shrink-0 bg-surface">
              {!importParsed && !importDone && (
                <>
                  <button type="button" onClick={() => { setIsImportModalOpen(false); resetImport(); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                  <button disabled={!selectedFile} onClick={handleParseFile} className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">table_chart</span> Parse & Preview
                  </button>
                </>
              )}
              {importParsed && !importDone && (() => {
                const destValid = importDestMode === "existing"
                  ? !!(importProjectId && importSuite)
                  : !!(importNewProjectName.trim() && importNewModuleName.trim() && importNewSuiteName.trim());
                return (
                  <>
                    <button type="button" onClick={() => { setImportParsed(null); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Back</button>
                    <button disabled={importLoading || !destValid} onClick={runImport} className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      {importLoading ? (
                        <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Importing...</>
                      ) : (
                        <><span className="material-symbols-outlined text-[16px]">download</span> Import {importParsed.length} Cases</>
                      )}
                    </button>
                  </>
                );
              })()}
              {importDone && (
                <button onClick={() => { setIsImportModalOpen(false); resetImport(); }} className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate with AI Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4 py-6">
          <div className="bg-surface w-full max-w-[900px] max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-primary/30 relative flex flex-col">
            <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-start px-8 py-5 border-b border-outline-variant/30 relative z-10 shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded uppercase text-primary text-[10px] font-extrabold tracking-widest mb-3 border border-primary/20">
                  <span className="material-symbols-outlined text-xs">auto_awesome</span> Powered By Gemini AI
                </div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Generate from BRD</h3>
                <p className="text-xs font-medium text-on-surface-variant mt-1">
                  {aiImportDone ? "Import complete." : aiResults ? `${aiResults.length} test cases generated. Select which to keep.` : "Upload a requirements document to auto-generate test cases."}
                </p>
              </div>
              <span onClick={() => { setIsAIModalOpen(false); resetAI(); }} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-white rounded-full p-1.5 transition-colors border border-outline-variant shadow-sm text-xl relative z-10">close</span>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6 relative z-10">
              {/* Step 1: Upload */}
              {!aiResults && !aiImportDone && !aiGenerating && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-primary/30 rounded-xl p-10 flex flex-col items-center justify-center bg-white hover:bg-primary/5 transition-colors group relative cursor-pointer">
                    <input type="file" accept=".pdf,.docx,.txt" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                    <span className="material-symbols-outlined text-5xl text-primary drop-shadow mb-3 group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
                    <p className="text-sm font-bold text-on-surface text-center">Drop your BRD or Requirements file</p>
                    <p className="text-[11px] font-semibold text-on-surface-variant text-center mt-1">Supports PDF, DOCX, TXT</p>
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-white border border-outline-variant rounded-lg flex items-center gap-3 shadow-sm">
                      <span className="material-symbols-outlined text-primary">description</span>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-on-surface truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <span onClick={() => setSelectedFile(null)} className="material-symbols-outlined text-sm text-error cursor-pointer">delete</span>
                    </div>
                  )}
                  {aiError && (
                    <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
                      <span className="material-symbols-outlined text-error text-[18px] mt-0.5">error</span>
                      <p className="text-xs text-error font-medium">{aiError}</p>
                    </div>
                  )}
                  {!selectedSuite && (
                    <div className="p-3 bg-tertiary/10 border border-tertiary/20 rounded-lg flex items-start gap-2">
                      <span className="material-symbols-outlined text-tertiary text-[18px] mt-0.5">warning</span>
                      <p className="text-xs text-tertiary font-medium">Navigate to a suite first. Generated test cases will be saved to the selected suite.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Generating spinner */}
              {aiGenerating && !aiResults && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
                  </div>
                  <h4 className="text-lg font-bold font-headline text-on-surface">Analyzing Document...</h4>
                  <p className="text-sm text-on-surface-variant text-center max-w-md">Gemini is reading your BRD and generating comprehensive test cases. This may take 15-30 seconds.</p>
                </div>
              )}

              {/* Step 2: Preview & Select */}
              {aiResults && !aiImportDone && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={aiResults.length > 0 && aiSelected.size === aiResults.length} onChange={toggleAiSelectAll} className="rounded border border-outline-variant bg-surface text-primary w-4 h-4 cursor-pointer" />
                      <span className="text-xs font-bold text-on-surface">Select All ({aiSelected.size}/{aiResults.length})</span>
                    </label>
                    {selectedSuite && (
                      <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-secondary text-[14px]">folder</span>
                        Importing to: {selectedSuite}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {aiResults.map((tc, idx) => (
                      <div key={idx} className={`bg-white border rounded-xl p-4 transition-all cursor-pointer ${aiSelected.has(idx) ? "border-primary/40 shadow-sm" : "border-outline-variant/30 opacity-60"}`} onClick={() => toggleAiSelect(idx)}>
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={aiSelected.has(idx)} onChange={() => toggleAiSelect(idx)} onClick={e => e.stopPropagation()} className="rounded border border-outline-variant bg-surface text-primary w-4 h-4 cursor-pointer mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-bold text-on-surface">{tc.title || "Untitled"}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${tc.priority === "Critical" || tc.priority === "High" ? "bg-error text-white" : tc.priority === "Medium" ? "bg-tertiary/10 text-tertiary" : "bg-slate-100 text-slate-500"}`}>{tc.priority || "Medium"}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-container text-on-surface-variant">{tc.type || "Functional"}</span>
                            </div>
                            {tc.description && <p className="text-xs text-on-surface-variant mb-2 line-clamp-2">{tc.description}</p>}
                            {tc.steps && tc.steps.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                                <span className="material-symbols-outlined text-[12px]">checklist</span>
                                {tc.steps.length} step{tc.steps.length !== 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Done */}
              {aiImportDone && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h4 className="text-xl font-bold font-headline text-on-surface">Test Cases Created</h4>
                  <p className="text-sm text-on-surface-variant text-center">
                    Successfully imported <span className="font-bold text-secondary">{aiImportDone.success}</span> out of <span className="font-bold">{aiImportDone.total}</span> AI-generated test cases into <span className="font-bold">{selectedSuite}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-outline-variant/30 relative z-10 shrink-0 bg-surface">
              {!aiResults && !aiImportDone && !aiGenerating && (
                <>
                  <button type="button" onClick={() => { setIsAIModalOpen(false); resetAI(); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                  <button disabled={!selectedFile || !selectedSuite} onClick={handleAIGenerate} className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span> Scan & Generate
                  </button>
                </>
              )}
              {aiResults && !aiImportDone && (
                <>
                  <button type="button" onClick={() => { setAiResults(null); setAiSelected(new Set()); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Back</button>
                  <button disabled={aiSelected.size === 0 || aiGenerating} onClick={importAIResults} className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {aiGenerating ? (
                      <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Importing...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[16px]">download</span> Import {aiSelected.size} Test Case{aiSelected.size !== 1 ? "s" : ""}</>
                    )}
                  </button>
                </>
              )}
              {aiImportDone && (
                <button onClick={() => { setIsAIModalOpen(false); resetAI(); }} className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition">Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Test Case Detail Slideout ═══ */}
      {viewingTC && (
        <div className="fixed inset-0 z-[100] flex justify-end" onClick={() => setViewingTC(null)}>
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-[2px]"></div>
          <div className="relative w-full max-w-[600px] bg-surface h-full shadow-2xl border-l border-outline-variant/50 flex flex-col overflow-hidden animate-[slideInRight_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-8 py-5 border-b border-outline-variant/30 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono">{viewingTC.id.substring(0, 12)}</span>
                <span onClick={() => setViewingTC(null)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1.5 transition-colors">close</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface leading-snug">{viewingTC.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  viewingTC.priority === 'Critical' || viewingTC.priority === 'High' ? 'bg-error text-white' :
                  viewingTC.priority === 'Medium' ? 'bg-tertiary/10 text-tertiary' : 'bg-slate-100 text-slate-500'
                }`}>{viewingTC.priority}</span>
                <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-bold text-on-surface-variant">{viewingTC.type}</span>
                <span className="bg-secondary/10 border border-secondary/20 text-secondary px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">{viewingTC.status}</span>
                {viewingTC.automationStatus && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">{viewingTC.automationStatus}</span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Owner</p>
                  <p className="text-sm font-semibold text-on-surface">{viewingTC.owner || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Suite</p>
                  <p className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[16px]">folder</span>
                    {viewingTC.suite || "None"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Last Run</p>
                  <p className="text-sm font-semibold text-on-surface">{viewingTC.lastRun || "Never"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Plan</p>
                  <p className="text-sm font-semibold text-on-surface">
                    {viewingTC.planId ? (testPlans.find(p => p.id === viewingTC.planId)?.name || viewingTC.planId) : "None"}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {viewingTC.tags && viewingTC.tags.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingTC.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {viewingTC.description && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Description</p>
                  <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
                    <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{viewingTC.description}</p>
                  </div>
                </div>
              )}

              {/* Preconditions */}
              {viewingTC.preconditions && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Preconditions</p>
                  <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
                    <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{viewingTC.preconditions}</p>
                  </div>
                </div>
              )}

              {/* Steps & Expected Results */}
              {viewingTC.steps && viewingTC.steps.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Steps & Expected Results</p>
                  <div className="space-y-3">
                    {viewingTC.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-extrabold text-primary mt-0.5">{idx + 1}</div>
                        <div className="flex-1 space-y-1.5">
                          <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/30">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Step</p>
                            <p className="text-sm text-on-surface leading-relaxed">{step.step || "—"}</p>
                          </div>
                          {step.expected && (
                            <div className="bg-secondary/5 rounded-lg p-3 border border-secondary/20">
                              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Expected Result</p>
                              <p className="text-sm text-on-surface leading-relaxed">{step.expected}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No details fallback */}
              {!viewingTC.description && !viewingTC.preconditions && (!viewingTC.steps || viewingTC.steps.length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline-variant mb-3">article</span>
                  <p className="text-on-surface-variant font-bold">No details added yet</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1">This test case has no description, preconditions, or steps.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Confirmation Dialog ═══ */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-outline-variant">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-error text-xl">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline text-on-surface">{confirmDialog.title}</h3>
                  <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{confirmDialog.message}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-surface-container-low/50 border-t border-outline-variant/30">
              <button onClick={() => setConfirmDialog(null)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={confirmDialog.onConfirm} className="bg-error text-white font-bold text-sm px-5 py-2 rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
