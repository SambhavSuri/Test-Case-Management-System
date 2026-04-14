import { useState, useEffect } from "react";

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

export default function TestCaseRepository() {
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

  // Modal State
  const [isTCModalOpen, setIsTCModalOpen] = useState(false);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Upload File State (mock)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // New Form State
  const [newTC, setNewTC] = useState({ title: "", priority: "Med", type: "Manual", status: "DRAFT", suite: "", planId: "" });
  const [newProj, setNewProj] = useState({ name: "" });

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
        // Expand first project by default
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

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredTestCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTestCases.map((tc) => tc.id)));
    }
  };

  const submitNewTC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTC.title.trim()) return;

    try {
      const payload: any = { ...newTC, lastRun: "Never", projectId: selectedProjectId || undefined, suite: selectedSuite || newTC.suite };
      if (payload.planId === "") delete payload.planId;
      await fetch("http://localhost:3001/api/testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setIsTCModalOpen(false);
      setNewTC({ title: "", priority: "Med", type: "Manual", status: "DRAFT", suite: "", planId: "" });
      fetchData();
    } catch (error) {
      console.error("Error creating record:", error);
    }
  };

  const submitNewProj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProj.name.trim()) return;

    try {
      // Create with default Module and Suite mapped from user requests
      await fetch("http://localhost:3001/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProj.name, modules: [{ name: "Core Features", suites: ["Suite B", "Suite C"] }] })
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

  const deleteModule = async (e: React.MouseEvent, projId: string, modIndex: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this module?")) {
        try {
            const proj = projects.find(p => p.id === projId);
            if (!proj) return;
            const updatedModules = proj.modules.filter((_, idx) => idx !== modIndex);
            
            await fetch(`http://localhost:3001/api/projects/${projId}`, { 
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ ...proj, modules: updatedModules })
            });
            fetchData();
        } catch (error) {
            console.error("Error deleting module:", error);
        }
    }
  };

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
        try {
            await fetch(`http://localhost:3001/api/projects/${id}`, { method: "DELETE" });
            fetchData();
            if (selectedProjectId === id) {
               setSelectedProjectId(null);
               setSelectedSuite(null);
               setSelectedSuitesFilter(null);
               setSelectedViewName(null);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    }
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
    setSelectedSuite(null); // Clear selected single suite 
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

  // Derive filtered table data
  const filteredTestCases = testCases.filter(tc => {
    const matchPriority = filterPriority === "All" || tc.priority === filterPriority;
    const matchType = filterType === "All" || tc.type === filterType;
    const matchSuite = selectedSuitesFilter ? (tc.suite && selectedSuitesFilter.includes(tc.suite)) : true;
    return matchPriority && matchType && matchSuite;
  });

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
          <button 
            onClick={() => setIsTCModalOpen(true)} 
            className="gradient-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Test Case
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden px-8 pb-8 gap-6">
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
                    <div onClick={() => toggleNode(proj.id)} className="flex items-center justify-between px-3 py-2 text-primary font-bold text-sm bg-primary/5 rounded-lg cursor-pointer border border-primary/10 hover:bg-primary/10 transition-colors">
                      <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-lg">{expandedNodes.has(proj.id) ? 'expand_more' : 'chevron_right'}</span>
                         <span className="material-symbols-outlined text-lg">deployed_code</span>
                         {proj.name}
                      </div>
                      <span onClick={(e) => deleteProject(e, proj.id)} className="material-symbols-outlined text-[18px] text-error opacity-70 hover:opacity-100 hover:scale-110 transition-transform">delete</span>
                    </div>
                    
                    {expandedNodes.has(proj.id) && proj.modules && proj.modules.map((mod, idx) => {
                      const modNodeId = `${proj.id}_mod_${idx}`;
                      return (
                        <div key={idx} className="ml-6 mt-1 space-y-1">
                          <div onClick={() => { toggleNode(modNodeId); selectModule(mod.name, mod.suites, proj.id); }} className="flex items-center justify-between px-3 py-2 text-on-surface-variant font-semibold text-sm hover:bg-surface-container rounded-lg cursor-pointer transition-colors group">
                            <div className="flex items-center gap-2">
                               <span className="material-symbols-outlined text-lg">{expandedNodes.has(modNodeId) ? 'expand_more' : 'chevron_right'}</span>
                               <span className="material-symbols-outlined text-lg text-secondary">folder_open</span>
                               {mod.name}
                            </div>
                            <span onClick={(e) => deleteModule(e, proj.id, idx)} className="material-symbols-outlined text-[16px] text-error opacity-0 group-hover:opacity-100 hover:scale-110 transition-all">delete</span>
                          </div>
                          
                          {expandedNodes.has(modNodeId) && mod.suites && mod.suites.map(suite => (
                            <div key={suite} className="ml-6 space-y-1 border-l-2 border-outline-variant/30 pl-2 mt-1">
                              <div 
                                 onClick={() => selectSuite(suite, proj.id)}
                                 className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${selectedSuite === suite ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container'}`}
                              >
                                <span className="material-symbols-outlined text-lg">{selectedSuite === suite ? 'folder_open' : 'folder'}</span>
                                {suite}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-surface border-b border-outline-variant flex justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">filter_list</span>
              
              <div className="flex gap-2">
                 <select 
                    value={filterPriority} 
                    onChange={e => setFilterPriority(e.target.value)} 
                    className="bg-surface-container-low border border-outline-variant text-[11px] font-bold text-on-surface-variant rounded py-1 px-2 cursor-pointer outline-none hover:bg-surface-container transition-colors"
                 >
                    <option value="All">All Priorities</option>
                    <option value="High">Priority: High</option>
                    <option value="Med">Priority: Med</option>
                    <option value="Low">Priority: Low</option>
                 </select>

                 <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)} 
                    className="bg-surface-container-low border border-outline-variant text-[11px] font-bold text-on-surface-variant rounded py-1 px-2 cursor-pointer outline-none hover:bg-surface-container transition-colors"
                 >
                    <option value="All">All Types</option>
                    <option value="Automated">Type: Automated</option>
                    <option value="Manual">Type: Manual</option>
                 </select>
              </div>

               {(filterType !== "All" || filterPriority !== "All") && (
                 <button className="text-[10px] text-error font-bold hover:underline" onClick={() => {setFilterPriority("All"); setFilterType("All");}}>Clear Refinements</button>
               )}
            </div>
          </div>

          <div className="flex-1 overflow-auto no-scrollbar relative min-h-[400px]">
             {loading ? (
                <div className="flex items-center justify-center h-full w-full opacity-50"><p>Loading framework datastores...</p></div>
             ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant sticky top-0 z-10">
                      <th className="px-6 py-4 w-12 cursor-pointer" onClick={toggleAll}>
                        <input className="rounded border border-outline-variant bg-surface text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer pt-1" type="checkbox" checked={filteredTestCases.length > 0 && selectedIds.size === filteredTestCases.length} onChange={() => {}} />
                      </th>
                      <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                      <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Title</th>
                      <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Priority</th>
                      <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                      <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                      <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Last Run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredTestCases.map((tc) => (
                      <tr key={tc.id} className="hover:bg-primary/5 transition-colors group cursor-pointer" onClick={() => toggleSelection(tc.id)}>
                        <td className="px-6 py-5">
                            <input 
                              className="rounded border border-outline-variant bg-surface text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer" 
                              type="checkbox" 
                              checked={selectedIds.has(tc.id)}
                              onChange={() => toggleSelection(tc.id)} 
                            />
                        </td>
                        <td className="px-4 py-5 text-xs font-bold text-primary">{tc.id.substring(0, 8)}</td>
                        <td className="px-4 py-5 text-sm font-semibold text-on-surface">{tc.title}</td>
                        <td className="px-4 py-5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${tc.priority === 'High' ? 'bg-error text-white shadow-sm shadow-error/20' : 'bg-primary/10 text-primary'}`}>
                            {tc.priority}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px] text-secondary">{tc.type === 'Automated' ? 'precision_manufacturing' : 'person'}</span>
                            {tc.type}
                          </div>
                        </td>
                        <td className="px-4 py-5"><span className="bg-secondary/10 border border-secondary/20 text-secondary px-2.5 py-1 rounded text-[10px] font-extrabold uppercase">{tc.status}</span></td>
                        <td className="px-4 py-5 text-xs text-on-surface-variant font-medium">{tc.lastRun}</td>
                      </tr>
                    ))}
                    {filteredTestCases.length === 0 && (
                      <tr className="bg-surface-container-low/50">
                        <td colSpan={7} className="text-center py-24">
                           <div className="flex flex-col items-center justify-center">
                              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">folder_open</span>
                              <p className="text-on-surface-variant font-bold text-lg mb-2">Empty Suite</p>
                              <p className="text-sm text-on-surface-variant/70 mb-6">No test cases are currently assigned to {selectedViewName || 'this view'}.</p>
                              <button onClick={() => setIsTCModalOpen(true)} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg transition-colors text-sm">
                                  + Create Test Case
                              </button>
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

       {/* Test Case Creation Modal OVERLAY */}
       {isTCModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
           <form onSubmit={submitNewTC} className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-8 border border-outline-variant">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-headline text-on-surface">Create New Test Case</h3>
                <span onClick={() => setIsTCModalOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1 transition-colors">close</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Test Title</label>
                  <input autoFocus required value={newTC.title} onChange={e => setNewTC({...newTC, title: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition shadow-sm" placeholder="e.g. JWT Token Refresh Validation" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Priority</label>
                    <select value={newTC.priority} onChange={e => setNewTC({...newTC, priority: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                      <option>High</option><option>Med</option><option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Type</label>
                    <select value={newTC.type} onChange={e => setNewTC({...newTC, type: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                      <option>Automated</option><option>Manual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Initial Status</label>
                    <select value={newTC.status} onChange={e => setNewTC({...newTC, status: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                      <option>DRAFT</option><option>READY</option><option>BLOCKED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Mapped Suite</label>
                    <input disabled value={selectedSuite || (selectedViewName ? "Cannot map directly to Module" : "None")} className="w-full bg-surface-container border border-outline-variant px-4 py-2.5 rounded-lg text-sm text-on-surface-variant focus:outline-none cursor-not-allowed italic" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1 uppercase tracking-wider">Assign to Test Plan</label>
                  <select value={newTC.planId} onChange={e => setNewTC({...newTC, planId: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                    <option value="">No Plan (Unassigned)</option>
                    {testPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-on-surface-variant mt-1 font-medium">Optionally assign this test case to an existing test plan for tracking.</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsTCModalOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition">Save Test Case</button>
              </div>
           </form>
         </div>
       )}

       {/* Project Creation Modal OVERLAY */}
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
                  <input autoFocus required value={newProj.name} onChange={e => setNewProj({...newProj, name: e.target.value})} className="w-full bg-surface-container border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition" placeholder="e.g. Project Beta" />
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
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
           <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-8 border border-outline-variant">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold font-headline text-on-surface">Bulk Import Test Cases</h3>
                  <p className="text-xs font-medium text-on-surface-variant mt-1">Upload records via CSV or Excel mapping.</p>
                </div>
                <span onClick={() => setIsImportModalOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-surface-container rounded-full p-1 transition-colors">close</span>
              </div>
              
              <div className="mt-4 border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface-container transition-colors group relative cursor-pointer">
                 <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                 />
                 <span className="material-symbols-outlined text-4xl text-primary bg-primary/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">upload_file</span>
                 <p className="text-sm font-bold text-on-surface text-center">Drag and drop your file here</p>
                 <p className="text-[11px] font-semibold text-on-surface-variant text-center mt-1">Supports EXCEL, CSV files up to 20MB</p>
              </div>

              {selectedFile && (
                 <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">description</span>
                    <div className="flex-1 overflow-hidden">
                       <p className="text-xs font-bold text-on-surface truncate">{selectedFile.name}</p>
                       <p className="text-[10px] text-on-surface-variant">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <span onClick={() => setSelectedFile(null)} className="material-symbols-outlined text-sm text-error cursor-pointer">delete</span>
                 </div>
              )}

              <div className="mt-8 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsImportModalOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
                 <button disabled={!selectedFile} onClick={() => setIsImportModalOpen(false)} className="bg-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">Run Import</button>
              </div>
           </div>
         </div>
       )}

       {/* Generate logic AI Modal */}
       {isAIModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm px-4">
           <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-8 border border-primary/30 relative">
              <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded uppercase text-primary text-[10px] font-extrabold tracking-widest mb-3 border border-primary/20">
                     <span className="material-symbols-outlined text-xs">auto_awesome</span> Powered By Sovereign AI
                  </div>
                  <h3 className="text-xl font-bold font-headline text-on-surface">Generate from BRD</h3>
                  <p className="text-xs font-medium text-on-surface-variant mt-1">Upload requirement documents. AI will scan logic gaps and draft isolated test suites automatically.</p>
                </div>
                <span onClick={() => setIsAIModalOpen(false)} className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-error bg-white rounded-full p-1 transition-colors border border-outline-variant shadow-sm">close</span>
              </div>
              
              <div className="mt-4 border-2 border-dashed border-primary/30 rounded-xl p-10 flex flex-col items-center justify-center bg-white hover:bg-primary/5 transition-colors group relative cursor-pointer z-10">
                 <input 
                    type="file" 
                    accept=".pdf, .docx, .txt"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                 />
                 <span className="material-symbols-outlined text-5xl text-primary drop-shadow mb-3 group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
                 <p className="text-sm font-bold text-on-surface text-center">Drop your BRD or Requirements file</p>
                 <p className="text-[11px] font-semibold text-on-surface-variant text-center mt-1">Supports PDF, DOCX, TXT</p>
              </div>

              {selectedFile && (
                 <div className="mt-4 p-3 bg-white border border-outline-variant rounded-lg flex items-center gap-3 relative z-10 shadow-sm">
                    <span className="material-symbols-outlined text-primary">description</span>
                    <div className="flex-1 overflow-hidden">
                       <p className="text-xs font-bold text-on-surface truncate">{selectedFile.name}</p>
                       <p className="text-[10px] text-on-surface-variant">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <span onClick={() => setSelectedFile(null)} className="material-symbols-outlined text-sm text-error cursor-pointer">delete</span>
                 </div>
              )}

              <div className="mt-8 flex justify-end gap-3 relative z-10">
                 <button type="button" onClick={() => setIsAIModalOpen(false)} className="font-bold text-sm text-on-surface-variant hover:text-on-surface px-4 py-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-outline-variant">Cancel</button>
                 <button disabled={!selectedFile} onClick={() => setIsAIModalOpen(false)} className="gradient-primary text-white font-bold text-sm px-6 py-2 rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                     <span className="material-symbols-outlined text-[16px]">auto_awesome</span> Scan & Generate
                 </button>
              </div>
           </div>
         </div>
       )}
    </div>
  );
}
