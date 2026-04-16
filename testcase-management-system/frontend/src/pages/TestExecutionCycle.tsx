import { useState, useEffect } from "react";

interface TestPlan {
  id: string;
  name: string;
  description: string;
  status: string;
  owner: string;
}

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

interface ProjectData {
  id: string;
  name: string;
  modules: { name: string; suites: string[] }[];
}

interface RunResult {
  testCaseId: string;
  status: string; // Passed | Failed | Blocked | Retest | Skipped | Untested
  comment?: string;
  stepComments?: Record<string, string>;
}

interface TestRun {
  id: string;
  name: string;
  status: string; // In Progress | Completed
  assignedTo: string;
  projectId: string;
  planId?: string;
  createdAt: string;
  results: RunResult[];
}

export default function TestExecutionCycle() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Views
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [listTab, setListTab] = useState<"active" | "closed">("active");

  // Detail view state
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [originalFilter, setOriginalFilter] = useState("All");

  // Create run modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRun, setNewRun] = useState({ name: "", assignedTo: "", projectId: "", planId: "", scope: "project" as "project" | "module" | "suite", moduleName: "", suiteName: "" });
  const [includeExistingResults, setIncludeExistingResults] = useState(false);

  // (Comment editing moved to step-level in slideout)

  // Test case detail slideout
  const [viewingTC, setViewingTC] = useState<TestCase | null>(null);

  // Selection for escalation
  const [selectedTcIds, setSelectedTcIds] = useState<Set<string>>(new Set());

  // Escalation modal
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [escalation, setEscalation] = useState({ assignedTo: "", severity: "High", description: "" });

  // Escalations data
  const [escalations, setEscalations] = useState<any[]>([]);

  // Azure integration
  const [azureUsers, setAzureUsers] = useState<{ id: string; displayName: string; uniqueName: string }[]>([]);
  const [azureConnected, setAzureConnected] = useState(false);
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);

  // Assignee search
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);

  // Discussion panel for escalations
  const [activeDiscussionEscId, setActiveDiscussionEscId] = useState<string | null>(null);
  const [discussionComments, setDiscussionComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // Detail view tab
  const [detailTab, setDetailTab] = useState<"cases" | "escalated">("cases");

  // Delete run confirmation
  const [confirmDeleteRunId, setConfirmDeleteRunId] = useState<string | null>(null);

  // Step comment editing in slideout
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [stepCommentDraft, setStepCommentDraft] = useState("");

  const fetchData = async () => {
    try {
      const [runsRes, tcRes, projRes, plansRes, escRes] = await Promise.all([
        fetch("http://localhost:3001/api/testruns"),
        fetch("http://localhost:3001/api/testcases"),
        fetch("http://localhost:3001/api/projects"),
        fetch("http://localhost:3001/api/testplans"),
        fetch("http://localhost:3001/api/escalations")
      ]);
      if (runsRes.ok) setRuns(await runsRes.json());
      if (tcRes.ok) setTestCases(await tcRes.json());
      if (projRes.ok) setProjects(await projRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
      if (escRes.ok) setEscalations(await escRes.json());
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Fetch Azure users on mount
  useEffect(() => {
    fetch("http://localhost:3001/api/azure/test-connection")
      .then(r => r.json())
      .then(data => { if (data.connected) setAzureConnected(true); })
      .catch(() => {});
    fetch("http://localhost:3001/api/azure/users")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAzureUsers(data); })
      .catch(() => {});
  }, []);

  // Fetch discussion comments for an escalation
  const fetchDiscussion = async (escId: string, workItemId: number) => {
    setActiveDiscussionEscId(escId);
    setLoadingComments(true);
    setDiscussionComments([]);
    try {
      const r = await fetch(`http://localhost:3001/api/azure/workitem/${workItemId}/comments`);
      if (r.ok) setDiscussionComments(await r.json());
    } catch { }
    setLoadingComments(false);
  };

  const postComment = async (workItemId: number) => {
    if (!newComment.trim()) return;
    try {
      const r = await fetch(`http://localhost:3001/api/azure/workitem/${workItemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment.trim() }),
      });
      if (r.ok) {
        const c = await r.json();
        setDiscussionComments(prev => [...prev, c]);
        setNewComment("");
      }
    } catch { }
  };

  // ── Helpers ───────────────────────────────────────────────
  const getRunStats = (run: TestRun) => {
    const total = run.results.length;
    const passed = run.results.filter(r => r.status === "Passed").length;
    const failed = run.results.filter(r => r.status === "Failed").length;
    const blocked = run.results.filter(r => r.status === "Blocked").length;
    const retest = run.results.filter(r => r.status === "Retest").length;
    const skipped = run.results.filter(r => r.status === "Skipped").length;
    const untested = run.results.filter(r => r.status === "Untested").length;
    const completed = passed + failed + blocked + retest + skipped;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, passed, failed, blocked, retest, skipped, untested, percent };
  };

  const getTcById = (id: string) => testCases.find(tc => tc.id === id);

  const getProjectForRun = (run: TestRun) => projects.find(p => p.id === run.projectId);

  // Get modules/suites for a run's project, with counts from run results
  const getModuleTree = (run: TestRun) => {
    const proj = getProjectForRun(run);
    if (!proj) return [];
    return proj.modules.map(mod => {
      const suiteData = mod.suites.map(suite => {
        const casesInSuite = run.results.filter(r => {
          const tc = getTcById(r.testCaseId);
          return tc && tc.suite === suite;
        });
        return { name: suite, total: casesInSuite.length, results: casesInSuite };
      });
      const totalInModule = suiteData.reduce((sum, s) => sum + s.total, 0);
      return { name: mod.name, suites: suiteData, total: totalInModule };
    });
  };

  // Map test case status to run result status
  const mapTcStatusToRunStatus = (tcStatus: string): string => {
    const s = tcStatus.toUpperCase();
    if (s === "PASSED") return "Passed";
    if (s === "FAILED") return "Failed";
    if (s === "BLOCKED") return "Blocked";
    if (s === "SKIPPED") return "Skipped";
    return "Untested";
  };

  // Create run
  const submitCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRun.name.trim() || !newRun.projectId) return;

    let projectCases = testCases.filter(tc => tc.projectId === newRun.projectId);
    if (newRun.scope === "module" && newRun.moduleName) {
      const proj = projects.find(p => p.id === newRun.projectId);
      const mod = proj?.modules.find(m => m.name === newRun.moduleName);
      const suiteNames = mod?.suites || [];
      projectCases = projectCases.filter(tc => tc.suite && suiteNames.includes(tc.suite));
    } else if (newRun.scope === "suite" && newRun.suiteName) {
      projectCases = projectCases.filter(tc => tc.suite === newRun.suiteName);
    }
    const results: RunResult[] = projectCases.map(tc => ({
      testCaseId: tc.id,
      status: includeExistingResults ? mapTcStatusToRunStatus(tc.status) : "Untested"
    }));

    try {
      await fetch("http://localhost:3001/api/testruns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRun,
          status: "In Progress",
          createdAt: new Date().toISOString().split("T")[0],
          results
        })
      });
      setIsCreateOpen(false);
      setNewRun({ name: "", assignedTo: "", projectId: "", planId: "", scope: "project", moduleName: "", suiteName: "" });
      setIncludeExistingResults(false);
      fetchData();
    } catch (error) { console.error("Error creating run:", error); }
  };

  // Delete a run
  const deleteRun = async (runId: string) => {
    try {
      await fetch(`http://localhost:3001/api/testruns/${runId}`, { method: "DELETE" });
      setRuns(prev => prev.filter(r => r.id !== runId));
      setConfirmDeleteRunId(null);
    } catch (error) {
      console.error("Error deleting run:", error);
    }
  };

  // Update a single test case result in a run
  const updateResultStatus = async (run: TestRun, testCaseId: string, newStatus: string) => {
    const updatedResults = run.results.map(r =>
      r.testCaseId === testCaseId ? { ...r, status: newStatus } : r
    );
    try {
      const updated = { ...run, results: updatedResults };
      await fetch(`http://localhost:3001/api/testruns/${run.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      setSelectedRun(updated);
      fetchData();
    } catch (error) { console.error("Error updating result:", error); }
  };

  // Save a step-level comment for a test case in a run
  const saveStepComment = async (run: TestRun, testCaseId: string, stepIndex: number, comment: string) => {
    const updatedResults = run.results.map(r => {
      if (r.testCaseId !== testCaseId) return r;
      const existing = r.stepComments || {};
      const updated = { ...existing };
      if (comment.trim()) {
        updated[String(stepIndex)] = comment.trim();
      } else {
        delete updated[String(stepIndex)];
      }
      return { ...r, stepComments: updated };
    });
    try {
      const updated = { ...run, results: updatedResults };
      await fetch(`http://localhost:3001/api/testruns/${run.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      setSelectedRun(updated);
      fetchData();
    } catch (error) { console.error("Error saving step comment:", error); }
  };

  // Escalate a single test case from the slideout
  const escalateSingleFromSlideout = async (run: TestRun, tc: TestCase) => {
    const result = run.results.find(r => r.testCaseId === tc.id);
    // Build description from step comments
    const stepCommentsArr: string[] = [];
    if (result?.stepComments) {
      Object.entries(result.stepComments).forEach(([idx, comment]) => {
        stepCommentsArr.push(`Step ${Number(idx) + 1}: ${comment}`);
      });
    }
    const autoDesc = stepCommentsArr.length > 0
      ? stepCommentsArr.join("\n")
      : result?.comment || "";

    setViewingTC(null);
    setSelectedTcIds(new Set([tc.id]));
    setEscalation({ assignedTo: "", severity: "High", description: autoDesc });
    setAssigneeSearch("");
    setAssigneeDropdownOpen(false);
    setIsEscalateOpen(true);
  };

  // Close run
  const closeRun = async (run: TestRun) => {
    try {
      await fetch(`http://localhost:3001/api/testruns/${run.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...run, status: "Completed" })
      });
      setSelectedRun({ ...run, status: "Completed" });
      fetchData();
    } catch (error) { console.error("Error closing run:", error); }
  };

  // Selection helpers
  const toggleTcSelection = (id: string) => {
    const next = new Set(selectedTcIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedTcIds(next);
  };

  const openEscalateModal = () => {
    if (!selectedRun) return;
    // If nothing selected, auto-select all Failed/Blocked in current filtered view
    if (selectedTcIds.size === 0) {
      const failedIds = selectedRun.results
        .filter(r => r.status === "Failed" || r.status === "Blocked")
        .map(r => r.testCaseId);
      setSelectedTcIds(new Set(failedIds));
    }
    setEscalation({ assignedTo: "", severity: "High", description: "" });
    setAssigneeSearch("");
    setAssigneeDropdownOpen(false);
    setIsEscalateOpen(true);
  };

  const submitEscalation = async () => {
    if (!selectedRun || selectedTcIds.size === 0 || !escalation.assignedTo.trim()) return;

    const items = Array.from(selectedTcIds).map(tcId => {
      const tc = getTcById(tcId);
      const result = selectedRun.results.find(r => r.testCaseId === tcId);
      // Build comment from step comments if available
      const stepCommentsArr: string[] = [];
      if (result?.stepComments) {
        Object.entries(result.stepComments).forEach(([idx, c]) => {
          stepCommentsArr.push(`Step ${Number(idx) + 1}: ${c}`);
        });
      }
      const comment = stepCommentsArr.length > 0
        ? stepCommentsArr.join("; ")
        : result?.comment || "";
      return {
        testCaseId: tcId,
        title: tc?.title || tcId,
        suite: tc?.suite || "",
        originalStatus: tc?.status || "",
        runStatus: result?.status || "",
        comment,
      };
    });

    // Build HTML description for Azure work item with full steps
    const htmlDesc = items.map(item => {
      const tc = getTcById(item.testCaseId);
      const result = selectedRun.results.find(r => r.testCaseId === item.testCaseId);
      const stepComments = result?.stepComments || {};

      let stepsHtml = "";
      if (tc?.steps && tc.steps.length > 0) {
        // Find the first failed step index (step with a comment)
        const failedStepIdx = tc.steps.findIndex((_, idx) => !!stepComments[String(idx)]);

        stepsHtml = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0;">
          <tr style="background:#f0f0f0;"><th>#</th><th>Step</th><th>Expected Result</th><th>Status</th></tr>`;
        tc.steps.forEach((step, idx) => {
          const comment = stepComments[String(idx)];
          const hasError = !!comment;
          const isAfterFail = failedStepIdx >= 0 && idx > failedStepIdx && !hasError;
          const rowStyle = hasError ? 'background:#fef2f2;' : isAfterFail ? 'background:#f5f5f5;' : '';
          let statusCell = "";
          if (hasError) {
            statusCell = `<span style="color:#dc2626;font-weight:bold;">❌ FAILED</span><br/><span style="color:#dc2626;font-size:11px;">${comment}</span>`;
          } else if (isAfterFail) {
            statusCell = `<span style="color:#9ca3af;">— Not Executed</span>`;
          } else {
            statusCell = `<span style="color:#16a34a;">✔ Passed</span>`;
          }
          stepsHtml += `<tr style="${rowStyle}">
            <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
            <td>${step.step || "—"}</td>
            <td>${step.expected || "—"}</td>
            <td style="text-align:center;">${statusCell}</td>
          </tr>`;
        });
        stepsHtml += `</table>`;
      }

      return `<h3>${item.title}</h3>
        <p><b>Test Case ID:</b> ${item.testCaseId}<br/>
        <b>Original Status:</b> ${item.originalStatus} → <b>Run Status:</b> ${item.runStatus}</p>
        ${tc?.description ? `<p><b>Description:</b> ${tc.description}</p>` : ""}
        ${tc?.preconditions ? `<p><b>Preconditions:</b> ${tc.preconditions}</p>` : ""}
        ${stepsHtml}
        ${item.comment ? `<p><b>Tester Summary:</b> ${item.comment}</p>` : ""}
        <hr/>`;
    }).join("");
    const fullDesc = `<h2>Escalation from TCMS — ${selectedRun.name}</h2>
      ${escalation.description.trim() ? `<p><b>Notes:</b> ${escalation.description.trim()}</p>` : ""}
      <p><b>Severity:</b> ${escalation.severity} | <b>Test Cases:</b> ${items.length}</p>
      <hr/>${htmlDesc}`;

    // Create Azure work item if connected
    let azureWorkItemId: number | null = null;
    let azureWorkItemUrl = "";
    let azureState = "";
    if (azureConnected) {
      setCreatingWorkItem(true);
      try {
        const azRes = await fetch("http://localhost:3001/api/azure/create-workitem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[TCMS] ${items.length} failed case${items.length > 1 ? "s" : ""} - ${selectedRun.name}`,
            description: fullDesc,
            severity: escalation.severity,
            assignedTo: escalation.assignedTo.trim(),
            tags: `TCMS;Escalation;${selectedRun.name}`,
          })
        });
        if (azRes.ok) {
          const azData = await azRes.json();
          azureWorkItemId = azData.id;
          azureWorkItemUrl = azData.url;
          azureState = azData.state || "New";
        }
      } catch (error) { console.error("Azure work item creation failed:", error); }
      setCreatingWorkItem(false);
    }

    const payload = {
      runId: selectedRun.id,
      runName: selectedRun.name,
      assignedTo: escalation.assignedTo.trim(),
      severity: escalation.severity,
      description: escalation.description.trim(),
      status: "Open",
      createdAt: new Date().toISOString(),
      items,
      azureWorkItemId,
      azureWorkItemUrl,
      azureState,
    };

    try {
      await fetch("http://localhost:3001/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setIsEscalateOpen(false);
      setSelectedTcIds(new Set());
      setDetailTab("escalated");
      fetchData();
    } catch (error) { console.error("Error creating escalation:", error); }
  };

  const activeRuns = runs.filter(r => r.status !== "Completed");
  const closedRuns = runs.filter(r => r.status === "Completed");

  // ═══════════════════════════════════════════════════════════
  //  DETAIL VIEW — Selected Test Run
  // ═══════════════════════════════════════════════════════════
  if (selectedRun) {
    const stats = getRunStats(selectedRun);
    const moduleTree = getModuleTree(selectedRun);

    // Filter results by selected suite & search
    const filteredResults = selectedRun.results.filter(r => {
      const tc = getTcById(r.testCaseId);
      if (!tc) return false;
      if (selectedSuite && tc.suite !== selectedSuite) return false;
      if (searchQuery && !tc.title.toLowerCase().includes(searchQuery.toLowerCase()) && !tc.id.includes(searchQuery)) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (originalFilter !== "All" && tc.status !== originalFilter) return false;
      return true;
    });

    const statusColors: Record<string, string> = {
      Passed: "text-secondary",
      Failed: "text-error",
      Blocked: "text-tertiary",
      Retest: "text-primary",
      Skipped: "text-slate-400",
      Untested: "text-on-surface-variant",
    };

    const statusDots: Record<string, string> = {
      Passed: "bg-secondary",
      Failed: "bg-error",
      Blocked: "bg-tertiary",
      Retest: "bg-primary",
      Skipped: "bg-slate-400",
      Untested: "bg-on-surface-variant/40",
    };

    const barColors: Record<string, string> = {
      Passed: "bg-secondary",
      Failed: "bg-error",
      Blocked: "bg-tertiary",
      Retest: "bg-primary",
      Skipped: "bg-slate-300",
      Untested: "bg-outline-variant/30",
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden h-full bg-background">
        {/* Header */}
        <div className="px-8 py-5 border-b border-outline-variant/30 bg-surface shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => { setSelectedRun(null); setSelectedSuite(null); setSearchQuery(""); setStatusFilter("All"); setOriginalFilter("All"); setSelectedTcIds(new Set()); }} className="flex items-center gap-2 text-primary text-sm font-bold hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Test Runs
            </button>
            <span className="text-outline-variant">|</span>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{selectedRun.id.toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight">{selectedRun.name}</h2>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-on-surface-variant font-medium">
                <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${selectedRun.status === "Completed" ? "text-secondary" : "text-primary"}`}>
                  <span className={`w-2 h-2 rounded-full ${selectedRun.status === "Completed" ? "bg-secondary" : "bg-primary animate-pulse"}`}></span>
                  {selectedRun.status}
                </span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span>{selectedRun.assignedTo}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span>{selectedRun.createdAt}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={openEscalateModal} className="bg-error/10 border border-error/20 text-error px-5 py-2 rounded-lg font-bold text-sm hover:bg-error/20 active:scale-95 transition flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">flag</span>
                Escalate{selectedTcIds.size > 0 ? ` (${selectedTcIds.size})` : ""}
              </button>
              {selectedRun.status !== "Completed" && (
                <button onClick={() => closeRun(selectedRun)} className="bg-secondary text-white px-5 py-2 rounded-lg font-bold text-sm hover:brightness-110 active:scale-95 transition flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span> Close Run
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-surface-container">
              {["Passed", "Failed", "Blocked", "Retest", "Skipped", "Untested"].map(status => {
                const count = selectedRun.results.filter(r => r.status === status).length;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return pct > 0 ? <div key={status} className={`${barColors[status]} transition-all duration-500`} style={{ width: `${pct}%` }}></div> : null;
              })}
            </div>
            <div className="flex flex-wrap gap-5 text-[11px] font-bold">
              <span className="text-on-surface">{stats.percent}% Completed</span>
              <span className="text-secondary">Passed {stats.passed} ({stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%)</span>
              <span className="text-error">Failed {stats.failed} ({stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%)</span>
              <span className="text-tertiary">Blocked {stats.blocked}</span>
              <span className="text-primary">Retest {stats.retest}</span>
              <span className="text-slate-400">Skipped {stats.skipped}</span>
              <span className="text-on-surface-variant">Untested {stats.untested} ({stats.total > 0 ? Math.round((stats.untested / stats.total) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Body — two panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — Module/Suite tree */}
          <div className="w-64 bg-surface border-r border-outline-variant/30 overflow-y-auto p-4 shrink-0 space-y-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sort by: Module</span>
            </div>

            {/* All button */}
            <div
              onClick={() => setSelectedSuite(null)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${!selectedSuite ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span>All Test Cases</span>
              <span className="text-[10px] font-bold bg-surface-container px-1.5 py-0.5 rounded">{stats.total}</span>
            </div>

            {moduleTree.map(mod => (
              <div key={mod.name} className="mt-2">
                <div className="px-3 py-1.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[16px]">folder_open</span>
                  {mod.name}
                  <span className="ml-auto text-[10px] font-bold bg-surface-container px-1.5 py-0.5 rounded">{mod.total}</span>
                </div>
                {mod.suites.map(suite => (
                  <div
                    key={suite.name}
                    onClick={() => setSelectedSuite(suite.name)}
                    className={`ml-4 flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm ${selectedSuite === suite.name ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">{selectedSuite === suite.name ? 'folder_open' : 'folder'}</span>
                      {suite.name}
                    </div>
                    <span className="text-[10px] font-bold bg-surface-container px-1.5 py-0.5 rounded">{suite.total}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            {(() => {
              const runEscalations = escalations.filter(e => e.runId === selectedRun.id);
              const escalatedCount = runEscalations.reduce((sum: number, e: any) => sum + (e.items?.length || 0), 0);
              return (
                <div className="px-6 pt-3 bg-surface border-b border-outline-variant/30 flex items-center gap-6">
                  <button onClick={() => setDetailTab("cases")} className={`pb-3 text-xs font-bold transition-all ${detailTab === "cases" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                    Test Cases
                  </button>
                  <button onClick={() => setDetailTab("escalated")} className={`pb-3 text-xs font-bold transition-all flex items-center gap-1.5 ${detailTab === "escalated" ? "text-error border-b-2 border-error" : "text-on-surface-variant hover:text-on-surface"}`}>
                    Escalated Cases
                    {escalatedCount > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${detailTab === "escalated" ? "bg-error text-white" : "bg-error/10 text-error"}`}>{escalatedCount}</span>
                    )}
                  </button>
                </div>
              );
            })()}

            {detailTab === "cases" && (
            <>
            {/* Toolbar */}
            <div className="px-6 py-3 bg-surface border-b border-outline-variant/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select
                  value={originalFilter}
                  onChange={e => setOriginalFilter(e.target.value)}
                  className={`bg-surface-container-low border text-[11px] font-bold rounded py-1.5 px-3 cursor-pointer outline-none ${originalFilter !== "All" ? "border-primary text-primary" : "border-outline-variant"}`}
                >
                  <option value="All">Original: All</option>
                  <option value="PASSED">Original: Passed</option>
                  <option value="FAILED">Original: Failed</option>
                  <option value="BLOCKED">Original: Blocked</option>
                  <option value="DRAFT">Original: Draft</option>
                  <option value="Active">Original: Active</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className={`bg-surface-container-low border text-[11px] font-bold rounded py-1.5 px-3 cursor-pointer outline-none ${statusFilter !== "All" ? "border-primary text-primary" : "border-outline-variant"}`}
                >
                  <option value="All">Run Status: All</option>
                  <option value="Passed">Run: Passed</option>
                  <option value="Failed">Run: Failed</option>
                  <option value="Blocked">Run: Blocked</option>
                  <option value="Retest">Run: Retest</option>
                  <option value="Untested">Run: Untested</option>
                </select>
                {(originalFilter !== "All" || statusFilter !== "All") && (
                  <button onClick={() => { setOriginalFilter("All"); setStatusFilter("All"); }} className="text-[10px] text-error font-bold hover:underline">Clear</button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Test Case ID or Title"
                  className="flex-1 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Heading */}
            <div className="px-6 py-3 border-b border-outline-variant/20">
              <h3 className="text-sm font-bold text-on-surface">{selectedSuite || "All Test Cases"}</h3>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant sticky top-0 z-10">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredResults.length > 0 && filteredResults.every(r => selectedTcIds.has(r.testCaseId))}
                        onChange={() => {
                          if (filteredResults.every(r => selectedTcIds.has(r.testCaseId))) {
                            setSelectedTcIds(new Set());
                          } else {
                            setSelectedTcIds(new Set(filteredResults.map(r => r.testCaseId)));
                          }
                        }}
                        className="rounded border border-outline-variant bg-surface text-primary w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Original</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Run Status</th>
                    {selectedRun.status !== "Completed" && (
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredResults.map(result => {
                    const tc = getTcById(result.testCaseId);
                    if (!tc) return null;
                    const hasStepComments = result.stepComments && Object.keys(result.stepComments).length > 0;
                    return (
                      <tr key={result.testCaseId} className={`hover:bg-primary/5 transition-colors group ${selectedTcIds.has(tc.id) ? "bg-primary/5" : ""}`}>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTcIds.has(tc.id)}
                            onChange={() => toggleTcSelection(tc.id)}
                            className="rounded border border-outline-variant bg-surface text-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-primary font-mono">{tc.id.substring(0, 10)}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <button onClick={() => { setViewingTC(tc); setEditingStepIdx(null); setStepCommentDraft(""); }} className="text-sm font-medium text-on-surface hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5">
                            {tc.title}
                            {hasStepComments && <span className="material-symbols-outlined text-tertiary text-[14px]" title="Has step comments">comment</span>}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            tc.status === "PASSED" ? "bg-secondary/10 text-secondary" :
                            tc.status === "FAILED" ? "bg-error/10 text-error" :
                            "bg-surface-container text-on-surface-variant"
                          }`}>{tc.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${statusColors[result.status] || "text-on-surface-variant"}`}>
                            <span className={`w-2 h-2 rounded-full ${statusDots[result.status] || "bg-slate-300"}`}></span>
                            {result.status}
                          </span>
                        </td>
                        {selectedRun.status !== "Completed" && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => updateResultStatus(selectedRun, tc.id, "Passed")} className="p-1.5 rounded bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all" title="Pass">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              </button>
                              <button onClick={() => updateResultStatus(selectedRun, tc.id, "Failed")} className="p-1.5 rounded bg-error/10 text-error hover:bg-error hover:text-white transition-all" title="Fail">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                              <button onClick={() => updateResultStatus(selectedRun, tc.id, "Blocked")} className="p-1.5 rounded bg-tertiary/10 text-tertiary hover:bg-tertiary hover:text-white transition-all" title="Block">
                                <span className="material-symbols-outlined text-[14px]">block</span>
                              </button>
                              <button onClick={() => updateResultStatus(selectedRun, tc.id, "Retest")} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" title="Retest">
                                <span className="material-symbols-outlined text-[14px]">replay</span>
                              </button>
                              <button onClick={() => updateResultStatus(selectedRun, tc.id, "Skipped")} className="p-1.5 rounded bg-slate-100 text-slate-400 hover:bg-slate-300 hover:text-white transition-all" title="Skip">
                                <span className="material-symbols-outlined text-[14px]">skip_next</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">search_off</span>
                        <p className="text-on-surface-variant font-bold">No test cases found</p>
                        <p className="text-xs text-on-surface-variant/60 mt-1">Try changing the status filter or search query.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
            )}

            {/* ═══ Escalated Cases Tab ═══ */}
            {detailTab === "escalated" && (() => {
              const runEscalations = escalations.filter((e: any) => e.runId === selectedRun.id);

              const severityColor: Record<string, string> = {
                Critical: "bg-error text-white",
                High: "bg-error/10 text-error",
                Medium: "bg-tertiary/10 text-tertiary",
                Low: "bg-slate-100 text-slate-500",
              };

              const escStatusColor: Record<string, string> = {
                Open: "bg-error/10 text-error",
                "In Progress": "bg-primary/10 text-primary",
                Resolved: "bg-secondary/10 text-secondary",
                Closed: "bg-surface-container text-on-surface-variant",
              };

              const updateEscStatus = async (escId: string, newStatus: string) => {
                const esc = escalations.find((e: any) => e.id === escId);
                if (!esc) return;
                try {
                  await fetch(`http://localhost:3001/api/escalations/${escId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...esc, status: newStatus })
                  });
                  fetchData();
                } catch (error) { console.error("Error updating escalation:", error); }
              };

              return (
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {runEscalations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">flag</span>
                      <p className="text-on-surface-variant font-bold text-lg">No Escalations Yet</p>
                      <p className="text-sm text-on-surface-variant/60 mt-1">Select failed test cases and click "Escalate" to create tickets.</p>
                    </div>
                  ) : (
                    runEscalations.map((esc: any) => (
                      <div key={esc.id} className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                        {/* Escalation header */}
                        <div className="px-6 py-4 border-b border-outline-variant/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-error text-[18px]">flag</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-on-surface">Escalation</span>
                                  <span className="text-[10px] font-mono text-primary font-bold">{esc.id?.substring(0, 12)}</span>
                                </div>
                                <p className="text-[11px] text-on-surface-variant mt-0.5">
                                  {new Date(esc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${severityColor[esc.severity] || "bg-slate-100 text-slate-500"}`}>{esc.severity}</span>
                              <select
                                value={esc.status}
                                onChange={e => updateEscStatus(esc.id, e.target.value)}
                                className={`text-[10px] font-bold uppercase rounded px-2 py-1 border-none cursor-pointer outline-none ${escStatusColor[esc.status] || "bg-surface-container text-on-surface-variant"}`}
                              >
                                <option>Open</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                                <option>Closed</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-on-surface-variant flex-wrap">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> Assigned to <span className="font-bold text-on-surface">{esc.assignedTo}</span></span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">bug_report</span> <span className="font-bold text-on-surface">{esc.items?.length || 0}</span> test case(s)</span>
                            {esc.azureWorkItemId && (
                              <a href={esc.azureWorkItemUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary font-bold hover:underline">
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                Azure #{esc.azureWorkItemId}
                              </a>
                            )}
                            {esc.azureState && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                esc.azureState === "New" ? "bg-primary/10 text-primary" :
                                esc.azureState === "Active" ? "bg-tertiary/10 text-tertiary" :
                                esc.azureState === "Resolved" ? "bg-secondary/10 text-secondary" :
                                esc.azureState === "Closed" ? "bg-surface-container text-on-surface-variant" :
                                "bg-surface-container text-on-surface-variant"
                              }`}>Azure: {esc.azureState}</span>
                            )}
                          </div>
                          {esc.description && (
                            <p className="mt-2 text-xs text-on-surface-variant bg-surface-container-low rounded-lg px-3 py-2 border border-outline-variant/20">{esc.description}</p>
                          )}
                        </div>

                        {/* Escalated test cases */}
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                              <th className="px-6 py-2.5">Test Case</th>
                              <th className="px-4 py-2.5">Original</th>
                              <th className="px-4 py-2.5">Run Status</th>
                              <th className="px-4 py-2.5">Tester Comment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {(esc.items || []).map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                <td className="px-6 py-2.5">
                                  <p className="text-xs font-bold text-on-surface">{item.title}</p>
                                  <p className="text-[10px] text-primary font-mono">{item.testCaseId?.substring(0, 12)}</p>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    item.originalStatus === "FAILED" ? "bg-error/10 text-error" :
                                    item.originalStatus === "PASSED" ? "bg-secondary/10 text-secondary" :
                                    "bg-surface-container text-on-surface-variant"
                                  }`}>{item.originalStatus}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs font-bold ${
                                    item.runStatus === "Failed" ? "text-error" :
                                    item.runStatus === "Passed" ? "text-secondary" :
                                    "text-on-surface-variant"
                                  }`}>{item.runStatus}</span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-on-surface-variant max-w-[200px]">{item.comment || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Discussion Section */}
                        {esc.azureWorkItemId && (
                          <div className="border-t border-outline-variant/20">
                            <button
                              onClick={() => {
                                if (activeDiscussionEscId === esc.id) { setActiveDiscussionEscId(null); }
                                else { fetchDiscussion(esc.id, esc.azureWorkItemId); }
                              }}
                              className="w-full px-6 py-3 flex items-center justify-between text-xs font-bold text-on-surface-variant hover:bg-primary/5 transition-colors"
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">forum</span>
                                Discussion
                              </span>
                              <span className="material-symbols-outlined text-[16px]">{activeDiscussionEscId === esc.id ? "expand_less" : "expand_more"}</span>
                            </button>
                            {activeDiscussionEscId === esc.id && (
                              <div className="px-6 pb-4 space-y-3">
                                {loadingComments ? (
                                  <p className="text-xs text-on-surface-variant text-center py-4">Loading comments...</p>
                                ) : discussionComments.length === 0 ? (
                                  <p className="text-xs text-on-surface-variant text-center py-4">No comments yet. Start the discussion below.</p>
                                ) : (
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {discussionComments.map((c: any, ci: number) => (
                                      <div key={ci} className={`rounded-lg p-3 ${c.source === "tcms" ? "bg-primary/5 border border-primary/20" : "bg-surface-container-low border border-outline-variant/30"}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] font-bold text-on-surface">{c.createdBy}</span>
                                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${c.source === "tcms" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"}`}>{c.source === "tcms" ? "TCMS" : "Azure"}</span>
                                          <span className="text-[10px] text-on-surface-variant">{new Date(c.createdDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                        <div className="text-xs text-on-surface" dangerouslySetInnerHTML={{ __html: c.text }}></div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Add comment */}
                                <div className="flex items-start gap-2">
                                  <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(esc.azureWorkItemId); } }}
                                    rows={2}
                                    className="flex-1 bg-surface border border-outline-variant px-3 py-2 rounded-lg text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                                    placeholder="Add a comment (syncs to Azure Board)..."
                                  />
                                  <button
                                    onClick={() => postComment(esc.azureWorkItemId)}
                                    disabled={!newComment.trim()}
                                    className="bg-primary text-white px-3 py-2 rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >Send</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ═══ Escalation Modal ═══ */}
        {isEscalateOpen && selectedRun && (() => {
          const escalateItems = Array.from(selectedTcIds).map(tcId => {
            const tc = getTcById(tcId);
            const result = selectedRun.results.find(r => r.testCaseId === tcId);
            return { tc, result };
          }).filter(item => item.tc);

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4 py-6">
              <div className="bg-surface w-full max-w-[700px] max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-outline-variant flex flex-col">
                {/* Header */}
                <div className="px-8 py-5 border-b border-outline-variant/50 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-error text-xl">flag</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold font-headline text-on-surface">Escalate Issues</h3>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">{escalateItems.length} test case(s) from {selectedRun.name}</p>
                      </div>
                    </div>
                    <span onClick={() => setIsEscalateOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1.5 transition-colors text-xl">close</span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                  {/* Ticket fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Assign To <span className="text-error">*</span>
                        {azureConnected && <span className="text-primary ml-1 normal-case font-medium">(Azure Board)</span>}
                      </label>
                      {azureConnected && azureUsers.length > 0 ? (
                        <div className="relative">
                          {/* Selected user display OR search input */}
                          {escalation.assignedTo && !assigneeDropdownOpen ? (
                            <div
                              onClick={() => { setAssigneeDropdownOpen(true); setAssigneeSearch(""); }}
                              className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm cursor-pointer shadow-sm flex items-center justify-between hover:border-primary/40 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                  {(azureUsers.find(u => u.uniqueName === escalation.assignedTo)?.displayName || "?")[0]}
                                </div>
                                <span className="font-medium">{azureUsers.find(u => u.uniqueName === escalation.assignedTo)?.displayName || escalation.assignedTo}</span>
                              </div>
                              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">close</span>
                            </div>
                          ) : (
                            <div className="relative">
                              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">search</span>
                              <input
                                autoFocus
                                value={assigneeSearch}
                                onChange={e => { setAssigneeSearch(e.target.value); setAssigneeDropdownOpen(true); }}
                                onFocus={() => setAssigneeDropdownOpen(true)}
                                className="w-full bg-surface-container-low border border-outline-variant pl-9 pr-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none shadow-sm"
                                placeholder="Search people..."
                              />
                            </div>
                          )}
                          {/* Dropdown */}
                          {assigneeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-2xl z-50 max-h-[220px] overflow-y-auto">
                              {azureUsers
                                .filter(u => {
                                  if (!assigneeSearch.trim()) return true;
                                  const q = assigneeSearch.toLowerCase();
                                  return u.displayName.toLowerCase().includes(q) || u.uniqueName.toLowerCase().includes(q);
                                })
                                .map(u => (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      setEscalation({ ...escalation, assignedTo: u.uniqueName });
                                      setAssigneeDropdownOpen(false);
                                      setAssigneeSearch("");
                                    }}
                                    className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-primary/5 transition-colors ${escalation.assignedTo === u.uniqueName ? "bg-primary/10" : ""}`}
                                  >
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                                      {u.displayName[0]}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-on-surface truncate">{u.displayName}</p>
                                      <p className="text-[10px] text-on-surface-variant truncate">{u.uniqueName}</p>
                                    </div>
                                    {escalation.assignedTo === u.uniqueName && (
                                      <span className="material-symbols-outlined text-primary text-[16px] ml-auto shrink-0">check</span>
                                    )}
                                  </div>
                                ))
                              }
                              {azureUsers.filter(u => {
                                if (!assigneeSearch.trim()) return true;
                                const q = assigneeSearch.toLowerCase();
                                return u.displayName.toLowerCase().includes(q) || u.uniqueName.toLowerCase().includes(q);
                              }).length === 0 && (
                                <div className="px-4 py-6 text-center text-xs text-on-surface-variant">No users match "{assigneeSearch}"</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          autoFocus
                          value={escalation.assignedTo}
                          onChange={e => setEscalation({ ...escalation, assignedTo: e.target.value })}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none shadow-sm"
                          placeholder="e.g. Developer Name"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Severity</label>
                      <select
                        value={escalation.severity}
                        onChange={e => setEscalation({ ...escalation, severity: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm"
                      >
                        <option>Critical</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Description / Notes</label>
                    <textarea
                      value={escalation.description}
                      onChange={e => setEscalation({ ...escalation, description: e.target.value })}
                      rows={3}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none shadow-sm resize-none"
                      placeholder="Describe the issue, steps to reproduce, or any additional context..."
                    />
                  </div>

                  {/* Test cases being escalated */}
                  <div>
                    <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-3">Test Cases Included</p>
                    <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
                      <div className="max-h-[250px] overflow-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container border-b border-outline-variant text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                              <th className="px-4 py-2.5">Test Case</th>
                              <th className="px-4 py-2.5">Original</th>
                              <th className="px-4 py-2.5">Run Status</th>
                              <th className="px-4 py-2.5">Tester Comment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20">
                            {escalateItems.map(({ tc, result }) => (
                              <tr key={tc!.id} className="text-xs">
                                <td className="px-4 py-2.5">
                                  <p className="font-bold text-on-surface">{tc!.title}</p>
                                  <p className="text-[10px] text-primary font-mono">{tc!.id.substring(0, 12)}</p>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    tc!.status === "PASSED" ? "bg-secondary/10 text-secondary" :
                                    tc!.status === "FAILED" ? "bg-error/10 text-error" :
                                    "bg-surface-container text-on-surface-variant"
                                  }`}>{tc!.status}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`font-bold ${
                                    result?.status === "Passed" ? "text-secondary" :
                                    result?.status === "Failed" ? "text-error" :
                                    "text-on-surface-variant"
                                  }`}>{result?.status || "—"}</span>
                                </td>
                                <td className="px-4 py-2.5 text-on-surface-variant max-w-[150px] truncate">{result?.comment || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Azure integration status */}
                  <div className={`rounded-lg p-4 flex items-start gap-3 ${azureConnected ? "bg-secondary/5 border border-secondary/20" : "bg-surface-container-low border border-outline-variant/30"}`}>
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${azureConnected ? "text-secondary" : "text-on-surface-variant"}`}>{azureConnected ? "check_circle" : "info"}</span>
                    <div>
                      <p className="text-xs font-bold text-on-surface">{azureConnected ? "Azure Boards Connected" : "Azure Boards Not Connected"}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        {azureConnected
                          ? "A Bug work item will be created automatically on Azure Boards with all test case details, steps, and tester comments."
                          : "Configure AZURE_ORG_URL, AZURE_PROJECT, and AZURE_PAT in backend .env to enable automatic work item creation."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-8 py-4 border-t border-outline-variant/50 shrink-0 bg-surface">
                  <button onClick={() => setIsEscalateOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                  <button
                    onClick={submitEscalation}
                    disabled={!escalation.assignedTo.trim() || escalateItems.length === 0 || creatingWorkItem}
                    className="bg-error text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingWorkItem ? (
                      <><span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span> Creating on Azure...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[16px]">flag</span> Escalate {escalateItems.length} Issue{escalateItems.length !== 1 ? "s" : ""}{azureConnected ? " → Azure" : ""}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Test Case Detail Slideout */}
        {viewingTC && (() => {
          const slideoutResult = selectedRun.results.find(r => r.testCaseId === viewingTC.id);
          const slideoutStepComments = slideoutResult?.stepComments || {};
          const canAct = selectedRun.status !== "Completed";


          return (
          <div className="fixed inset-0 z-[100] flex justify-end" onClick={() => setViewingTC(null)}>
            <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-[2px]"></div>
            <div className="relative w-full max-w-[560px] bg-surface h-full shadow-2xl border-l border-outline-variant/50 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    viewingTC.status === "PASSED" ? "bg-secondary/10 text-secondary" :
                    viewingTC.status === "FAILED" ? "bg-error/10 text-error" :
                    "bg-secondary/10 text-secondary"
                  }`}>{viewingTC.status}</span>
                </div>

                {/* Run Status & Action Buttons */}
                {slideoutResult && (
                  <div className="mt-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Run Status:</span>
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${
                          slideoutResult.status === "Passed" ? "text-secondary" :
                          slideoutResult.status === "Failed" ? "text-error" :
                          slideoutResult.status === "Blocked" ? "text-tertiary" :
                          slideoutResult.status === "Retest" ? "text-primary" :
                          "text-on-surface-variant"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            slideoutResult.status === "Passed" ? "bg-secondary" :
                            slideoutResult.status === "Failed" ? "bg-error" :
                            slideoutResult.status === "Blocked" ? "bg-tertiary" :
                            slideoutResult.status === "Retest" ? "bg-primary" :
                            "bg-on-surface-variant/40"
                          }`}></span>
                          {slideoutResult.status}
                        </span>
                      </div>
                      {canAct && (
                        <div className="flex gap-1.5">
                          <button onClick={() => updateResultStatus(selectedRun, viewingTC.id, "Passed")} className={`p-1.5 rounded transition-all ${slideoutResult.status === "Passed" ? "bg-secondary text-white" : "bg-secondary/10 text-secondary hover:bg-secondary hover:text-white"}`} title="Pass">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </button>
                          <button onClick={() => updateResultStatus(selectedRun, viewingTC.id, "Failed")} className={`p-1.5 rounded transition-all ${slideoutResult.status === "Failed" ? "bg-error text-white" : "bg-error/10 text-error hover:bg-error hover:text-white"}`} title="Fail">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                          <button onClick={() => updateResultStatus(selectedRun, viewingTC.id, "Blocked")} className={`p-1.5 rounded transition-all ${slideoutResult.status === "Blocked" ? "bg-tertiary text-white" : "bg-tertiary/10 text-tertiary hover:bg-tertiary hover:text-white"}`} title="Block">
                            <span className="material-symbols-outlined text-[14px]">block</span>
                          </button>
                          <button onClick={() => updateResultStatus(selectedRun, viewingTC.id, "Retest")} className={`p-1.5 rounded transition-all ${slideoutResult.status === "Retest" ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary hover:text-white"}`} title="Retest">
                            <span className="material-symbols-outlined text-[14px]">replay</span>
                          </button>
                          <button onClick={() => updateResultStatus(selectedRun, viewingTC.id, "Skipped")} className={`p-1.5 rounded transition-all ${slideoutResult.status === "Skipped" ? "bg-slate-400 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-300 hover:text-white"}`} title="Skip">
                            <span className="material-symbols-outlined text-[14px]">skip_next</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
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

                {/* Steps with per-step comments */}
                {viewingTC.steps && viewingTC.steps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Steps & Expected Results</p>
                    <div className="space-y-4">
                      {viewingTC.steps.map((step, idx) => {
                        const existingComment = slideoutStepComments[String(idx)] || "";
                        const isEditing = editingStepIdx === idx;
                        return (
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
                            {/* Step-level comment */}
                            {isEditing ? (
                              <div className="flex items-start gap-1.5 mt-1">
                                <textarea
                                  autoFocus
                                  value={stepCommentDraft}
                                  onChange={e => setStepCommentDraft(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      saveStepComment(selectedRun, viewingTC.id, idx, stepCommentDraft);
                                      setEditingStepIdx(null);
                                      setStepCommentDraft("");
                                    }
                                    if (e.key === "Escape") { setEditingStepIdx(null); setStepCommentDraft(""); }
                                  }}
                                  rows={2}
                                  className="flex-1 bg-surface border border-error/30 px-3 py-2 rounded-lg text-xs focus:ring-2 focus:ring-error/30 focus:outline-none resize-none"
                                  placeholder="Add a comment for this step (e.g. what went wrong)..."
                                />
                                <div className="flex flex-col gap-1 mt-0.5">
                                  <span onClick={() => { saveStepComment(selectedRun, viewingTC.id, idx, stepCommentDraft); setEditingStepIdx(null); setStepCommentDraft(""); }} className="material-symbols-outlined text-[16px] text-secondary cursor-pointer hover:scale-110 transition-transform p-1 bg-secondary/10 rounded">check</span>
                                  <span onClick={() => { setEditingStepIdx(null); setStepCommentDraft(""); }} className="material-symbols-outlined text-[16px] text-on-surface-variant cursor-pointer hover:scale-110 transition-transform p-1 bg-surface-container rounded">close</span>
                                </div>
                              </div>
                            ) : existingComment ? (
                              <div
                                onClick={() => { if (canAct) { setEditingStepIdx(idx); setStepCommentDraft(existingComment); } }}
                                className="bg-error/5 border border-error/20 rounded-lg p-3 cursor-pointer hover:bg-error/10 transition-colors mt-1"
                              >
                                <p className="text-[10px] font-bold text-error uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">comment</span> Tester Comment
                                </p>
                                <p className="text-sm text-on-surface leading-relaxed">{existingComment}</p>
                              </div>
                            ) : canAct ? (
                              <button
                                onClick={() => { setEditingStepIdx(idx); setStepCommentDraft(""); }}
                                className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/50 hover:text-error font-medium mt-1 px-2 py-1 rounded hover:bg-error/5 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[14px]">add_comment</span>
                                Add comment
                              </button>
                            ) : null}
                          </div>
                        </div>
                        );
                      })}
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

              {/* Footer — Escalate from slideout */}
              {canAct && (
                <div className="px-8 py-4 border-t border-outline-variant/30 shrink-0 bg-surface">
                  <button
                    onClick={() => escalateSingleFromSlideout(selectedRun, viewingTC)}
                    className="w-full bg-error text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">flag</span>
                    Escalate This Test Case
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  LIST VIEW — All Test Runs
  // ═══════════════════════════════════════════════════════════
  const displayedRuns = listTab === "active" ? activeRuns : closedRuns;

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background">
      <div className="p-8 space-y-6 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Test Runs</h2>
          <button onClick={() => setIsCreateOpen(true)} className="gradient-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Manual Run
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-outline-variant/20">
          <button onClick={() => setListTab("active")} className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${listTab === "active" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
            Active Runs
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${listTab === "active" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>{activeRuns.length}</span>
          </button>
          <button onClick={() => setListTab("closed")} className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${listTab === "closed" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
            Closed Runs
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${listTab === "closed" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>{closedRuns.length}</span>
          </button>
        </div>

        {/* Runs list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 opacity-50"><p>Loading runs...</p></div>
        ) : (
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-surface-container border-b border-outline-variant text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <div className="col-span-5">Runs</div>
              <div className="col-span-1 text-center">Tests</div>
              <div className="col-span-3 text-center">Test Status</div>
              <div className="col-span-3 text-center">Failure Analysis</div>
            </div>

            {/* Rows */}
            {displayedRuns.map(run => {
              const stats = getRunStats(run);
              return (
                <div
                  key={run.id}
                  onClick={() => { setSelectedRun(run); setSelectedSuite(null); setSearchQuery(""); setStatusFilter("All"); }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-outline-variant/20 hover:bg-primary/5 transition-colors cursor-pointer group items-center"
                >
                  <div className="col-span-5 flex items-center gap-4">
                    {/* Progress circle */}
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={stats.percent === 100 ? "#00B7C3" : "#005FB8"} strokeWidth="3" strokeDasharray={`${stats.percent}, 100`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-on-surface">{stats.percent}%</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                        {run.name} <span className="text-primary font-mono text-xs">{run.id.toUpperCase()}</span>
                      </p>
                      <p className="text-[11px] text-on-surface-variant font-medium">Assigned to {run.assignedTo}</p>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-bold text-on-surface">{stats.total} Tests</span>
                  </div>
                  <div className="col-span-3 flex items-center justify-center gap-1.5">
                    {stats.passed > 0 && <span className="bg-secondary text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md min-w-[28px] text-center">{stats.passed}</span>}
                    {stats.failed > 0 && <span className="bg-error text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md min-w-[28px] text-center">{stats.failed}</span>}
                    {stats.blocked > 0 && <span className="bg-tertiary text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md min-w-[28px] text-center">{stats.blocked}</span>}
                    {stats.untested > 0 && <span className="bg-slate-300 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md min-w-[28px] text-center">{stats.untested}</span>}
                  </div>
                  <div className="col-span-3 flex items-center justify-center gap-2">
                    <span className="text-sm font-medium text-on-surface-variant group-hover:hidden">
                      {stats.failed > 0 ? `${stats.failed} failure${stats.failed > 1 ? "s" : ""}` : "—"}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteRunId(run.id); }}
                      className="hidden group-hover:flex items-center gap-1 text-error text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-error/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {displayedRuns.length === 0 && (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">playlist_play</span>
                <p className="text-on-surface-variant font-bold text-lg mb-1">No {listTab === "active" ? "Active" : "Closed"} Runs</p>
                <p className="text-sm text-on-surface-variant/70">
                  {listTab === "active" ? "Create a new test run to get started." : "No runs have been closed yet."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Delete Run Confirmation ═══ */}
      {confirmDeleteRunId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-8 border border-outline-variant">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-1">Delete Test Run</h3>
                <p className="text-sm text-on-surface-variant">
                  Are you sure you want to delete <span className="font-bold text-on-surface">{runs.find(r => r.id === confirmDeleteRunId)?.name}</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmDeleteRunId(null)} className="flex-1 font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2.5 hover:bg-surface-container rounded-lg transition-colors border border-outline-variant">Cancel</button>
                <button onClick={() => deleteRun(confirmDeleteRunId)} className="flex-1 bg-error text-white font-bold text-sm px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Create Run Modal ═══ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <form onSubmit={submitCreateRun} className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-8 border border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-headline text-on-surface">Create Test Run</h3>
              <span onClick={() => setIsCreateOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1 transition-colors">close</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Run Name <span className="text-error">*</span></label>
                <input autoFocus required value={newRun.name} onChange={e => setNewRun({ ...newRun, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" placeholder="e.g. Test Run - 2026-04-14" />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Assigned To</label>
                <input value={newRun.assignedTo} onChange={e => setNewRun({ ...newRun, assignedTo: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" placeholder="e.g. Sambhav Suri" />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Project <span className="text-error">*</span></label>
                <select required value={newRun.projectId} onChange={e => setNewRun({ ...newRun, projectId: e.target.value, moduleName: "", suiteName: "", scope: "project" })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                  <option value="">— Select Project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({testCases.filter(tc => tc.projectId === p.id).length} cases)</option>
                  ))}
                </select>
              </div>

              {/* Scope selection */}
              {newRun.projectId && (() => {
                const proj = projects.find(p => p.id === newRun.projectId);
                const modules = proj?.modules || [];
                const selectedModule = modules.find(m => m.name === newRun.moduleName);
                const suites = selectedModule?.suites || [];

                // Count test cases based on current scope
                let scopedCases = testCases.filter(tc => tc.projectId === newRun.projectId);
                if (newRun.scope === "module" && newRun.moduleName) {
                  const modSuites = selectedModule?.suites || [];
                  scopedCases = scopedCases.filter(tc => tc.suite && modSuites.includes(tc.suite));
                } else if (newRun.scope === "suite" && newRun.suiteName) {
                  scopedCases = scopedCases.filter(tc => tc.suite === newRun.suiteName);
                }

                return (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Run Scope</label>
                      <div className="flex gap-2">
                        {(["project", "module", "suite"] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setNewRun({ ...newRun, scope: s, moduleName: s === "project" ? "" : newRun.moduleName, suiteName: s !== "suite" ? "" : newRun.suiteName })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newRun.scope === s ? "bg-primary text-white shadow-md" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                          >
                            {s === "project" ? "Entire Project" : s === "module" ? "Module" : "Suite"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Module dropdown */}
                    {(newRun.scope === "module" || newRun.scope === "suite") && (
                      <div>
                        <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Module <span className="text-error">*</span></label>
                        <select
                          required
                          value={newRun.moduleName}
                          onChange={e => setNewRun({ ...newRun, moduleName: e.target.value, suiteName: "" })}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm"
                        >
                          <option value="">— Select Module —</option>
                          {modules.map(m => {
                            const modSuites = m.suites;
                            const count = testCases.filter(tc => tc.projectId === newRun.projectId && tc.suite && modSuites.includes(tc.suite)).length;
                            return <option key={m.name} value={m.name}>{m.name} ({count} cases)</option>;
                          })}
                        </select>
                      </div>
                    )}

                    {/* Suite dropdown */}
                    {newRun.scope === "suite" && newRun.moduleName && (
                      <div>
                        <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Suite <span className="text-error">*</span></label>
                        <select
                          required
                          value={newRun.suiteName}
                          onChange={e => setNewRun({ ...newRun, suiteName: e.target.value })}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm"
                        >
                          <option value="">— Select Suite —</option>
                          {suites.map(s => {
                            const count = testCases.filter(tc => tc.projectId === newRun.projectId && tc.suite === s).length;
                            return <option key={s} value={s}>{s} ({count} cases)</option>;
                          })}
                        </select>
                      </div>
                    )}

                    {/* Scope summary */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">info</span>
                      <p className="text-[11px] font-medium text-on-surface">
                        <span className="font-bold">{scopedCases.length}</span> test case{scopedCases.length !== 1 ? "s" : ""} will be included in this run
                        {newRun.scope === "module" && newRun.moduleName && <> from module <span className="font-bold">{newRun.moduleName}</span></>}
                        {newRun.scope === "suite" && newRun.suiteName && <> from suite <span className="font-bold">{newRun.suiteName}</span></>}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Include existing results toggle */}
              {newRun.projectId && (
                <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeExistingResults}
                      onChange={e => setIncludeExistingResults(e.target.checked)}
                      className="rounded border border-outline-variant bg-surface text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Include existing test case results</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        Carry over Passed/Failed/Blocked statuses from test cases. Useful for re-verification runs — filter by Failed to retest only the failures.
                      </p>
                    </div>
                  </label>
                  {includeExistingResults && (() => {
                    const cases = testCases.filter(tc => tc.projectId === newRun.projectId);
                    const passed = cases.filter(tc => tc.status.toUpperCase() === "PASSED").length;
                    const failed = cases.filter(tc => tc.status.toUpperCase() === "FAILED").length;
                    const other = cases.length - passed - failed;
                    return (
                      <div className="flex gap-3 text-[10px] font-bold pl-7">
                        <span className="text-secondary">{passed} Passed</span>
                        <span className="text-error">{failed} Failed</span>
                        <span className="text-on-surface-variant">{other} Untested</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Test Plan (optional)</label>
                <select value={newRun.planId} onChange={e => setNewRun({ ...newRun, planId: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                  <option value="">No Plan</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Create Run</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
