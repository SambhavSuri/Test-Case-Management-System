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

export default function TestPlans() {
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", description: "", owner: "", startDate: "", endDate: "" });

  // Detail view state
  const [selectedPlan, setSelectedPlan] = useState<TestPlan | null>(null);

  // Edit plan modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<TestPlan | null>(null);

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

  const getTestCasesForPlan = (planId: string) => testCases.filter(tc => tc.planId === planId);

  const getPlanProgress = (planId: string) => {
    const planCases = getTestCasesForPlan(planId);
    if (planCases.length === 0) return { total: 0, passed: 0, failed: 0, blocked: 0, pending: 0, percent: 0 };
    const passed = planCases.filter(tc => tc.status === "PASSED").length;
    const failed = planCases.filter(tc => tc.status === "FAILED").length;
    const blocked = planCases.filter(tc => tc.status === "BLOCKED").length;
    const pending = planCases.length - passed - failed - blocked;
    const percent = planCases.length > 0 ? Math.round(((passed + failed) / planCases.length) * 100) : 0;
    return { total: planCases.length, passed, failed, blocked, pending, percent };
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
      setNewPlan({ name: "", description: "", owner: "", startDate: "", endDate: "" });
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

  const deletePlan = async (planId: string) => {
    if (!confirm("Delete this test plan? Test cases assigned to it will become unassigned.")) return;
    try {
      // Unassign test cases from this plan
      const planCases = getTestCasesForPlan(planId);
      await Promise.all(planCases.map(tc =>
        fetch(`http://localhost:3001/api/testcases/${tc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tc, planId: undefined })
        })
      ));
      await fetch(`http://localhost:3001/api/testplans/${planId}`, { method: "DELETE" });
      if (selectedPlan?.id === planId) setSelectedPlan(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting plan:", error);
    }
  };

  const activePlans = plans.filter(p => p.status !== "Completed");
  const completedPlans = plans.filter(p => p.status === "Completed");
  const displayedPlans = activeTab === "active" ? activePlans : completedPlans;

  // KPI totals
  const totalCasesInPlans = plans.reduce((acc, p) => acc + getTestCasesForPlan(p.id).length, 0);
  const totalPassedInPlans = plans.reduce((acc, p) => acc + getTestCasesForPlan(p.id).filter(tc => tc.status === "PASSED").length, 0);
  const totalFailedInPlans = plans.reduce((acc, p) => acc + getTestCasesForPlan(p.id).filter(tc => tc.status === "FAILED").length, 0);
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
              <button onClick={() => setSelectedPlan(null)} className="flex items-center gap-2 text-primary text-sm font-bold hover:underline transition-all">
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
              <button onClick={() => { setEditPlan({...selectedPlan}); setIsEditModalOpen(true); }} className="bg-surface border border-outline-variant text-on-surface px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-surface-container-high transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Plan
              </button>
              <button onClick={() => deletePlan(selectedPlan.id)} className="bg-error/10 border border-error/20 text-error px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-error/20 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
            </div>
          </div>

          {/* Detail KPI cards */}
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

          {/* Test Cases Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface">Assigned Test Cases ({planCases.length})</h3>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Priority</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Last Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {planCases.map(tc => (
                    <tr key={tc.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-primary font-mono">{tc.id.substring(0, 10)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-on-surface">{tc.title}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${tc.priority === "High" ? "bg-error text-white shadow-sm shadow-error/20" : tc.priority === "Med" ? "bg-tertiary/10 text-tertiary" : "bg-slate-100 text-slate-500"}`}>
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
                        <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase border ${getStatusBg(tc.status)}`}>{tc.status}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">{tc.lastRun}</td>
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
          </div>
        </div>

        {/* Edit Plan Modal */}
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
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Save Changes</button>
              </div>
            </form>
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
          <button onClick={() => setIsCreateModalOpen(true)} className="gradient-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform">
            <span className="material-symbols-outlined text-xl">add</span>
            Create New Plan
          </button>
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
                      <h4 className="text-lg font-bold font-headline group-hover:text-primary transition-colors">{plan.name}</h4>
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
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
