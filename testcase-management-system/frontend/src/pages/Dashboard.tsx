import { useState, useEffect } from "react";

interface TestCase {
  id: string;
  title: string;
  priority: string;
  type: string;
  status: string;
  lastRun: string;
  projectId?: string;
}

interface ProjectData {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("All Projects");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tcRes, projRes] = await Promise.all([
          fetch("http://localhost:3001/api/testcases"),
          fetch("http://localhost:3001/api/projects")
        ]);
        if (tcRes.ok) setTestCases(await tcRes.json());
        if (projRes.ok) setProjects(await projRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const feedTestCases = selectedProject === "All Projects" 
      ? testCases 
      : testCases.filter(tc => tc.projectId === selectedProject);

  const totalTestCases = feedTestCases.length;
  const autoTests = feedTestCases.filter(t => t.type === "Automated").length;
  const manualTests = totalTestCases - autoTests;
  const autoCoverage = totalTestCases === 0 ? 0 : Math.round((autoTests / totalTestCases) * 100 * 10) / 10;
  
  const passTests = feedTestCases.filter(t => t.status === "PASSED" || t.status === "READY").length; // Include READY as pass for visual demo
  const passRate = totalTestCases === 0 ? 0 : Math.round((passTests / totalTestCases) * 100 * 10) / 10;
  
  const activeDefects = feedTestCases.filter(t => t.status === "FAILED" || t.status === "BLOCKED").length;

  return (
    <div className="flex-1 overflow-y-auto relative w-full h-full">
      <section className="p-8 space-y-8 pb-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Executive Overview</h2>
            <p className="text-on-surface-variant mt-1 font-medium">Real-time quality intelligence for the Enterprise Ecosystem.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 bg-surface-container rounded-lg p-1 border border-outline-variant">
              <select className="bg-transparent border-none text-[11px] font-bold text-on-surface-variant focus:ring-0 cursor-pointer py-1.5 px-3 outline-none hover:bg-white transition-colors rounded">
                <option>Last 7 Days</option>
                <option defaultValue="true">Last 30 Days</option>
                <option>Last 90 Days</option>
              </select>
              <div className="w-px h-4 bg-outline-variant my-auto"></div>
              <select 
                 value={selectedProject} 
                 onChange={(e) => setSelectedProject(e.target.value)}
                 className="bg-transparent border-none text-[11px] font-bold text-on-surface-variant focus:ring-0 cursor-pointer py-1.5 px-3 outline-none hover:bg-white transition-colors rounded"
              >
                <option value="All Projects">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button className="bg-surface border border-outline-variant px-4 py-2 rounded-lg font-bold text-xs text-on-surface hover:bg-surface-container-high transition-all flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">settings_input_component</span> Customize View
            </button>
            <button className="gradient-primary text-white px-5 py-2 rounded-lg font-bold text-xs shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">add</span> Create New Run
            </button>
          </div>
        </div>
        
        {loading ? (
             <div className="py-20 text-center text-on-surface-variant opacity-50 font-bold">Synchronizing telemetry data...</div>
        ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface border border-outline-variant p-6 rounded-xl transition-all hover:shadow-xl hover:border-primary/30 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-8 -mt-8"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">layers</span>
                    </div>
                    <span className="text-secondary font-bold text-xs flex items-center gap-1 bg-secondary/10 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span> +12%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider relative z-10">Total Test Cases</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-on-surface relative z-10">{totalTestCases.toLocaleString()}</h3>
                </div>

                <div className="bg-surface border border-outline-variant p-6 rounded-xl transition-all hover:shadow-xl hover:border-secondary/30 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-bl-full -mr-8 -mt-8"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-secondary/10 rounded-lg text-secondary">
                      <span className="material-symbols-outlined">precision_manufacturing</span>
                    </div>
                    <span className="text-secondary font-bold text-xs flex items-center gap-1 bg-secondary/10 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span> +3.4%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider relative z-10">Automation Coverage</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-on-surface relative z-10">{autoCoverage}%</h3>
                </div>

                <div className="bg-surface border border-outline-variant p-6 rounded-xl transition-all hover:shadow-xl hover:border-tertiary/30 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/5 rounded-bl-full -mr-8 -mt-8"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-tertiary/10 rounded-lg text-tertiary">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <span className="text-error font-bold text-xs flex items-center gap-1 bg-error/10 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[14px]">trending_down</span> -0.8%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider relative z-10">Overall Pass Rate</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-on-surface relative z-10">{passRate}%</h3>
                </div>

                <div className="bg-surface border border-outline-variant p-6 rounded-xl transition-all hover:shadow-xl hover:border-error/30 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-error/5 rounded-bl-full -mr-8 -mt-8"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-error/10 rounded-lg text-error">
                      <span className="material-symbols-outlined">bug_report</span>
                    </div>
                    <span className="bg-error font-extrabold text-white px-2 py-0.5 rounded text-[10px] tracking-widest shadow-sm shadow-error/20">CRITICAL</span>
                  </div>
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider relative z-10">Active Defects</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-error relative z-10">{activeDefects.toLocaleString()}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-outline-variant p-8 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h4 className="text-lg font-bold text-on-surface">Execution Trends</h4>
                      <p className="text-xs text-on-surface-variant">Daily pass vs fail analysis</p>
                    </div>
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary shadow shadow-primary/20"></span> Pass</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary shadow shadow-secondary/20"></span> Fail</span>
                    </div>
                  </div>
                  
                  <div className="h-64 flex items-end justify-between gap-4 relative pt-4">
                    <div className="absolute inset-0 flex flex-col justify-between opacity-40 pointer-events-none">
                      <div className="border-t border-dashed border-outline-variant w-full"></div>
                      <div className="border-t border-dashed border-outline-variant w-full"></div>
                      <div className="border-t border-dashed border-outline-variant w-full"></div>
                      <div className="border-t border-dashed border-outline-variant w-full"></div>
                    </div>
                    
                    {[
                      {hP: 32, hF: 4, day: "SUN"},
                      {hP: 40, hF: 2, day: "MON"},
                      {hP: 36, hF: 8, day: "TUE"},
                      {hP: 28, hF: 12, day: "WED"},
                      {hP: 44, hF: 3, day: "THU"},
                      {hP: 38, hF: 6, day: "FRI"},
                      {hP: 24, hF: 2, day: "SAT"}
                    ].map((col, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                        <div className="w-full max-w-[40px] flex flex-col gap-0.5 group-hover:scale-105 transition-transform">
                          <div className={`w-full bg-primary rounded-t-sm hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgba(0,95,184,0.15)] h-${col.hP}`}></div>
                          <div className={`w-full bg-secondary rounded-b-sm hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgba(0,183,195,0.15)] h-${col.hF}`}></div>
                        </div>
                        <span className="text-[10px] font-extrabold text-on-surface-variant tracking-wider mt-2">{col.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-outline-variant p-8 rounded-xl flex flex-col shadow-sm">
                  <h4 className="text-lg font-bold text-on-surface mb-8">Methodology Split</h4>
                  <div className="flex-1 flex flex-col items-center justify-center relative group">
                    <div className="w-44 h-44 rounded-full border-[14px] border-surface-container-high relative flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
                        <circle className="text-primary" cx="50" cy="50" fill="transparent" r="43" stroke="currentColor" strokeDasharray={`${autoCoverage === 0 ? 0 : 270 * (autoCoverage/100)} 270`} strokeWidth="14" strokeLinecap="round"></circle>
                      </svg>
                      <div className="text-center">
                        <span className="text-3xl font-black block text-on-surface font-headline">{autoCoverage}%</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary drop-shadow-sm">Automated</span>
                      </div>
                    </div>
                    <div className="mt-10 grid grid-cols-2 gap-8 w-full border-t border-outline-variant pt-6">
                      <div className="space-y-1 text-center group-hover:-translate-y-1 transition-transform">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Automated</span>
                        <span className="block text-xl font-black text-primary font-headline">{autoTests.toLocaleString()}</span>
                      </div>
                      <div className="space-y-1 text-center border-l border-outline-variant group-hover:-translate-y-1 transition-transform">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Manual</span>
                        <span className="block text-xl font-black text-on-surface font-headline">{manualTests.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                <div className="bg-white border border-outline-variant p-8 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-bold text-on-surface">Recent Activities</h4>
                    <span className="text-primary font-bold text-xs uppercase tracking-wider hover:underline cursor-pointer">View All</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-3.5 rounded-lg border border-transparent hover:border-outline-variant hover:bg-slate-50 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-on-surface">Regression Suite: Payment Gateway</p>
                        <p className="text-[11px] font-medium text-on-surface-variant mt-0.5">Triggered by <span className="font-bold text-secondary">Jenkins CI</span> • 12 mins ago</p>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded bg-secondary/10 text-secondary tracking-widest border border-secondary/20">PASSED</span>
                    </div>

                    <div className="flex items-center gap-4 p-3.5 rounded-lg border border-transparent hover:border-outline-variant hover:bg-slate-50 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-on-surface">Sanity Check: User Profile API</p>
                        <p className="text-[11px] font-medium text-on-surface-variant mt-0.5">Triggered by <span className="font-bold text-primary">Sarah Connor</span> • 45 mins ago</p>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded bg-error/10 text-error tracking-widest border border-error/20">FAILED</span>
                    </div>

                    <div className="flex items-center gap-4 p-3.5 rounded-lg border border-transparent hover:border-outline-variant hover:bg-slate-50 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                        <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-on-surface">Stress Test: Load Balancer Node A</p>
                        <p className="text-[11px] font-medium text-on-surface-variant mt-0.5">In Progress... • 1 hour ago</p>
                      </div>
                      <div className="flex gap-1.5 px-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,95,184,0.8)] delay-75"></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-outline-variant p-8 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-bold text-on-surface">Top Failing Suites</h4>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-3 py-1.5 rounded">Last 30 Days</span>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2 group cursor-pointer">
                      <div className="flex justify-between text-xs font-bold transition-transform group-hover:-translate-y-0.5">
                        <span className="text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-sm text-outline-variant">folder</span> Auth Module - Core</span>
                        <span className="text-error bg-error/10 px-2 rounded-sm border border-error/20">24 Failures</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-error rounded-full opacity-90 shadow-[0_0_8px_rgba(209,52,56,0.6)]" style={{width: '85%'}}></div>
                      </div>
                    </div>

                    <div className="space-y-2 group cursor-pointer">
                      <div className="flex justify-between text-xs font-bold transition-transform group-hover:-translate-y-0.5">
                        <span className="text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-sm text-outline-variant">folder</span> Analytics Webhooks</span>
                        <span className="text-error bg-error/10 px-2 rounded-sm border border-error/20">18 Failures</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-error rounded-full opacity-70" style={{width: '65%'}}></div>
                      </div>
                    </div>

                    <div className="space-y-2 group cursor-pointer">
                      <div className="flex justify-between text-xs font-bold transition-transform group-hover:-translate-y-0.5">
                        <span className="text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-sm text-outline-variant">folder</span> Search Indexing Service</span>
                        <span className="text-error bg-error/10 px-2 rounded-sm border border-error/20">12 Failures</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-error rounded-full opacity-50" style={{width: '45%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
        )}
      </section>

      {/* Ribbon */}
      <div className="fixed bottom-6 right-8 left-[calc(16rem+2rem)] z-30 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl px-8 py-4 flex justify-between items-center shadow-2xl border border-white max-w-4xl mx-auto pointer-events-auto hover:bg-white/95 transition-colors">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(0,183,195,0.8)]"></span>
              <span className="text-sm font-bold text-on-surface tracking-tight">12 Runner Nodes Active</span>
            </div>
            <div className="h-6 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300"></div>
                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[11px] font-extrabold text-primary shadow-sm z-10">+4</div>
              </div>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest hidden md:inline-block">QA Team Online</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="p-2.5 text-primary bg-primary/5 hover:bg-primary/20 rounded-xl transition-all shadow-sm">
              <span className="material-symbols-outlined">terminal</span>
            </button>
            <button className="gradient-primary text-white px-6 py-2.5 rounded-xl text-[11px] tracking-widest font-extrabold flex items-center gap-2 shadow-xl hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95">
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              QUICK SCAN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
