import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface PlanAssignment {
  type: "project" | "module" | "suite";
  projectId: string;
  moduleName?: string;
  suiteName?: string;
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
  assignments?: PlanAssignment[];
}

interface TestCase {
  id: string;
  title: string;
  priority: string;
  type: string;
  status: string;
  lastRun: string;
  suite?: string;
  projectId?: string;
  planId?: string;
}

interface RunResult {
  testCaseId: string;
  status: string;
}

interface ProjectData {
  id: string;
  name: string;
  modules: { name: string; suites: string[] }[];
}

interface TestRun {
  id: string;
  name: string;
  status: string;
  assignedTo: string;
  projectId: string;
  planId?: string;
  createdAt: string;
  results: RunResult[];
}

export default function TestPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", description: "", owner: "", startDate: "", endDate: "", assignments: [] as PlanAssignment[] });
  const [newAssignScope, setNewAssignScope] = useState<"project" | "module" | "suite">("project");
  const [newAssignProjectId, setNewAssignProjectId] = useState("");
  const [newAssignModule, setNewAssignModule] = useState("");
  const [newAssignSuite, setNewAssignSuite] = useState("");

  // Detail view state
  const [selectedPlan, setSelectedPlan] = useState<TestPlan | null>(null);
  const [planDetailTab, setPlanDetailTab] = useState<"cases" | "runs" | "escalations">("cases");

  // Edit plan modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<TestPlan | null>(null);

  // Azure sprint sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; created: number; updated: number } | null>(null);

  const syncSprints = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch("http://localhost:3001/api/azure/sync-sprints", { method: "POST" });
      if (r.ok) {
        const data = await r.json();
        setSyncResult(data);
        fetchData();
      }
    } catch (error) {
      console.error("Error syncing sprints:", error);
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 5000);
  };

  // Styled confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Edit assignment picker
  const [editAssignScope, setEditAssignScope] = useState<"project" | "module" | "suite">("project");
  const [editAssignProjectId, setEditAssignProjectId] = useState("");
  const [editAssignModule, setEditAssignModule] = useState("");
  const [editAssignSuite, setEditAssignSuite] = useState("");

  // Run drill-down inside plan detail
  const [selectedRunInPlan, setSelectedRunInPlan] = useState<TestRun | null>(null);
  const [runStatusFilter, setRunStatusFilter] = useState<string>("All");

  const fetchData = async () => {
    try {
      const [plansRes, tcRes, runsRes, escRes, projRes] = await Promise.all([
        fetch("http://localhost:3001/api/testplans"),
        fetch("http://localhost:3001/api/testcases"),
        fetch("http://localhost:3001/api/testruns"),
        fetch("http://localhost:3001/api/escalations"),
        fetch("http://localhost:3001/api/projects")
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (tcRes.ok) setTestCases(await tcRes.json());
      if (runsRes.ok) setRuns(await runsRes.json());
      if (escRes.ok) setEscalations(await escRes.json());
      if (projRes.ok) setProjects(await projRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getTestCasesForPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan?.assignments || plan.assignments.length === 0) {
      // Fallback to old planId-based lookup
      return testCases.filter(tc => tc.planId === planId);
    }
    const seen = new Set<string>();
    const result: TestCase[] = [];
    for (const a of plan.assignments) {
      const proj = projects.find(p => p.id === a.projectId);
      if (!proj) continue;
      let matchingCases: TestCase[] = [];
      if (a.type === "project") {
        matchingCases = testCases.filter(tc => tc.projectId === a.projectId);
      } else if (a.type === "module" && a.moduleName) {
        const mod = proj.modules.find(m => m.name === a.moduleName);
        const suiteNames = mod?.suites || [];
        matchingCases = testCases.filter(tc => tc.projectId === a.projectId && tc.suite && suiteNames.includes(tc.suite));
      } else if (a.type === "suite" && a.suiteName) {
        matchingCases = testCases.filter(tc => tc.projectId === a.projectId && tc.suite === a.suiteName);
      }
      for (const tc of matchingCases) {
        if (!seen.has(tc.id)) { seen.add(tc.id); result.push(tc); }
      }
    }
    return result;
  };

  const getPlanProgress = (planId: string) => {
    const planCases = getTestCasesForPlan(planId);
    if (planCases.length === 0) return { total: 0, passed: 0, failed: 0, blocked: 0, pending: 0, percent: 0 };

    // Build latest result per test case from all runs linked to this plan
    const planRuns = runs.filter(r => r.planId === planId);
    const latestResult = new Map<string, string>();
    const sortedRuns = [...planRuns].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const run of sortedRuns) {
      for (const result of run.results) {
        if (result.status !== "Untested") {
          latestResult.set(result.testCaseId, result.status);
        }
      }
    }

    const planCaseIds = new Set(planCases.map(tc => tc.id));
    let passed = 0, failed = 0, blocked = 0;
    for (const [tcId, status] of latestResult) {
      if (!planCaseIds.has(tcId)) continue;
      if (status === "Passed") passed++;
      else if (status === "Failed") failed++;
      else if (status === "Blocked") blocked++;
    }

    const pending = planCases.length - passed - failed - blocked;
    const percent = planCases.length > 0 ? Math.round(((passed + failed + blocked) / planCases.length) * 100) : 0;
    return { total: planCases.length, passed, failed, blocked, pending, percent };
  };

  // Get latest run result for a specific test case within a plan
  const getLatestResultForTc = (planId: string, tcId: string): string => {
    const planRuns = runs.filter(r => r.planId === planId);
    let latest = "Not Run";
    for (const run of planRuns) {
      const result = run.results.find(r => r.testCaseId === tcId);
      if (result && result.status !== "Untested") latest = result.status;
    }
    return latest;
  };

  const submitNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name.trim()) return;
    try {
      await fetch("http://localhost:3001/api/testplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPlan, status: "In Progress", createdAt: new Date().toISOString().split("T")[0] })
      });
      setIsCreateModalOpen(false);
      setNewPlan({ name: "", description: "", owner: "", startDate: "", endDate: "", assignments: [] });
      setNewAssignScope("project"); setNewAssignProjectId(""); setNewAssignModule(""); setNewAssignSuite("");
      fetchData();
    } catch (error) {
      console.error("Error creating plan:", error);
    }
  };

  const submitEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlan) return;
    try {
      await fetch(`http://localhost:3001/api/testplans/${editPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPlan)
      });
      setIsEditModalOpen(false);
      setEditPlan(null);
      if (selectedPlan && selectedPlan.id === editPlan.id) setSelectedPlan(editPlan);
      fetchData();
    } catch (error) {
      console.error("Error updating plan:", error);
    }
  };

  const deletePlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    const planName = plan?.name || "this plan";
    setConfirmDialog({
      title: "Delete Test Plan",
      message: `Are you sure you want to delete "${planName}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await fetch(`http://localhost:3001/api/testplans/${planId}`, { method: "DELETE" });
          if (selectedPlan?.id === planId) setSelectedPlan(null);
          fetchData();
        } catch (error) {
          console.error("Error deleting plan:", error);
        }
        setConfirmDialog(null);
      }
    });
  };

  const activePlans = plans.filter(p => p.status !== "Completed");
  const completedPlans = plans.filter(p => p.status === "Completed");
  const displayedPlans = activeTab === "active" ? activePlans : completedPlans;

  // KPI totals
  const totalCasesInPlans = plans.reduce((acc, p) => acc + getTestCasesForPlan(p.id).length, 0);
  const totalPassedInPlans = plans.reduce((acc, p) => acc + getPlanProgress(p.id).passed, 0);
  const totalFailedInPlans = plans.reduce((acc, p) => acc + getPlanProgress(p.id).failed, 0);
  const overallProgress = totalCasesInPlans > 0 ? Math.round(((totalPassedInPlans + totalFailedInPlans) / totalCasesInPlans) * 100) : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASSED": return "text-secondary";
      case "FAILED": return "text-error";
      case "BLOCKED": return "text-slate-500";
      case "READY": return "text-primary";
      default: return "text-on-surface-variant";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "PASSED": return "bg-secondary/10 border-secondary/20 text-secondary";
      case "FAILED": return "bg-error-container text-on-error-container";
      case "BLOCKED": return "bg-slate-100 text-slate-500";
      case "READY": return "bg-primary/10 border-primary/20 text-primary";
      default: return "bg-surface-container text-on-surface-variant";
    }
  };

  // ─── Detail View for a Selected Plan ─────────────────────────
  if (selectedPlan) {
    const planCases = getTestCasesForPlan(selectedPlan.id);
    const progress = getPlanProgress(selectedPlan.id);

    return (
      <div className="flex-1 overflow-y-auto w-full">
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
          {/* Back button + header */}
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <button onClick={() => { setSelectedPlan(null); setSelectedRunInPlan(null); setRunStatusFilter("All"); }} className="flex items-center gap-2 text-primary text-sm font-bold hover:underline transition-all">
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to All Plans
              </button>
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-extrabold font-headline text-on-background tracking-tight">{selectedPlan.name}</h2>
                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${selectedPlan.status === "Completed" ? "text-secondary" : selectedPlan.status === "In Progress" ? "text-primary" : "text-on-surface-variant"}`}>
                  <span className={`w-2 h-2 rounded-full ${selectedPlan.status === "Completed" ? "bg-secondary" : selectedPlan.status === "In Progress" ? "bg-primary animate-pulse" : "bg-on-surface-variant"}`}></span>
                  {selectedPlan.status}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant font-medium">{selectedPlan.description || "No description provided."}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditPlan({...selectedPlan, assignments: selectedPlan.assignments || []}); setEditAssignScope("project"); setEditAssignProjectId(""); setEditAssignModule(""); setEditAssignSuite(""); setIsEditModalOpen(true); }} className="bg-surface border border-outline-variant text-on-surface px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-surface-container-high transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Plan
              </button>
              <button onClick={() => deletePlan(selectedPlan.id)} className="bg-error/10 border border-error/20 text-error px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-error/20 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
            </div>
          </div>

          {/* Dynamic KPI cards — switch based on tab */}
          {(() => {
            const planRuns = runs.filter(r => r.planId === selectedPlan.id);

            if (planDetailTab === "runs" && selectedRunInPlan) {
              // Show selected run's KPI
              const run = selectedRunInPlan;
              const total = run.results.length;
              const passed = run.results.filter(r => r.status === "Passed").length;
              const failed = run.results.filter(r => r.status === "Failed").length;
              const blocked = run.results.filter(r => r.status === "Blocked").length;
              const retest = run.results.filter(r => r.status === "Retest").length;
              const skipped = run.results.filter(r => r.status === "Skipped").length;
              const untested = run.results.filter(r => r.status === "Untested").length;
              const completed = total - untested;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
              const runEscalations = escalations.filter((e: any) => e.runId === run.id);
              const runEscCount = runEscalations.reduce((sum: number, e: any) => sum + (e.items?.length || 0), 0);
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setSelectedRunInPlan(null); setRunStatusFilter("All"); }} className="flex items-center gap-1 text-primary text-xs font-bold hover:underline">
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span> All Runs
                    </button>
                    <span className="text-outline-variant">|</span>
                    <h4 className="text-sm font-bold text-on-surface">{run.name}</h4>
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${run.status === "Completed" ? "text-secondary" : "text-primary"}`}>
                      <span className={`w-2 h-2 rounded-full ${run.status === "Completed" ? "bg-secondary" : "bg-primary animate-pulse"}`}></span>
                      {run.status}
                    </span>
                    <span className="text-[10px] text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span>{run.assignedTo || "Unassigned"}</span>
                    <span className="text-[10px] text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span>{run.createdAt}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                    <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Total</p>
                      <p className="text-2xl font-extrabold font-headline mt-1">{total}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Completed</p>
                      <p className="text-2xl font-extrabold font-headline mt-1">{percent}%</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-secondary/30 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Passed</p>
                      <p className="text-2xl font-extrabold font-headline text-secondary mt-1">{passed}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-error/30 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-error uppercase tracking-widest">Failed</p>
                      <p className="text-2xl font-extrabold font-headline text-error mt-1">{failed}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-tertiary/30 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-tertiary uppercase tracking-widest">Blocked</p>
                      <p className="text-2xl font-extrabold font-headline text-tertiary mt-1">{blocked}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-primary/30 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Retest</p>
                      <p className="text-2xl font-extrabold font-headline text-primary mt-1">{retest}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Skipped</p>
                      <p className="text-2xl font-extrabold font-headline text-slate-400 mt-1">{skipped}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Untested</p>
                      <p className="text-2xl font-extrabold font-headline text-on-surface-variant mt-1">{untested}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-error/30 shadow-sm text-center">
                      <p className="text-[9px] font-bold text-error uppercase tracking-widest">Escalations</p>
                      <p className="text-2xl font-extrabold font-headline text-error mt-1">{runEscCount}</p>
                    </div>
                  </div>
                </div>
              );
            }

            if (planDetailTab === "runs") {
              // Aggregate KPI across all runs for this plan
              const allResults = planRuns.flatMap(r => r.results);
              const total = allResults.length;
              const passed = allResults.filter(r => r.status === "Passed").length;
              const failed = allResults.filter(r => r.status === "Failed").length;
              const blocked = allResults.filter(r => r.status === "Blocked").length;
              const untested = allResults.filter(r => r.status === "Untested").length;
              const completed = total - untested;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
              const planRunIds = planRuns.map(r => r.id);
              const totalEscalations = escalations.filter((e: any) => planRunIds.includes(e.runId)).reduce((sum: number, e: any) => sum + (e.items?.length || 0), 0);
              return (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Runs</p>
                    <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1">{planRuns.length}</p>
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Passed</p>
                    <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1 text-secondary">{passed}</p>
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                    <p className="text-[10px] font-bold text-error uppercase tracking-widest">Failed</p>
                    <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1 text-error">{failed}</p>
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Blocked</p>
                    <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1 text-slate-500">{blocked}</p>
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Execution</p>
                    <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1">{percent}%</p>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-error/30 shadow-sm">
                    <p className="text-[10px] font-bold text-error uppercase tracking-widest">Escalations</p>
                    <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1 text-error">{totalEscalations}</p>
                  </div>
                </div>
              );
            }

            // Default: cases tab KPI
            return (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Cases</p>
                  <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1">{progress.total}</p>
                </div>
                <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Passed</p>
                  <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1 text-secondary">{progress.passed}</p>
                </div>
                <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                  <p className="text-[10px] font-bold text-error uppercase tracking-widest">Failed</p>
                  <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1 text-error">{progress.failed}</p>
                </div>
                <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Blocked</p>
                  <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1 text-slate-500">{progress.blocked}</p>
                </div>
                <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Execution</p>
                  <p className="text-3xl font-extrabold font-headline tracking-tighter mt-1">{progress.percent}%</p>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress.percent}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Plan metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-sm font-bold">{selectedPlan.owner ? selectedPlan.owner.charAt(0) : "?"}</div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Owner</p>
                <p className="text-sm font-bold text-on-surface">{selectedPlan.owner || "Unassigned"}</p>
              </div>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Timeline</p>
              <p className="text-sm font-bold text-on-surface mt-1">{formatDate(selectedPlan.startDate)} — {formatDate(selectedPlan.endDate)}</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-outline-variant/50 shadow-sm">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Created</p>
              <p className="text-sm font-bold text-on-surface mt-1">{formatDate(selectedPlan.createdAt)}</p>
            </div>
          </div>

          {/* ═══ Tabs: Assigned Test Cases | Assigned Test Runs ═══ */}
          {(() => {
            const planRuns = runs.filter(r => r.planId === selectedPlan.id);
            return (
              <>
              <div className="flex items-center gap-8 border-b border-outline-variant/20">
                <button
                  onClick={() => { setPlanDetailTab("cases"); setSelectedRunInPlan(null); setRunStatusFilter("All"); }}
                  className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${planDetailTab === "cases" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  Assigned Test Cases
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${planDetailTab === "cases" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>{planCases.length}</span>
                </button>
                <button
                  onClick={() => setPlanDetailTab("runs")}
                  className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${planDetailTab === "runs" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  Assigned Test Runs
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${planDetailTab === "runs" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>{planRuns.length}</span>
                </button>
                {(() => {
                  const planRunIds = planRuns.map(r => r.id);
                  const planEscalations = escalations.filter((e: any) => planRunIds.includes(e.runId));
                  const planEscCount = planEscalations.reduce((s: number, e: any) => s + (e.items?.length || 0), 0);
                  return (
                    <button
                      onClick={() => setPlanDetailTab("escalations")}
                      className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${planDetailTab === "escalations" ? "text-error border-b-2 border-error" : "text-on-surface-variant hover:text-on-surface"}`}
                    >
                      Escalations
                      {planEscCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${planDetailTab === "escalations" ? "bg-error text-white" : "bg-error/10 text-error"}`}>{planEscCount}</span>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* ─── Cases Tab ─── */}
              {planDetailTab === "cases" && (
                <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Priority</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Last Result</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Automation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {planCases.map(tc => (
                        <tr key={tc.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-primary font-mono">{tc.id.substring(0, 10)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-on-surface">{tc.title}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${tc.priority === "High" || tc.priority === "Critical" ? "bg-error text-white shadow-sm shadow-error/20" : tc.priority === "Medium" ? "bg-tertiary/10 text-tertiary" : "bg-slate-100 text-slate-500"}`}>
                              {tc.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                              <span className="material-symbols-outlined text-[16px] text-secondary">{tc.type === "Automated" ? "precision_manufacturing" : "person"}</span>
                              {tc.type}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const result = selectedPlan ? getLatestResultForTc(selectedPlan.id, tc.id) : "Not Run";
                              const resultColor: Record<string, string> = {
                                "Passed": "bg-secondary/10 border-secondary/20 text-secondary",
                                "Failed": "bg-error/10 border-error/20 text-error",
                                "Blocked": "bg-tertiary/10 border-tertiary/20 text-tertiary",
                                "Not Run": "bg-surface-container border-outline-variant/30 text-on-surface-variant",
                              };
                              return <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase border ${resultColor[result] || resultColor["Not Run"]}`}>{result}</span>;
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tc.automationStatus === "Automated" ? "bg-tertiary/10 text-tertiary" : "bg-primary/10 text-primary"}`}>{tc.automationStatus || "Manual"}</span>
                          </td>
                        </tr>
                      ))}
                      {planCases.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-16">
                            <div className="flex flex-col items-center">
                              <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">playlist_add</span>
                              <p className="text-on-surface-variant font-bold text-lg mb-1">No Test Cases Assigned</p>
                              <p className="text-sm text-on-surface-variant/70">Assign test cases to this plan from the Test Case Repository.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ─── Runs Tab ─── */}
              {planDetailTab === "runs" && !selectedRunInPlan && (
                <>
                  {planRuns.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {planRuns.map(run => {
                        const total = run.results.length;
                        const passed = run.results.filter(r => r.status === "Passed").length;
                        const failed = run.results.filter(r => r.status === "Failed").length;
                        const blocked = run.results.filter(r => r.status === "Blocked").length;
                        const untested = run.results.filter(r => r.status === "Untested").length;
                        const completed = total - untested;
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                        return (
                          <div
                            key={run.id}
                            onClick={() => { setSelectedRunInPlan(run); setRunStatusFilter("All"); }}
                            className="bg-surface border border-outline-variant rounded-xl shadow-sm p-5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${run.status === "Completed" ? "bg-secondary" : "bg-primary animate-pulse"}`}></span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${run.status === "Completed" ? "text-secondary" : "text-primary"}`}>{run.status}</span>
                              </div>
                              <span className="text-[10px] font-mono text-on-surface-variant">{run.id.substring(0, 10).toUpperCase()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-on-surface mb-1">{run.name}</h4>
                            <div className="flex items-center gap-3 text-[11px] text-on-surface-variant mb-3">
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span>{run.assignedTo || "Unassigned"}</span>
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span>{run.createdAt}</span>
                            </div>
                            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden mb-2 flex">
                              {passed > 0 && <div className="bg-secondary h-full" style={{ width: `${(passed / total) * 100}%` }}></div>}
                              {failed > 0 && <div className="bg-error h-full" style={{ width: `${(failed / total) * 100}%` }}></div>}
                              {blocked > 0 && <div className="bg-tertiary h-full" style={{ width: `${(blocked / total) * 100}%` }}></div>}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-2 text-[10px] font-bold">
                                {passed > 0 && <span className="text-secondary">{passed} Passed</span>}
                                {failed > 0 && <span className="text-error">{failed} Failed</span>}
                                {blocked > 0 && <span className="text-tertiary">{blocked} Blocked</span>}
                                {untested > 0 && <span className="text-on-surface-variant">{untested} Untested</span>}
                              </div>
                              <span className="text-xs font-extrabold text-on-surface">{percent}%</span>
                            </div>
                            <p className="text-[10px] text-on-surface-variant mt-1">{total} test case{total !== 1 ? "s" : ""}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-10 text-center">
                      <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">playlist_play</span>
                      <p className="text-on-surface-variant font-bold text-lg mb-1">No Test Runs</p>
                      <p className="text-sm text-on-surface-variant/70">Create a test run and assign this plan from the Test Runs page.</p>
                    </div>
                  )}
                </>
              )}

              {/* ─── Runs Tab: Selected Run Drill-Down ─── */}
              {planDetailTab === "runs" && selectedRunInPlan && (() => {
                const run = selectedRunInPlan;
                const filteredResults = runStatusFilter === "All"
                  ? run.results
                  : run.results.filter(r => r.status === runStatusFilter);

                const statusColorMap: Record<string, string> = {
                  Passed: "bg-secondary/10 text-secondary border-secondary/20",
                  Failed: "bg-error/10 text-error border-error/20",
                  Blocked: "bg-tertiary/10 text-tertiary border-tertiary/20",
                  Retest: "bg-primary/10 text-primary border-primary/20",
                  Skipped: "bg-slate-100 text-slate-400 border-slate-200",
                  Untested: "bg-surface-container text-on-surface-variant border-outline-variant/30",
                };
                const dotMap: Record<string, string> = {
                  Passed: "bg-secondary", Failed: "bg-error", Blocked: "bg-tertiary",
                  Retest: "bg-primary", Skipped: "bg-slate-400", Untested: "bg-on-surface-variant/40",
                };
                const colorMap: Record<string, string> = {
                  All: "bg-primary text-white", Passed: "bg-secondary text-white", Failed: "bg-error text-white",
                  Blocked: "bg-tertiary text-white", Retest: "bg-primary text-white", Skipped: "bg-slate-400 text-white",
                  Untested: "bg-on-surface-variant text-white",
                };

                return (
                  <div className="space-y-4">
                    {/* Filter tabs */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {["All", "Passed", "Failed", "Blocked", "Retest", "Skipped", "Untested"].map(status => {
                        const count = status === "All" ? run.results.length : run.results.filter(r => r.status === status).length;
                        const isActive = runStatusFilter === status;
                        return (
                          <button
                            key={status}
                            onClick={() => setRunStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                              isActive ? colorMap[status] : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                            }`}
                          >
                            {status}
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${isActive ? "bg-white/20" : "bg-surface-container-high"}`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Table */}
                    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container border-b border-outline-variant">
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Priority</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Run Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30">
                          {filteredResults.map(result => {
                            const tc = testCases.find(t => t.id === result.testCaseId);
                            if (!tc) return null;
                            return (
                              <tr key={result.testCaseId} className="hover:bg-primary/5 transition-colors">
                                <td className="px-6 py-3 text-xs font-bold text-primary font-mono">{tc.id.substring(0, 10)}</td>
                                <td className="px-6 py-3 text-sm font-semibold text-on-surface">{tc.title}</td>
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    tc.priority === "Critical" || tc.priority === "High" ? "bg-error text-white" :
                                    tc.priority === "Medium" ? "bg-tertiary/10 text-tertiary" : "bg-slate-100 text-slate-500"
                                  }`}>{tc.priority}</span>
                                </td>
                                <td className="px-6 py-3 text-xs font-medium text-on-surface-variant">{tc.type}</td>
                                <td className="px-6 py-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${statusColorMap[result.status] || statusColorMap["Untested"]}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotMap[result.status] || dotMap["Untested"]}`}></span>
                                    {result.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredResults.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-12">
                                <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">filter_list_off</span>
                                <p className="text-on-surface-variant font-bold">No test cases with status "{runStatusFilter}"</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })()}

              {/* ─── Escalations Tab ─── */}
              {planDetailTab === "escalations" && (() => {
                const planRunIds = planRuns.map(r => r.id);
                const planEscalations = escalations.filter((e: any) => planRunIds.includes(e.runId));

                const escStatusColor: Record<string, string> = {
                  "To Do": "bg-error/10 text-error",
                  "Doing": "bg-primary/10 text-primary",
                  "Done": "bg-secondary/10 text-secondary",
                };
                const severityColor: Record<string, string> = {
                  Critical: "bg-error text-white",
                  High: "bg-error/10 text-error",
                  Medium: "bg-tertiary/10 text-tertiary",
                  Low: "bg-slate-100 text-slate-500",
                };

                return planEscalations.length > 0 ? (
                  <div className="space-y-4">
                    {planEscalations.map((esc: any) => {
                      const runForEsc = runs.find(r => r.id === esc.runId);
                      return (
                        <div key={esc.id} className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
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
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${severityColor[esc.severity] || "bg-slate-100 text-slate-500"}`}>{esc.severity}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${escStatusColor[esc.status] || "bg-surface-container text-on-surface-variant"}`}>{esc.status}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-xs text-on-surface-variant flex-wrap">
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> Assigned to <span className="font-bold text-on-surface">{esc.assignedTo}</span></span>
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">bug_report</span> <span className="font-bold text-on-surface">{esc.items?.length || 0}</span> case(s)</span>
                              {runForEsc && (
                                <button
                                  onClick={() => navigate(`/test-cases?runId=${esc.runId}&tab=escalated`)}
                                  className="flex items-center gap-1 text-primary font-bold hover:underline"
                                >
                                  <span className="material-symbols-outlined text-[14px]">play_circle</span>
                                  {runForEsc.name}
                                </button>
                              )}
                              {esc.azureWorkItemId && (
                                <a href={esc.azureWorkItemUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary font-bold hover:underline">
                                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                  Azure #{esc.azureWorkItemId}
                                </a>
                              )}
                              {esc.azureState && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${escStatusColor[esc.azureState] || "bg-surface-container text-on-surface-variant"}`}>Azure: {esc.azureState}</span>
                              )}
                            </div>
                            {esc.description && (
                              <p className="mt-2 text-xs text-on-surface-variant bg-surface-container-low rounded-lg px-3 py-2 border border-outline-variant/20">{esc.description}</p>
                            )}
                          </div>
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
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-10 text-center">
                    <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">flag</span>
                    <p className="text-on-surface-variant font-bold text-lg mb-1">No Escalations</p>
                    <p className="text-sm text-on-surface-variant/70">No test cases have been escalated from any run in this plan.</p>
                  </div>
                );
              })()}
              </>
            );
          })()}
        </div>

        {/* Edit Plan Modal — uses same shared edit assignment states */}
        {isEditModalOpen && editPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4 py-6">
            <form onSubmit={submitEditPlan} className="bg-surface w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-outline-variant flex flex-col">
              <div className="flex justify-between items-center px-8 pt-8 pb-4 shrink-0">
                <h3 className="text-xl font-bold font-headline text-on-surface">Edit Test Plan</h3>
                <span onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1 transition-colors">close</span>
              </div>
              <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Plan Name</label>
                  <input required value={editPlan.name} onChange={e => setEditPlan({ ...editPlan, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Description</label>
                  <textarea value={editPlan.description} onChange={e => setEditPlan({ ...editPlan, description: e.target.value })} rows={2} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Status</label>
                    <select value={editPlan.status} onChange={e => setEditPlan({ ...editPlan, status: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                      <option>In Progress</option>
                      <option>Completed</option>
                      <option>Draft</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Owner</label>
                    <input value={editPlan.owner} onChange={e => setEditPlan({ ...editPlan, owner: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Start Date</label>
                    <input type="date" value={editPlan.startDate} onChange={e => setEditPlan({ ...editPlan, startDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">End Date</label>
                    <input type="date" value={editPlan.endDate} onChange={e => setEditPlan({ ...editPlan, endDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                  </div>
                </div>

                {/* Assignments */}
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Assigned Test Cases</label>
                  <div className="flex gap-2 mb-3">
                    {(["project", "module", "suite"] as const).map(s => (
                      <button key={s} type="button" onClick={() => { setEditAssignScope(s); setEditAssignModule(""); setEditAssignSuite(""); }}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${editAssignScope === s ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                        {s === "project" ? "Project" : s === "module" ? "Module" : "Suite"}
                      </button>
                    ))}
                  </div>
                  <select value={editAssignProjectId} onChange={e => { setEditAssignProjectId(e.target.value); setEditAssignModule(""); setEditAssignSuite(""); }}
                    className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                    <option value="">— Select Project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({testCases.filter(tc => tc.projectId === p.id).length} cases)</option>)}
                  </select>
                  {(editAssignScope === "module" || editAssignScope === "suite") && editAssignProjectId && (() => {
                    const proj = projects.find(p => p.id === editAssignProjectId);
                    return (
                      <select value={editAssignModule} onChange={e => { setEditAssignModule(e.target.value); setEditAssignSuite(""); }}
                        className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                        <option value="">— Select Module —</option>
                        {(proj?.modules || []).map(m => {
                          const count = testCases.filter(tc => tc.projectId === editAssignProjectId && tc.suite && m.suites.includes(tc.suite)).length;
                          return <option key={m.name} value={m.name}>{m.name} ({count} cases)</option>;
                        })}
                      </select>
                    );
                  })()}
                  {editAssignScope === "suite" && editAssignModule && (() => {
                    const proj = projects.find(p => p.id === editAssignProjectId);
                    const mod = proj?.modules.find(m => m.name === editAssignModule);
                    return (
                      <select value={editAssignSuite} onChange={e => setEditAssignSuite(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                        <option value="">— Select Suite —</option>
                        {(mod?.suites || []).map(s => {
                          const count = testCases.filter(tc => tc.projectId === editAssignProjectId && tc.suite === s).length;
                          return <option key={s} value={s}>{s} ({count} cases)</option>;
                        })}
                      </select>
                    );
                  })()}
                  <button type="button" onClick={() => {
                    if (!editAssignProjectId) return;
                    if (editAssignScope === "module" && !editAssignModule) return;
                    if (editAssignScope === "suite" && !editAssignSuite) return;
                    const a: PlanAssignment = { type: editAssignScope, projectId: editAssignProjectId };
                    if (editAssignScope === "module") a.moduleName = editAssignModule;
                    if (editAssignScope === "suite") { a.moduleName = editAssignModule; a.suiteName = editAssignSuite; }
                    const current = editPlan.assignments || [];
                    const exists = current.some(x => x.type === a.type && x.projectId === a.projectId && x.moduleName === a.moduleName && x.suiteName === a.suiteName);
                    if (!exists) setEditPlan({ ...editPlan, assignments: [...current, a] });
                    setEditAssignProjectId(""); setEditAssignModule(""); setEditAssignSuite("");
                  }} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]">add</span> Add Assignment
                  </button>
                  {(editPlan.assignments || []).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {(editPlan.assignments || []).map((a, i) => {
                        const projName = projects.find(p => p.id === a.projectId)?.name || a.projectId;
                        const label = a.type === "project" ? projName : a.type === "module" ? `${projName} / ${a.moduleName}` : `${projName} / ${a.moduleName} / ${a.suiteName}`;
                        return (
                          <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.type === "project" ? "bg-primary/10 text-primary" : a.type === "module" ? "bg-tertiary/10 text-tertiary" : "bg-secondary/10 text-secondary"}`}>{a.type}</span>
                              <span className="text-xs font-medium text-on-surface">{label}</span>
                            </div>
                            <span onClick={() => setEditPlan({ ...editPlan, assignments: (editPlan.assignments || []).filter((_, j) => j !== i) })}
                              className="material-symbols-outlined text-[14px] text-on-surface-variant hover:text-error cursor-pointer">close</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 px-8 py-4 border-t border-outline-variant/30 shrink-0">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Save Changes</button>
              </div>
            </form>
          </div>
        )}
      {/* Create Plan Modal (also available from detail view) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4 py-6">
          <form onSubmit={submitNewPlan} className="bg-surface w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-outline-variant flex flex-col">
            <div className="flex justify-between items-center px-8 pt-8 pb-4 shrink-0">
              <h3 className="text-xl font-bold font-headline text-on-surface">Create New Test Plan</h3>
              <span onClick={() => setIsCreateModalOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1 transition-colors">close</span>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Plan Name</label>
                <input autoFocus required value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" placeholder="e.g. Sprint 25 Regression Suite" />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Description</label>
                <textarea value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} rows={2} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none" placeholder="Brief description..." />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Owner</label>
                <input value={newPlan.owner} onChange={e => setNewPlan({ ...newPlan, owner: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" placeholder="e.g. Sarah Jenkins" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Start Date</label>
                  <input type="date" value={newPlan.startDate} onChange={e => setNewPlan({ ...newPlan, startDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">End Date</label>
                  <input type="date" value={newPlan.endDate} onChange={e => setNewPlan({ ...newPlan, endDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                </div>
              </div>
              {/* Assign Scope */}
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Assign Test Cases</label>
                <div className="flex gap-2 mb-3">
                  {(["project", "module", "suite"] as const).map(s => (
                    <button key={s} type="button" onClick={() => { setNewAssignScope(s); setNewAssignModule(""); setNewAssignSuite(""); }}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${newAssignScope === s ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                      {s === "project" ? "Project" : s === "module" ? "Module" : "Suite"}
                    </button>
                  ))}
                </div>
                <select value={newAssignProjectId} onChange={e => { setNewAssignProjectId(e.target.value); setNewAssignModule(""); setNewAssignSuite(""); }}
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                  <option value="">— Select Project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({testCases.filter(tc => tc.projectId === p.id).length} cases)</option>)}
                </select>
                {(newAssignScope === "module" || newAssignScope === "suite") && newAssignProjectId && (() => {
                  const proj = projects.find(p => p.id === newAssignProjectId);
                  return (
                    <select value={newAssignModule} onChange={e => { setNewAssignModule(e.target.value); setNewAssignSuite(""); }}
                      className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                      <option value="">— Select Module —</option>
                      {(proj?.modules || []).map(m => {
                        const count = testCases.filter(tc => tc.projectId === newAssignProjectId && tc.suite && m.suites.includes(tc.suite)).length;
                        return <option key={m.name} value={m.name}>{m.name} ({count} cases)</option>;
                      })}
                    </select>
                  );
                })()}
                {newAssignScope === "suite" && newAssignModule && (() => {
                  const proj = projects.find(p => p.id === newAssignProjectId);
                  const mod = proj?.modules.find(m => m.name === newAssignModule);
                  return (
                    <select value={newAssignSuite} onChange={e => setNewAssignSuite(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                      <option value="">— Select Suite —</option>
                      {(mod?.suites || []).map(s => {
                        const count = testCases.filter(tc => tc.projectId === newAssignProjectId && tc.suite === s).length;
                        return <option key={s} value={s}>{s} ({count} cases)</option>;
                      })}
                    </select>
                  );
                })()}
                <button type="button" onClick={() => {
                  if (!newAssignProjectId) return;
                  if (newAssignScope === "module" && !newAssignModule) return;
                  if (newAssignScope === "suite" && !newAssignSuite) return;
                  const assignment: PlanAssignment = { type: newAssignScope, projectId: newAssignProjectId };
                  if (newAssignScope === "module") assignment.moduleName = newAssignModule;
                  if (newAssignScope === "suite") { assignment.moduleName = newAssignModule; assignment.suiteName = newAssignSuite; }
                  const exists = newPlan.assignments.some(a => a.type === assignment.type && a.projectId === assignment.projectId && a.moduleName === assignment.moduleName && a.suiteName === assignment.suiteName);
                  if (!exists) setNewPlan({ ...newPlan, assignments: [...newPlan.assignments, assignment] });
                  setNewAssignProjectId(""); setNewAssignModule(""); setNewAssignSuite("");
                }} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> Add Assignment
                </button>
                {newPlan.assignments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {newPlan.assignments.map((a, i) => {
                      const projName = projects.find(p => p.id === a.projectId)?.name || a.projectId;
                      const label = a.type === "project" ? projName : a.type === "module" ? `${projName} / ${a.moduleName}` : `${projName} / ${a.moduleName} / ${a.suiteName}`;
                      return (
                        <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.type === "project" ? "bg-primary/10 text-primary" : a.type === "module" ? "bg-tertiary/10 text-tertiary" : "bg-secondary/10 text-secondary"}`}>{a.type}</span>
                            <span className="text-xs font-medium text-on-surface">{label}</span>
                          </div>
                          <span onClick={() => setNewPlan({ ...newPlan, assignments: newPlan.assignments.filter((_, j) => j !== i) })}
                            className="material-symbols-outlined text-[14px] text-on-surface-variant hover:text-error cursor-pointer">close</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-outline-variant/30 shrink-0">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Create Plan</button>
            </div>
          </form>
        </div>
      )}

      {/* Styled Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-8 border border-outline-variant">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-1">{confirmDialog.title}</h3>
                <p className="text-sm text-on-surface-variant">{confirmDialog.message}</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmDialog(null)} className="flex-1 font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2.5 hover:bg-surface-container rounded-lg transition-colors border border-outline-variant">Cancel</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 bg-error text-white font-bold text-sm px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  // ─── Main Plans List View ─────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <nav className="flex items-center gap-6">
              <span className="text-[10px] font-bold tracking-[0.15em] text-primary uppercase">JumpIQ</span>
              <div className="h-[1px] w-12 bg-outline-variant/20"></div>
              <span className="text-[10px] font-bold tracking-[0.15em] text-outline uppercase">Test Plans</span>
            </nav>
            <h2 className="text-3xl font-extrabold font-headline text-on-background tracking-tight">Strategy Execution</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={syncSprints}
              disabled={syncing}
              className="bg-surface border border-outline-variant text-on-surface px-5 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-xl ${syncing ? "animate-spin" : ""}`}>{syncing ? "sync" : "cloud_sync"}</span>
              {syncing ? "Syncing..." : "Sync Azure Sprints"}
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="gradient-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform">
              <span className="material-symbols-outlined text-xl">add</span>
              Create New Plan
            </button>
          </div>
          {syncResult && (
            <div className="absolute top-20 right-8 bg-secondary/10 border border-secondary/30 text-secondary rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg z-50">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Synced {syncResult.synced} sprint{syncResult.synced !== 1 ? "s" : ""} — {syncResult.created} created, {syncResult.updated} updated
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2 bg-surface p-6 rounded-3xl shadow-sm flex flex-col justify-between border border-outline-variant/50">
            <div className="flex justify-between items-start">
              <div className="bg-secondary/10 p-3 rounded-xl">
                <span className="material-symbols-outlined text-secondary">task_alt</span>
              </div>
              {totalCasesInPlans > 0 && (
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{totalPassedInPlans} of {totalCasesInPlans} executed</span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-on-surface-variant text-sm font-medium">Overall Execution Progress</p>
              <div className="flex items-end gap-3 mt-1">
                <h3 className="text-4xl font-extrabold font-headline tracking-tighter">{overallProgress}%</h3>
                <div className="flex-1 h-3 bg-surface-container rounded-full mb-2 overflow-hidden">
                  <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-3xl shadow-sm border border-outline-variant/50">
            <p className="text-on-surface-variant text-sm font-medium">Active Plans</p>
            <h3 className="text-4xl font-extrabold font-headline tracking-tighter mt-2">{activePlans.length}</h3>
            <div className="flex items-center gap-2 mt-4">
              <span className="flex -space-x-2">
                {activePlans.slice(0, 3).map((p, i) => (
                  <div key={p.id} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-slate-300' : i === 1 ? 'bg-slate-400' : 'bg-slate-500'} text-white`}>
                    {p.owner ? p.owner.charAt(0) : "?"}
                  </div>
                ))}
              </span>
              {activePlans.length > 3 && (
                <span className="text-xs text-on-surface-variant">+{activePlans.length - 3} owners</span>
              )}
            </div>
          </div>
          <div className="bg-surface p-6 rounded-3xl shadow-sm border border-outline-variant/50">
            <p className="text-on-surface-variant text-sm font-medium">Total Test Cases</p>
            <h3 className="text-4xl font-extrabold font-headline tracking-tighter mt-2">{totalCasesInPlans}</h3>
            <p className="text-[10px] font-bold text-error uppercase tracking-widest mt-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">error</span>
              {totalFailedInPlans} failed
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-1">
          <div className="flex gap-10">
            <button onClick={() => setActiveTab("active")} className={`pb-4 text-sm font-bold transition-all ${activeTab === "active" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
              Active Plans ({activePlans.length})
            </button>
            <button onClick={() => setActiveTab("completed")} className={`pb-4 text-sm font-bold transition-all ${activeTab === "completed" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
              Completed ({completedPlans.length})
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20 opacity-50">
            <p className="text-on-surface-variant font-medium">Loading plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayedPlans.map(plan => {
              const progress = getPlanProgress(plan.id);
              return (
                <div key={plan.id} onClick={() => setSelectedPlan(plan)} className="bg-surface p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group border border-outline-variant/50 cursor-pointer">
                  <div className="grid grid-cols-12 gap-6 items-center">
                    <div className="col-span-4 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${plan.status === "In Progress" ? "bg-primary/10 text-primary" : plan.status === "Completed" ? "bg-secondary/10 text-secondary" : "bg-surface-container-highest text-on-surface-variant"}`}>
                          {plan.id.substring(0, 8)}
                        </span>
                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${plan.status === "Completed" ? "text-secondary" : plan.status === "In Progress" ? "text-primary" : "text-on-surface-variant"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${plan.status === "Completed" ? "bg-secondary" : plan.status === "In Progress" ? "bg-primary animate-pulse" : "bg-on-surface-variant"}`}></span>
                          {plan.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold font-headline group-hover:text-primary transition-colors flex items-center gap-2">
                        {plan.name}
                        {(plan as any).azureIterationId && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">Azure Sprint</span>}
                      </h4>
                      {plan.description && <p className="text-xs text-on-surface-variant line-clamp-1">{plan.description}</p>}
                    </div>
                    <div className="col-span-3 space-y-2">
                      <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
                        <span>Progress ({progress.total} cases)</span>
                        <span className="font-bold text-on-surface">{progress.percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${plan.status === "Completed" ? "bg-secondary" : "bg-primary"}`} style={{ width: `${progress.percent}%` }}></div>
                      </div>
                      <div className="flex gap-3 text-[10px] font-bold">
                        <span className="text-secondary">{progress.passed} passed</span>
                        <span className="text-error">{progress.failed} failed</span>
                        <span className="text-slate-400">{progress.pending} pending</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-center border-l border-outline-variant/10">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Timeline</p>
                      <p className="text-xs font-medium">{formatDate(plan.startDate)} — {formatDate(plan.endDate)}</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-3 border-l border-outline-variant/10 pl-6">
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-sm font-bold">{plan.owner ? plan.owner.charAt(0) : "?"}</div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Owner</p>
                        <p className="text-xs font-bold">{plan.owner || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditPlan({...plan}); setIsEditModalOpen(true); }} className="p-2 hover:bg-surface-container rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">edit</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }} className="p-2 hover:bg-error/10 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-error/70 text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {displayedPlans.length === 0 && (
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">assignment</span>
                <p className="text-on-surface-variant font-bold text-lg mb-2">No {activeTab === "active" ? "Active" : "Completed"} Plans</p>
                <p className="text-sm text-on-surface-variant/70 mb-6">
                  {activeTab === "active" ? "Create a new test plan to get started." : "No plans have been completed yet."}
                </p>
                {activeTab === "active" && (
                  <button onClick={() => setIsCreateModalOpen(true)} className="px-5 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg transition-colors text-sm">
                    + Create Plan
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <form onSubmit={submitNewPlan} className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-8 border border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-headline text-on-surface">Create New Test Plan</h3>
              <span onClick={() => setIsCreateModalOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1 transition-colors">close</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Plan Name</label>
                <input autoFocus required value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" placeholder="e.g. Sprint 25 Regression Suite" />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Description</label>
                <textarea value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} rows={3} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none" placeholder="Brief description of this test plan's scope and goals..." />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Owner</label>
                <input value={newPlan.owner} onChange={e => setNewPlan({ ...newPlan, owner: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" placeholder="e.g. Sarah Jenkins" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Start Date</label>
                  <input type="date" value={newPlan.startDate} onChange={e => setNewPlan({ ...newPlan, startDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">End Date</label>
                  <input type="date" value={newPlan.endDate} onChange={e => setNewPlan({ ...newPlan, endDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                </div>
              </div>

              {/* Assign Scope */}
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Assign Test Cases</label>
                <div className="flex gap-2 mb-3">
                  {(["project", "module", "suite"] as const).map(s => (
                    <button key={s} type="button" onClick={() => { setNewAssignScope(s); setNewAssignModule(""); setNewAssignSuite(""); }}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${newAssignScope === s ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                      {s === "project" ? "Project" : s === "module" ? "Module" : "Suite"}
                    </button>
                  ))}
                </div>
                <select value={newAssignProjectId} onChange={e => { setNewAssignProjectId(e.target.value); setNewAssignModule(""); setNewAssignSuite(""); }}
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                  <option value="">— Select Project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({testCases.filter(tc => tc.projectId === p.id).length} cases)</option>)}
                </select>
                {(newAssignScope === "module" || newAssignScope === "suite") && newAssignProjectId && (() => {
                  const proj = projects.find(p => p.id === newAssignProjectId);
                  return (
                    <select value={newAssignModule} onChange={e => { setNewAssignModule(e.target.value); setNewAssignSuite(""); }}
                      className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                      <option value="">— Select Module —</option>
                      {(proj?.modules || []).map(m => {
                        const count = testCases.filter(tc => tc.projectId === newAssignProjectId && tc.suite && m.suites.includes(tc.suite)).length;
                        return <option key={m.name} value={m.name}>{m.name} ({count} cases)</option>;
                      })}
                    </select>
                  );
                })()}
                {newAssignScope === "suite" && newAssignModule && (() => {
                  const proj = projects.find(p => p.id === newAssignProjectId);
                  const mod = proj?.modules.find(m => m.name === newAssignModule);
                  return (
                    <select value={newAssignSuite} onChange={e => setNewAssignSuite(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                      <option value="">— Select Suite —</option>
                      {(mod?.suites || []).map(s => {
                        const count = testCases.filter(tc => tc.projectId === newAssignProjectId && tc.suite === s).length;
                        return <option key={s} value={s}>{s} ({count} cases)</option>;
                      })}
                    </select>
                  );
                })()}
                <button type="button" onClick={() => {
                  if (!newAssignProjectId) return;
                  if (newAssignScope === "module" && !newAssignModule) return;
                  if (newAssignScope === "suite" && !newAssignSuite) return;
                  const assignment: PlanAssignment = { type: newAssignScope, projectId: newAssignProjectId };
                  if (newAssignScope === "module") assignment.moduleName = newAssignModule;
                  if (newAssignScope === "suite") { assignment.moduleName = newAssignModule; assignment.suiteName = newAssignSuite; }
                  // Check duplicate
                  const exists = newPlan.assignments.some(a => a.type === assignment.type && a.projectId === assignment.projectId && a.moduleName === assignment.moduleName && a.suiteName === assignment.suiteName);
                  if (!exists) {
                    setNewPlan({ ...newPlan, assignments: [...newPlan.assignments, assignment] });
                  }
                  setNewAssignProjectId(""); setNewAssignModule(""); setNewAssignSuite("");
                }} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> Add Assignment
                </button>

                {/* Assignment list */}
                {newPlan.assignments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {newPlan.assignments.map((a, i) => {
                      const projName = projects.find(p => p.id === a.projectId)?.name || a.projectId;
                      const label = a.type === "project" ? projName
                        : a.type === "module" ? `${projName} / ${a.moduleName}`
                        : `${projName} / ${a.moduleName} / ${a.suiteName}`;
                      return (
                        <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.type === "project" ? "bg-primary/10 text-primary" : a.type === "module" ? "bg-tertiary/10 text-tertiary" : "bg-secondary/10 text-secondary"}`}>{a.type}</span>
                            <span className="text-xs font-medium text-on-surface">{label}</span>
                          </div>
                          <span onClick={() => setNewPlan({ ...newPlan, assignments: newPlan.assignments.filter((_, j) => j !== i) })}
                            className="material-symbols-outlined text-[14px] text-on-surface-variant hover:text-error cursor-pointer">close</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Create Plan</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Plan Modal (from list view) */}
      {isEditModalOpen && editPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <form onSubmit={submitEditPlan} className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-8 border border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-headline text-on-surface">Edit Test Plan</h3>
              <span onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1 transition-colors">close</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Plan Name</label>
                <input required value={editPlan.name} onChange={e => setEditPlan({ ...editPlan, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Description</label>
                <textarea value={editPlan.description} onChange={e => setEditPlan({ ...editPlan, description: e.target.value })} rows={3} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Status</label>
                  <select value={editPlan.status} onChange={e => setEditPlan({ ...editPlan, status: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Owner</label>
                  <input value={editPlan.owner} onChange={e => setEditPlan({ ...editPlan, owner: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Start Date</label>
                  <input type="date" value={editPlan.startDate} onChange={e => setEditPlan({ ...editPlan, startDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">End Date</label>
                  <input type="date" value={editPlan.endDate} onChange={e => setEditPlan({ ...editPlan, endDate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none shadow-sm" />
                </div>
              </div>

              {/* Edit Assignments */}
              <div>
                <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Assigned Test Cases</label>
                <div className="flex gap-2 mb-3">
                  {(["project", "module", "suite"] as const).map(s => (
                    <button key={s} type="button" onClick={() => { setEditAssignScope(s); setEditAssignModule(""); setEditAssignSuite(""); }}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${editAssignScope === s ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                      {s === "project" ? "Project" : s === "module" ? "Module" : "Suite"}
                    </button>
                  ))}
                </div>
                <select value={editAssignProjectId} onChange={e => { setEditAssignProjectId(e.target.value); setEditAssignModule(""); setEditAssignSuite(""); }}
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                  <option value="">— Select Project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {(editAssignScope === "module" || editAssignScope === "suite") && editAssignProjectId && (() => {
                  const proj = projects.find(p => p.id === editAssignProjectId);
                  return (
                    <select value={editAssignModule} onChange={e => { setEditAssignModule(e.target.value); setEditAssignSuite(""); }}
                      className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                      <option value="">— Select Module —</option>
                      {(proj?.modules || []).map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  );
                })()}
                {editAssignScope === "suite" && editAssignModule && (() => {
                  const proj = projects.find(p => p.id === editAssignProjectId);
                  const mod = proj?.modules.find(m => m.name === editAssignModule);
                  return (
                    <select value={editAssignSuite} onChange={e => setEditAssignSuite(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm mb-2">
                      <option value="">— Select Suite —</option>
                      {(mod?.suites || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  );
                })()}
                <button type="button" onClick={() => {
                  if (!editAssignProjectId) return;
                  if (editAssignScope === "module" && !editAssignModule) return;
                  if (editAssignScope === "suite" && !editAssignSuite) return;
                  const a: PlanAssignment = { type: editAssignScope, projectId: editAssignProjectId };
                  if (editAssignScope === "module") a.moduleName = editAssignModule;
                  if (editAssignScope === "suite") { a.moduleName = editAssignModule; a.suiteName = editAssignSuite; }
                  const current = editPlan.assignments || [];
                  const exists = current.some(x => x.type === a.type && x.projectId === a.projectId && x.moduleName === a.moduleName && x.suiteName === a.suiteName);
                  if (!exists) setEditPlan({ ...editPlan, assignments: [...current, a] });
                  setEditAssignProjectId(""); setEditAssignModule(""); setEditAssignSuite("");
                }} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> Add Assignment
                </button>
                {(editPlan.assignments || []).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {(editPlan.assignments || []).map((a, i) => {
                      const projName = projects.find(p => p.id === a.projectId)?.name || a.projectId;
                      const label = a.type === "project" ? projName : a.type === "module" ? `${projName} / ${a.moduleName}` : `${projName} / ${a.moduleName} / ${a.suiteName}`;
                      return (
                        <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.type === "project" ? "bg-primary/10 text-primary" : a.type === "module" ? "bg-tertiary/10 text-tertiary" : "bg-secondary/10 text-secondary"}`}>{a.type}</span>
                            <span className="text-xs font-medium text-on-surface">{label}</span>
                          </div>
                          <span onClick={() => setEditPlan({ ...editPlan, assignments: (editPlan.assignments || []).filter((_, j) => j !== i) })}
                            className="material-symbols-outlined text-[14px] text-on-surface-variant hover:text-error cursor-pointer">close</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Styled Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl p-8 border border-outline-variant">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-1">{confirmDialog.title}</h3>
                <p className="text-sm text-on-surface-variant">{confirmDialog.message}</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmDialog(null)} className="flex-1 font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2.5 hover:bg-surface-container rounded-lg transition-colors border border-outline-variant">Cancel</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 bg-error text-white font-bold text-sm px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
