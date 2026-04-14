export default function QualityReports() {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto w-full">
      <div className="p-8 max-w-[1600px] mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8">
          <nav className="flex items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-primary mr-3">ANALYTICS</span>
            <div className="h-[1px] w-6 bg-outline-variant/20 mr-3"></div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-outline">Q4 PERFORMANCE REPORT</span>
          </nav>
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Reports & Analytics</h2>
              <p className="text-on-surface-variant mt-1 text-sm">Comprehensive quality metrics for the Alpha Release Cycle</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 text-sm font-semibold border border-outline-variant/20 rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filter Data
              </button>
              <button className="px-4 py-2 text-sm font-bold gradient-primary text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar Report Types */}
          <div className="col-span-1 md:col-span-3 flex flex-col gap-4">
            <div className="bg-surface-container-low p-5 rounded-3xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">Report Library</h3>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-white shadow-sm flex items-center gap-3 border border-primary/10 cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-lg">summarize</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">Summary Report</p>
                    <p className="text-[10px] text-on-surface-variant">Daily execution snapshot</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-lg">lan</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Traceability Report</p>
                    <p className="text-[10px] text-on-surface-variant">Requirement coverage map</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-lg">play_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Execution Report</p>
                    <p className="text-[10px] text-on-surface-variant">Run-by-run detailed logs</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error">
                    <span className="material-symbols-outlined text-lg">bug_report</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Defect Trend</p>
                    <p className="text-[10px] text-on-surface-variant">Resolution velocity</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Insight */}
            <div className="gradient-primary p-6 rounded-3xl text-white overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Live Update</p>
                <h4 className="text-xl font-bold font-headline mb-4">Quality Threshold</h4>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-extrabold tracking-tighter">94.2%</span>
                  <span className="text-blue-200 font-bold text-sm mb-1">+2.4%</span>
                </div>
                <p className="text-xs text-white opacity-90 leading-relaxed">System-wide stability has improved significantly in the last 24 hours following the patch deployment.</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/20 rounded-full opacity-20 group-hover:scale-110 transition-transform"></div>
            </div>
          </div>

          {/* Main Analytics Area */}
          <div className="col-span-1 md:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI Widgets */}
            <div className="bg-surface p-6 rounded-3xl shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">timer</span>
                </div>
                <span className="text-[10px] font-bold text-secondary flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">trending_down</span> 12%
                </span>
              </div>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-1">Execution Time</p>
              <h3 className="text-2xl font-extrabold tracking-tight">142h <span className="text-sm font-normal text-outline">32m</span></h3>
            </div>
            
            <div className="bg-surface p-6 rounded-3xl shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow border-l-4 border-error">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-xl">density_medium</span>
                </div>
                <span className="text-[10px] font-bold text-error flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span> 0.8%
                </span>
              </div>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-1">Defect Density</p>
              <h3 className="text-2xl font-extrabold tracking-tight">2.4 <span className="text-sm font-normal text-outline">per KLOC</span></h3>
            </div>
            
            <div className="bg-surface p-6 rounded-3xl shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow border-l-4 border-secondary">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-xl">attach_money</span>
                </div>
                <span className="text-[10px] font-bold text-secondary flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span> HIGH
                </span>
              </div>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-1">Automation ROI</p>
              <h3 className="text-2xl font-extrabold tracking-tight">$42.8k <span className="text-sm font-normal text-outline">saved</span></h3>
            </div>

            {/* Line Chart: Execution Trends */}
            <div className="md:col-span-2 bg-surface p-8 rounded-3xl shadow-sm border border-outline-variant/30">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface">Execution Trends over Time</h4>
                <div className="flex gap-4 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> SUCCESS</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error"></span> FAILED</div>
                </div>
              </div>
              <div className="relative h-56 flex items-end justify-between px-2">
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
                  <line className="text-outline/20" stroke="currentColor" strokeWidth="0.5" x1="0" x2="400" y1="20" y2="20"></line>
                  <line className="text-outline/20" stroke="currentColor" strokeWidth="0.5" x1="0" x2="400" y1="50" y2="50"></line>
                  <line className="text-outline/20" stroke="currentColor" strokeWidth="0.5" x1="0" x2="400" y1="80" y2="80"></line>
                  <path d="M0 80 Q 50 60, 100 70 T 200 30 T 300 40 T 400 10" fill="none" stroke="#005bb0" strokeWidth="2.5"></path>
                  <path d="M0 95 Q 80 85, 150 90 T 250 80 T 350 85 T 400 75" fill="none" stroke="#b31b25" strokeDasharray="4 2" strokeWidth="2.5"></path>
                </svg>
                <div className="flex flex-col items-center gap-2 z-10"><div className="h-1 text-[9px] text-outline font-bold">MON</div></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="h-1 text-[9px] text-outline font-bold">TUE</div></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="h-1 text-[9px] text-outline font-bold">WED</div></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="h-1 text-[9px] text-outline font-bold">THU</div></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="h-1 text-[9px] text-outline font-bold">FRI</div></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="h-1 text-[9px] text-outline font-bold">SAT</div></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="h-1 text-[9px] text-outline font-bold">SUN</div></div>
              </div>
            </div>

            {/* Test Module Distribution (Vertical Bento) */}
            <div className="bg-surface p-6 rounded-3xl shadow-sm border border-outline-variant/30 flex flex-col">
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface mb-6">Execution Breakdown</h4>
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="text-surface-container-low" cx="18" cy="18" fill="none" r="15.9" stroke="currentColor" strokeWidth="3"></circle>
                    <circle className="text-primary" cx="18" cy="18" fill="none" r="15.9" stroke="currentColor" strokeDasharray="75 100" strokeWidth="3"></circle>
                    <circle className="text-secondary" cx="18" cy="18" fill="none" r="15.9" stroke="currentColor" strokeDasharray="15 100" strokeDashoffset="-75" strokeWidth="3"></circle>
                    <circle className="text-error" cx="18" cy="18" fill="none" r="15.9" stroke="currentColor" strokeDasharray="10 100" strokeDashoffset="-90" strokeWidth="3"></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold leading-none">1,204</span>
                    <span className="text-[8px] text-outline uppercase font-bold">TOTAL</span>
                  </div>
                </div>
                <div className="mt-6 w-full space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Automated</span>
                    <span>75%</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Manual</span>
                    <span>15%</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-error rounded-full"></span> Skipped</span>
                    <span>10%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked Bar Chart: Test Status by Module */}
            <div className="md:col-span-3 bg-surface p-8 rounded-3xl shadow-sm border border-outline-variant/30">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface">Test Status by Module</h4>
                  <p className="text-[10px] text-outline mt-0.5">Top performing vs critical fail zones</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-surface-container border border-outline-variant/30 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-surface-container-high transition">
                    MODULE: ALL <span className="material-symbols-outlined text-[12px]">expand_more</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-on-surface">Core Auth Module</span>
                    <span className="text-[10px] font-bold text-outline">98% PASS</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: "92%" }}></div>
                    <div className="h-full bg-tertiary" style={{ width: "6%" }}></div>
                    <div className="h-full bg-error" style={{ width: "2%" }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-on-surface">Payment Gateway</span>
                    <span className="text-[10px] font-bold text-outline">82% PASS</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: "82%" }}></div>
                    <div className="h-full bg-tertiary" style={{ width: "5%" }}></div>
                    <div className="h-full bg-error" style={{ width: "13%" }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-on-surface">Data Visualization</span>
                    <span className="text-[10px] font-bold text-outline">65% PASS</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: "65%" }}></div>
                    <div className="h-full bg-tertiary" style={{ width: "20%" }}></div>
                    <div className="h-full bg-error" style={{ width: "15%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Analysis Notes */}
        <div className="mt-12 p-8 bg-surface-container-low rounded-3xl border border-outline-variant/30 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
           <div className="flex items-start gap-6 relative z-10">
             <div className="p-3 bg-secondary/10 rounded-xl">
               <span className="material-symbols-outlined text-secondary">lightbulb</span>
             </div>
             <div>
               <h5 className="text-sm font-bold text-on-surface mb-3">Automated Insights & Recommendations</h5>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <p className="text-xs text-on-surface-variant leading-relaxed">
                   <strong className="text-on-surface font-semibold">Velocity Increase:</strong> Automation ROI has surged by 18% following the implementation of the new CI/CD runners. Recommended to transition manual sanity suites to automated scripts to further decrease execution time by an estimated 12 hours/week.
                 </p>
                 <p className="text-xs text-on-surface-variant leading-relaxed">
                   <strong className="text-on-surface font-semibold">Defect Density Alert:</strong> The <span className="text-error font-bold">Data Visualization</span> module is exhibiting a defect density 3x higher than the system average. Engineering review suggested for code complexity and unit test coverage in the D3.js implementation layer.
                 </p>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
