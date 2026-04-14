import { useState, useEffect } from "react";

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

interface ExecutionLog {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  action: string;
  timestamp: Date;
}

export default function TestExecutionCycle() {
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [executionLog, setExecutionLog] = useState<ExecutionLog[]>([]);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [plansRes, tcRes] = await Promise.all([
        fetch("http://localhost:3001/api/testplans"),
        fetch("http://localhost:3001/api/testcases")
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (tcRes.ok) setTestCases(await tcRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-select first plan with cases
  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      const firstWithCases = plans.find(p => testCases.some(tc => tc.planId === p.id));
      if (firstWithCases) setSelectedPlanId(firstWithCases.id);
      else setSelectedPlanId(plans[0].id);
    }
  }, [plans, testCases]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || null;
  const planTestCases = selectedPlanId ? testCases.filter(tc => tc.planId === selectedPlanId) : [];

  const filteredCases = planTestCases.filter(tc => {
    if (statusFilter === "All") return true;
    return tc.status === statusFilter;
  });

  // KPIs
  const totalCases = planTestCases.length;
  const passedCount = planTestCases.filter(tc => tc.status === "PASSED").length;
  const failedCount = planTestCases.filter(tc => tc.status === "FAILED").length;
  const blockedCount = planTestCases.filter(tc => tc.status === "BLOCKED").length;
  const completionPercent = totalCases > 0 ? Math.round(((passedCount + failedCount) / totalCases) * 100) : 0;

  const updateTestCaseStatus = async (tcId: string, newStatus: string) => {
    const tc = testCases.find(t => t.id === tcId);
    if (!tc) return;

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      await fetch(`http://localhost:3001/api/testcases/${tcId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tc, status: newStatus, lastRun: now.toISOString().split("T")[0] + " " + timeStr })
      });

      // Add to execution log
      setExecutionLog(prev => [{
        id: `log_${Date.now()}`,
        testCaseId: tc.id.substring(0, 10),
        testCaseTitle: tc.title,
        action: newStatus,
        timestamp: now
      }, ...prev]);

      if (activeTestId === tcId) setActiveTestId(null);
      fetchData();
    } catch (error) {
      console.error("Error updating test case:", error);
    }
  };

  const startTest = (tcId: string) => {
    setActiveTestId(tcId);
    const tc = testCases.find(t => t.id === tcId);
    if (tc) {
      setExecutionLog(prev => [{
        id: `log_${Date.now()}`,
        testCaseId: tc.id.substring(0, 10),
        testCaseTitle: tc.title,
        action: "STARTED",
        timestamp: new Date()
      }, ...prev]);
    }
  };

  const runAllPending = () => {
    const pending = planTestCases.filter(tc => tc.status === "DRAFT" || tc.status === "READY");
    if (pending.length > 0) {
      startTest(pending[0].id);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  };

  const getLogIcon = (action: string) => {
    switch (action) {
      case "PASSED": return { icon: "check_circle", bg: "bg-secondary/10", color: "text-secondary" };
      case "FAILED": return { icon: "error", bg: "bg-error/10", color: "text-error" };
      case "BLOCKED": return { icon: "block", bg: "bg-slate-100", color: "text-slate-500" };
      case "STARTED": return { icon: "play_circle", bg: "bg-primary/10", color: "text-primary" };
      default: return { icon: "info", bg: "bg-surface-container", color: "text-on-surface-variant" };
    }
  };

  const activeTestCase = activeTestId ? testCases.find(t => t.id === activeTestId) : null;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 relative h-full">
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px] animate-spin" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
              Active Execution Cycle
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">
              {selectedPlan ? selectedPlan.name : "Test Execution"}
            </h2>
            <p className="text-on-surface-variant text-sm font-medium">
              {selectedPlan ? `Owner: ${selectedPlan.owner || "Unassigned"} • ${totalCases} test cases` : "Select a test plan to begin execution"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Plan Selector */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">assignment</span>
              <select
                value={selectedPlanId}
                onChange={e => { setSelectedPlanId(e.target.value); setActiveTestId(null); }}
                className="bg-surface border border-outline-variant px-4 py-2 rounded-lg font-semibold text-sm text-on-surface cursor-pointer outline-none hover:bg-surface-container-high transition-all shadow-sm min-w-[240px]"
              >
                <option value="">— Select a Test Plan —</option>
                {plans.map(plan => {
                  const casesCount = testCases.filter(tc => tc.planId === plan.id).length;
                  return (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({casesCount} cases)
                    </option>
                  );
                })}
              </select>
            </div>
            <button onClick={runAllPending} disabled={!selectedPlanId || planTestCases.length === 0} className="gradient-primary text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span> Run Next
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {selectedPlanId && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-surface border border-outline-variant p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-8 -mt-8"></div>
              <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 relative z-10">Completion</div>
              <div className="flex items-baseline justify-between relative z-10">
                <span className="text-3xl font-extrabold text-on-surface">{completionPercent}%</span>
                <span className="text-xs font-bold text-primary">{passedCount + failedCount}/{totalCases}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden relative z-10">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${completionPercent}%` }}></div>
              </div>
            </div>
            <div className="bg-surface border border-outline-variant p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-bl-full -mr-8 -mt-8"></div>
              <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Passed</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-secondary">{passedCount}</span>
                {passedCount > 0 && (
                  <span className="text-[10px] font-bold text-secondary/70 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">check</span>
                  </span>
                )}
              </div>
            </div>
            <div className="bg-surface border border-outline-variant p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-error/5 rounded-bl-full -mr-8 -mt-8"></div>
              <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Failed</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-error">{failedCount}</span>
                {failedCount > 0 && (
                  <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Attention</span>
                )}
              </div>
            </div>
            <div className="bg-surface border border-outline-variant p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-bl-full -mr-8 -mt-8"></div>
              <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 text-slate-500">Blocked</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-500">{blockedCount}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main content */}
      {!selectedPlanId ? (
        <div className="flex flex-col items-center justify-center py-24">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">assignment</span>
          <h3 className="text-xl font-bold text-on-surface mb-2">Select a Test Plan</h3>
          <p className="text-sm text-on-surface-variant mb-6 text-center max-w-md">
            Choose a test plan from the dropdown above to view and execute its test cases. You can create plans and assign test cases from the Test Plans and Test Case Repository pages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-32">
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface">Test Case Pipeline</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-surface border border-outline-variant text-[11px] font-bold uppercase tracking-wider rounded-lg py-1 px-3 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="READY">Ready</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Test Description</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Current Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-outline-variant/30">
                  {filteredCases.map(tc => (
                    <tr key={tc.id} className={`group hover:bg-slate-50 transition-colors ${activeTestId === tc.id ? "bg-primary/5" : ""}`}>
                      <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{tc.id.substring(0, 10)}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-on-surface">{tc.title}</div>
                        <div className="text-[11px] text-on-surface-variant">{tc.type} • {tc.suite || "No suite"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${tc.priority === "High" ? "bg-error-container text-on-error-container" : tc.priority === "Med" ? "bg-tertiary/10 text-tertiary" : "bg-slate-100 text-slate-500"}`}>
                          {tc.priority === "High" ? "P0" : tc.priority === "Med" ? "P1" : "P2"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {activeTestId === tc.id ? (
                          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-tight">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,95,184,0.4)]"></span>
                            In Progress
                          </div>
                        ) : tc.status === "PASSED" ? (
                          <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-tight">
                            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Passed
                          </div>
                        ) : tc.status === "FAILED" ? (
                          <div className="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-tight">
                            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                            Failed
                          </div>
                        ) : tc.status === "BLOCKED" ? (
                          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-tight">
                            <span className="material-symbols-outlined text-[16px]">block</span>
                            Blocked
                          </div>
                        ) : (
                          <div className="text-slate-400 font-medium italic text-xs">Pending Pipeline...</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {activeTestId === tc.id ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => updateTestCaseStatus(tc.id, "PASSED")} className="p-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all" title="Pass">
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                            <button onClick={() => updateTestCaseStatus(tc.id, "FAILED")} className="p-2 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all" title="Fail">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                            <button onClick={() => updateTestCaseStatus(tc.id, "BLOCKED")} className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all" title="Block">
                              <span className="material-symbols-outlined text-sm">block</span>
                            </button>
                          </div>
                        ) : tc.status === "PASSED" || tc.status === "FAILED" ? (
                          <button onClick={() => startTest(tc.id)} className="text-xs font-black text-primary hover:underline uppercase tracking-wider">Retest Case</button>
                        ) : (
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startTest(tc.id)} className="px-4 py-1.5 rounded-lg gradient-primary text-white text-[10px] font-black uppercase tracking-wider shadow-sm">Start Test</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredCases.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">playlist_add</span>
                          <p className="text-on-surface-variant font-bold text-lg mb-1">
                            {planTestCases.length === 0 ? "No Test Cases in This Plan" : "No Cases Match Filter"}
                          </p>
                          <p className="text-sm text-on-surface-variant/70">
                            {planTestCases.length === 0
                              ? "Assign test cases to this plan from the Test Case Repository."
                              : "Try changing the status filter above."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right sidebar - Execution Log */}
          <div className="xl:col-span-4 flex flex-col gap-8">
            <div className="bg-surface border border-outline-variant p-8 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-extrabold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span> Execution Log
                </h4>
                <span className="text-[10px] font-black px-2 py-1 bg-secondary/10 text-secondary rounded uppercase tracking-wider">Real-time</span>
              </div>
              <div className="space-y-6 max-h-[500px] overflow-y-auto">
                {executionLog.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-3xl text-outline-variant mb-2">hourglass_empty</span>
                    <p className="text-sm text-on-surface-variant font-medium">No execution activity yet.</p>
                    <p className="text-xs text-on-surface-variant/60 mt-1">Start testing to see the log here.</p>
                  </div>
                ) : (
                  executionLog.map((log, idx) => {
                    const style = getLogIcon(log.action);
                    return (
                      <div key={log.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center ${style.color}`}>
                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
                          </div>
                          {idx < executionLog.length - 1 && <div className="w-px h-full bg-outline-variant/30 mt-2"></div>}
                        </div>
                        <div className="pb-2">
                          <p className="text-sm font-bold text-on-surface leading-tight">
                            <span className="text-primary">{log.testCaseId}</span>
                            {log.action === "STARTED" ? (
                              <> test <span className="text-primary font-black">STARTED</span></>
                            ) : (
                              <> was marked <span className={`font-black ${log.action === "PASSED" ? "text-secondary" : log.action === "FAILED" ? "text-error" : "text-slate-500"}`}>{log.action}</span></>
                            )}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-1">{getTimeAgo(log.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Plan Info */}
            {selectedPlan && (
              <div className="bg-surface border border-outline-variant p-6 rounded-xl shadow-sm">
                <h4 className="font-extrabold text-on-surface text-sm mb-4 flex items-center justify-between">
                  <span>Plan Details</span>
                  <span className="material-symbols-outlined text-on-surface-variant">info</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-on-surface-variant">Owner</span>
                    <span className="font-bold text-on-surface">{selectedPlan.owner || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-on-surface-variant">Status</span>
                    <span className={`font-bold ${selectedPlan.status === "In Progress" ? "text-primary" : selectedPlan.status === "Completed" ? "text-secondary" : "text-on-surface-variant"}`}>{selectedPlan.status}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-on-surface-variant">Timeline</span>
                    <span className="font-bold text-on-surface">
                      {selectedPlan.startDate ? new Date(selectedPlan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} — {selectedPlan.endDate ? new Date(selectedPlan.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </div>
                  {selectedPlan.description && (
                    <div className="pt-2 border-t border-outline-variant/20">
                      <p className="text-xs text-on-surface-variant leading-relaxed">{selectedPlan.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating action bar when a test is active */}
      {activeTestCase && (
        <div className="fixed bottom-6 right-8 xl:left-[calc(16rem+2rem)] sm:left-8 z-50">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 px-8 py-4 rounded-2xl flex items-center justify-between text-on-surface shadow-2xl">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-secondary rounded-full animate-pulse shadow-[0_0_12px_rgba(0,183,195,0.6)]"></span>
                <div>
                  <div className="text-[9px] uppercase tracking-widest font-black text-on-surface-variant opacity-70">Currently Testing</div>
                  <div className="text-sm font-extrabold text-on-surface">{activeTestCase.id.substring(0, 10)}: {activeTestCase.title}</div>
                </div>
              </div>
              <div className="h-8 w-px bg-outline-variant/50 hidden md:block"></div>
              <div className="hidden md:flex gap-8">
                <div className="text-center">
                  <div className="text-[9px] uppercase font-black text-on-surface-variant opacity-70">Priority</div>
                  <div className={`text-sm font-bold ${activeTestCase.priority === "High" ? "text-error" : "text-primary"}`}>{activeTestCase.priority}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-black text-on-surface-variant opacity-70">Type</div>
                  <div className="text-sm font-bold">{activeTestCase.type}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => updateTestCaseStatus(activeTestCase.id, "PASSED")} className="px-5 py-2.5 bg-secondary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">check</span> Pass
              </button>
              <button onClick={() => updateTestCaseStatus(activeTestCase.id, "FAILED")} className="px-5 py-2.5 bg-error text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">close</span> Fail
              </button>
              <button onClick={() => updateTestCaseStatus(activeTestCase.id, "BLOCKED")} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-on-surface-variant rounded-xl transition-colors" title="Block">
                <span className="material-symbols-outlined text-[18px]">block</span>
              </button>
              <button onClick={() => setActiveTestId(null)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-on-surface-variant rounded-xl transition-colors" title="Cancel">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
