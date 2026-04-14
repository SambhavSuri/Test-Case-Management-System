export default function TraceabilityMatrix() {
  return (
    <div className="flex-1 overflow-y-auto w-full relative">
      <section className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-2">
              <span>Requirements</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Traceability Matrix (RTM)</span>
            </nav>
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight leading-tight">Requirements & Traceability</h2>
            <p className="text-on-surface-variant mt-2 max-w-2xl font-medium">Ensure 100% test coverage by mapping business requirements to your QA suite. Use AI to identify gaps in your current testing logic.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-outline-variant text-on-surface font-semibold rounded-lg transition-all hover:bg-surface-container-low active:scale-[0.98]">
              <span className="material-symbols-outlined text-xl">upload_file</span>
              <span>Upload BRD</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white font-bold rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
              <span>AI: Suggest Scenarios</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-outline-variant relative overflow-hidden group hover:shadow-xl hover:border-primary/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-8 -mt-8"></div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 relative z-10">Total Requirements</p>
            <h3 className="text-3xl font-extrabold text-on-surface relative z-10">148</h3>
            <div className="flex items-center gap-2 mt-4 relative z-10">
              <div className="h-1.5 flex-1 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-outline-variant relative overflow-hidden group hover:shadow-xl hover:border-secondary/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full -mr-8 -mt-8"></div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 relative z-10">Fully Covered</p>
            <h3 className="text-3xl font-extrabold text-secondary relative z-10">112</h3>
            <div className="flex items-center gap-2 mt-4 text-xs font-bold text-secondary relative z-10">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>+12% from last sprint</span>
            </div>
          </div>
          
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-outline-variant relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-8 -mt-8"></div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 relative z-10">Partial Coverage</p>
            <h3 className="text-3xl font-extrabold text-primary relative z-10">24</h3>
            <div className="flex items-center gap-2 mt-4 text-xs font-bold text-primary relative z-10">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>Action required for 8</span>
            </div>
          </div>
          
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-outline-variant relative overflow-hidden group hover:shadow-xl hover:border-error/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-error/10 rounded-bl-full -mr-8 -mt-8"></div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 relative z-10">Uncovered</p>
            <h3 className="text-3xl font-extrabold text-error relative z-10">12</h3>
            <div className="flex items-center gap-2 mt-4 text-xs font-bold text-error relative z-10">
              <span className="material-symbols-outlined text-sm">emergency</span>
              <span>Critical risk detected</span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-surface-container-low flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="px-4 py-1.5 bg-white rounded-md text-xs font-bold text-primary shadow-sm border border-outline-variant/50">All Requirements</span>
              <span className="px-4 py-1.5 hover:bg-white/50 rounded-md text-xs font-semibold text-on-surface-variant cursor-pointer transition-all">Functional</span>
              <span className="px-4 py-1.5 hover:bg-white/50 rounded-md text-xs font-semibold text-on-surface-variant cursor-pointer transition-all">Non-Functional</span>
              <span className="px-4 py-1.5 hover:bg-white/50 rounded-md text-xs font-semibold text-on-surface-variant cursor-pointer transition-all">API</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-white/50 rounded-lg transition-all text-on-surface-variant">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button className="p-2 hover:bg-white/50 rounded-lg transition-all text-on-surface-variant">
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-outline-variant">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Req ID</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Requirement Title</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Coverage Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Linked Test Cases</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Latest Result</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 relative">
                <tr className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 align-top">
                    <span className="font-mono text-sm font-bold text-primary">REQ-1042</span>
                  </td>
                  <td className="px-6 py-5 max-w-sm align-top">
                    <p className="font-bold text-on-surface leading-snug">User Multi-Factor Authentication</p>
                    <p className="text-xs text-on-surface-variant mt-1">System must support TOTP and SMS-based 2FA during initial login flow.</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary/10 text-secondary text-[10px] font-extrabold uppercase tracking-wider">
                      PASSED
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-wrap gap-2">
                       <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-bold text-primary">TC-AUTH-01</span>
                       <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-bold text-primary">TC-AUTH-02</span>
                       <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-bold text-primary">+2 more</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                      <span className="text-xs font-bold text-on-surface-variant">Passed (2h ago)</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center align-top">
                    <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-primary">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 align-top">
                    <span className="font-mono text-sm font-bold text-primary">REQ-1045</span>
                  </td>
                  <td className="px-6 py-5 max-w-sm align-top">
                    <p className="font-bold text-on-surface leading-snug">Real-time Dashboard Latency</p>
                    <p className="text-xs text-on-surface-variant mt-1">Metrics must refresh with less than 200ms latency for 10k concurrent users.</p>
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                      <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                      <span className="text-[10px] font-extrabold text-primary uppercase tracking-tighter">AI Suggestion: Performance Edge Case</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                      PARTIAL
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-bold text-primary">TC-PERF-09</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-error text-lg">error</span>
                      <span className="text-xs font-bold text-on-surface-variant">Failed (1d ago)</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center align-top">
                     <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-primary">
                       <span className="material-symbols-outlined">more_vert</span>
                     </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 align-top">
                    <span className="font-mono text-sm font-bold text-primary">REQ-1051</span>
                  </td>
                  <td className="px-6 py-5 max-w-sm align-top">
                    <p className="font-bold text-on-surface leading-snug">Legacy Data Migration Hook</p>
                    <p className="text-xs text-on-surface-variant mt-1">Interface for importing SQL-based legacy reports into the TCMS schema.</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-error/10 text-error text-[10px] font-extrabold uppercase tracking-wider">
                      UNCOVERED
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                     <button className="text-[11px] font-extrabold text-primary flex items-center gap-1 hover:underline">
                        <span className="material-symbols-outlined text-sm">add_circle</span> Link Test Case
                     </button>
                  </td>
                  <td className="px-6 py-5 align-top">
                     <span className="text-xs font-medium italic text-on-surface-variant">No runs yet</span>
                  </td>
                  <td className="px-6 py-5 text-center align-top">
                     <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-primary">
                        <span className="material-symbols-outlined">more_vert</span>
                     </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-surface border-t border-outline-variant flex items-center justify-between">
            <p className="text-xs text-on-surface-variant font-semibold">Showing <span className="font-bold text-on-surface">4</span> of <span className="font-bold text-on-surface">148</span> requirements</p>
            <div className="flex gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-surface border border-outline-variant text-on-surface-variant disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded gradient-primary text-white shadow-sm text-sm font-bold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-surface border border-outline-variant text-on-surface-variant text-sm font-bold hover:bg-slate-100 transition-colors">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-surface border border-outline-variant text-on-surface-variant text-sm font-bold hover:bg-slate-100 transition-colors">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-surface border border-outline-variant text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 p-8 rounded-2xl relative overflow-hidden border border-primary/20 bg-white shadow-lg">
           <div className="absolute inset-0 bg-primary opacity-[0.03]"></div>
           <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
             <div>
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-[10px] font-extrabold uppercase tracking-widest mb-4">
                 <span className="material-symbols-outlined text-sm">auto_awesome</span> Powered by AI
               </div>
               <h3 className="text-3xl font-extrabold text-on-surface leading-tight">AI-Driven Coverage Analysis</h3>
               <p className="text-on-surface-variant text-sm mt-4 font-medium leading-relaxed">Let our neural models scan your Business Requirement Documents (BRDs) and automatically map them to existing test steps or generate high-fidelity missing scenarios.</p>
               <div className="mt-8 flex gap-4">
                 <button className="px-6 py-3 gradient-primary text-white text-sm font-bold rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all">Run Deep Scan</button>
                 <button className="px-6 py-3 border border-outline-variant text-sm text-on-surface font-bold rounded-lg hover:bg-slate-50 transition-all">Review AI Insights</button>
               </div>
             </div>
             
             <div className="hidden md:block">
               <div className="relative">
                 <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-xl transform rotate-2">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-3 h-3 rounded-full bg-error"></div>
                     <div className="w-3 h-3 rounded-full bg-tertiary"></div>
                     <div className="w-3 h-3 rounded-full bg-secondary"></div>
                   </div>
                   <div className="space-y-3">
                     <div className="h-2 w-3/4 bg-slate-100 rounded-full"></div>
                     <div className="h-2 w-1/2 bg-slate-100 rounded-full"></div>
                     <div className="h-2 w-5/6 bg-slate-100 rounded-full"></div>
                     <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                       <p className="text-[10px] font-extrabold text-primary mb-2 uppercase tracking-wider">Detected Logic Gap</p>
                       <p className="text-[11px] text-on-surface-variant leading-tight font-medium">"Requirement REQ-1045 specifies concurrent user loads, but existing TC-PERF-09 only tests sequential execution. Recommend adding Stress Scenarios."</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-50">
        <button className="w-14 h-14 rounded-full gradient-primary text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative">
          <span className="material-symbols-outlined text-2xl">add</span>
          <div className="absolute right-full mr-4 px-3 py-1.5 bg-on-surface text-white text-[10px] font-bold rounded uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Quick Requirement
          </div>
        </button>
      </div>
    </div>
  );
}
