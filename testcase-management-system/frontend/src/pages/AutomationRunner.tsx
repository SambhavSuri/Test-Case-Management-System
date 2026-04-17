import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface TestFile {
  filename: string;
  displayName: string;
  testCount: number;
  tests: string[];
}

interface TestPlan {
  id: string;
  name: string;
}

interface ProjectData {
  id: string;
  name: string;
}

interface AutoResult {
  test_id: string;
  test_name: string;
  page: string;
  status: string;
  steps: string;
  expected: string;
  actual: string;
  duration: number;
  timestamp: string;
  snapshot: string;
  remarks: string;
}

export default function AutomationRunner() {
  const navigate = useNavigate();
  const terminalRef = useRef<HTMLDivElement>(null);

  // Data
  const [testFiles, setTestFiles] = useState<TestFile[]>([]);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  // Config — selection can be whole files or individual tests (file.py::test_name)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [planId, setPlanId] = useState("");
  const [projectId, setProjectId] = useState("");

  // Running
  const [isRunning, setIsRunning] = useState(false);
  const [outputLines, setOutputLines] = useState<{ type: string; text: string }[]>([]);
  const [progress, setProgress] = useState({ passed: 0, failed: 0, skipped: 0, errors: 0, total: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  // Results
  const [results, setResults] = useState<AutoResult[] | null>(null);
  const [liveResults, setLiveResults] = useState<AutoResult[]>([]);
  const [importedRunId, setImportedRunId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Resume
  const [interruptedInfo, setInterruptedInfo] = useState<{
    interrupted: boolean; completedCount: number; totalCount: number;
    passed: number; failed: number; skipped: number; errors: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [filesRes, plansRes, projRes] = await Promise.all([
          fetch("http://localhost:3001/api/automation/test-files"),
          fetch("http://localhost:3001/api/testplans"),
          fetch("http://localhost:3001/api/projects"),
        ]);
        if (filesRes.ok) setTestFiles(await filesRes.json());
        if (plansRes.ok) setPlans(await plansRes.json());
        if (projRes.ok) {
          const p = await projRes.json();
          setProjects(p);
          // Auto-select the first project with "Automated" in name, or first project
          const auto = p.find((pr: ProjectData) => pr.name.toLowerCase().includes("automat"));
          setProjectId(auto?.id || p[0]?.id || "");
        }
      } catch { }
      setLoading(false);

      // Check if there's an active or completed run to restore
      try {
        const statusRes = await fetch("http://localhost:3001/api/automation/status");
        if (statusRes.ok) {
          const state = await statusRes.json();
          if (state.isRunning) {
            // Reconnect to the active run
            setIsRunning(true);
            setOutputLines(state.outputLines || []);
            setProgress(state.progress || { passed: 0, failed: 0, skipped: 0, errors: 0, total: 0 });
            setLiveResults(state.liveResults || []);
            const es = new EventSource("http://localhost:3001/api/automation/reconnect");
            eventSourceRef.current = es;
            es.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.type === "output") setOutputLines(prev => [...prev.slice(-2000), { type: "output", text: data.line }]);
                else if (data.type === "error") setOutputLines(prev => [...prev.slice(-2000), { type: "error", text: data.line }]);
                else if (data.type === "status") setOutputLines(prev => [...prev, { type: "status", text: data.message }]);
                else if (data.type === "progress") setProgress(data);
                else if (data.type === "result") {
                  setLiveResults(prev => {
                    const existing = new Set(prev.map(r => r.test_name));
                    const newOnes = (data.results as AutoResult[]).filter(r => !existing.has(r.test_name));
                    return [...prev, ...newOnes];
                  });
                }
                else if (data.type === "complete") {
                  setResults(data.results || []);
                  setLiveResults([]);
                  setProgress({ passed: data.passed, failed: data.failed, skipped: data.skipped, errors: data.errors, total: data.passed + data.failed + data.skipped + data.errors });
                  if (data.runId) setImportedRunId(data.runId);
                  setIsRunning(false);
                  es.close();
                }
              } catch { }
            };
            es.onerror = () => { es.close(); };
          } else if (state.results && state.results.length > 0) {
            // Completed run — restore results view
            setResults(state.results);
            setProgress(state.progress);
            setOutputLines(state.outputLines || []);
            if (state.runId) setImportedRunId(state.runId);
          }
        }
      } catch { }

      // Check for interrupted run (per-worker JSONs still on disk)
      try {
        const intRes = await fetch("http://localhost:3001/api/automation/interrupted-status");
        if (intRes.ok) {
          const info = await intRes.json();
          if (info.interrupted) setInterruptedInfo(info);
        }
      } catch { }
    };
    fetchData();
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [outputLines]);

  const toggleFile = (filename: string) => {
    const next = new Set(selectedFiles);
    const file = testFiles.find(f => f.filename === filename);
    if (next.has(filename)) {
      // Deselect file and all its individual tests
      next.delete(filename);
      file?.tests.forEach(t => next.delete(`${filename}::${t}`));
    } else {
      // Select the whole file (remove any individual test selections for this file)
      file?.tests.forEach(t => next.delete(`${filename}::${t}`));
      next.add(filename);
    }
    setSelectedFiles(next);
  };

  const toggleTest = (filename: string, testName: string) => {
    const next = new Set(selectedFiles);
    const key = `${filename}::${testName}`;
    // If the whole file is selected, switch to individual tests
    if (next.has(filename)) {
      const file = testFiles.find(f => f.filename === filename);
      next.delete(filename);
      file?.tests.forEach(t => { if (t !== testName) next.add(`${filename}::${t}`); });
    } else if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      // If all tests in the file are now selected, collapse to file-level
      const file = testFiles.find(f => f.filename === filename);
      if (file && file.tests.every(t => next.has(`${filename}::${t}`))) {
        file.tests.forEach(t => next.delete(`${filename}::${t}`));
        next.add(filename);
      }
    }
    setSelectedFiles(next);
  };

  const isFileFullySelected = (filename: string) => {
    return selectedFiles.has(filename);
  };

  const isFilePartiallySelected = (filename: string) => {
    if (selectedFiles.has(filename)) return false;
    const file = testFiles.find(f => f.filename === filename);
    return file?.tests.some(t => selectedFiles.has(`${filename}::${t}`)) || false;
  };

  const isTestSelected = (filename: string, testName: string) => {
    return selectedFiles.has(filename) || selectedFiles.has(`${filename}::${testName}`);
  };

  const toggleExpand = (filename: string) => {
    const next = new Set(expandedFiles);
    if (next.has(filename)) next.delete(filename); else next.add(filename);
    setExpandedFiles(next);
  };

  const getSelectedTestCount = () => {
    let count = 0;
    for (const s of selectedFiles) {
      if (s.includes("::")) { count++; }
      else { const f = testFiles.find(tf => tf.filename === s); count += f?.testCount || 0; }
    }
    return count;
  };

  const selectAll = () => setSelectedFiles(new Set(testFiles.map(f => f.filename)));
  const deselectAll = () => setSelectedFiles(new Set());
  const selectTrial = () => setSelectedFiles(new Set(testFiles.slice(0, 3).map(f => f.filename)));

  const startRun = () => {
    setIsRunning(true);
    setOutputLines([]);
    setProgress({ passed: 0, failed: 0, skipped: 0, errors: 0, total: 0 });
    setResults(null);
    setLiveResults([]);
    setImportedRunId(null);

    // Build files param — check if all files are selected
    const allFilesSelected = testFiles.every(f => selectedFiles.has(f.filename));
    const filesValue = allFilesSelected ? "all" : Array.from(selectedFiles).join(",");
    const params = new URLSearchParams({
      files: filesValue,
      ...(planId && { planId }),
    });

    const es = new EventSource(`http://localhost:3001/api/automation/run?${params}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "output") {
          setOutputLines(prev => [...prev.slice(-2000), { type: "output", text: data.line }]);
        } else if (data.type === "error") {
          setOutputLines(prev => [...prev.slice(-2000), { type: "error", text: data.line }]);
        } else if (data.type === "status") {
          setOutputLines(prev => [...prev, { type: "status", text: data.message }]);
        } else if (data.type === "progress") {
          setProgress(data);
        } else if (data.type === "result") {
          setLiveResults(prev => {
            const existing = new Set(prev.map(r => r.test_name));
            const newOnes = (data.results as AutoResult[]).filter(r => !existing.has(r.test_name));
            return [...prev, ...newOnes];
          });
        } else if (data.type === "complete") {
          setResults(data.results || []);
          setLiveResults([]);
          setProgress({ passed: data.passed, failed: data.failed, skipped: data.skipped, errors: data.errors, total: data.passed + data.failed + data.skipped + data.errors });
          if (data.runId) setImportedRunId(data.runId);
          setIsRunning(false);
          es.close();
        }
      } catch { }
    };

    es.onerror = () => {
      setIsRunning(false);
      es.close();
    };
  };

  const cancelRun = async () => {
    eventSourceRef.current?.close();
    try { await fetch("http://localhost:3001/api/automation/cancel", { method: "POST" }); } catch { }
    setIsRunning(false);
    setOutputLines(prev => [...prev, { type: "error", text: "Run cancelled by user." }]);
  };

  const startResume = () => {
    setIsRunning(true);
    setOutputLines([]);
    setResults(null);
    setLiveResults([]);
    setImportedRunId(null);
    setInterruptedInfo(null);
    // Pre-seed progress from interrupted info
    if (interruptedInfo) {
      setProgress({ passed: interruptedInfo.passed, failed: interruptedInfo.failed, skipped: interruptedInfo.skipped, errors: interruptedInfo.errors, total: interruptedInfo.completedCount });
    }

    const params = new URLSearchParams({ ...(planId && { planId }) });
    const es = new EventSource(`http://localhost:3001/api/automation/resume?${params}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "output") {
          setOutputLines(prev => [...prev.slice(-2000), { type: "output", text: data.line }]);
        } else if (data.type === "error") {
          setOutputLines(prev => [...prev.slice(-2000), { type: "error", text: data.line }]);
        } else if (data.type === "status") {
          setOutputLines(prev => [...prev, { type: "status", text: data.message }]);
        } else if (data.type === "progress") {
          setProgress(data);
        } else if (data.type === "result") {
          setLiveResults(prev => {
            const existing = new Set(prev.map(r => r.test_name));
            const newOnes = (data.results as AutoResult[]).filter(r => !existing.has(r.test_name));
            return [...prev, ...newOnes];
          });
        } else if (data.type === "complete") {
          setResults(data.results || []);
          setLiveResults([]);
          setProgress({ passed: data.passed, failed: data.failed, skipped: data.skipped, errors: data.errors, total: data.passed + data.failed + data.skipped + data.errors });
          if (data.runId) setImportedRunId(data.runId);
          setIsRunning(false);
          es.close();
        }
      } catch { }
    };

    es.onerror = () => {
      setIsRunning(false);
      es.close();
    };
  };

  const discardInterrupted = async () => {
    try {
      await fetch("http://localhost:3001/api/automation/clear-interrupted", { method: "POST" });
      await fetch("http://localhost:3001/api/automation/reset", { method: "POST" });
    } catch { }
    setInterruptedInfo(null);
  };

  // Import happens automatically on the backend when the run completes

  const resetAll = () => {
    setResults(null);
    setLiveResults([]);
    setImportedRunId(null);
    setOutputLines([]);
    setProgress({ passed: 0, failed: 0, skipped: 0, errors: 0, total: 0 });
    // Clear backend state
    fetch("http://localhost:3001/api/automation/reset", { method: "POST" }).catch(() => {});
  };

  const getLineColor = (line: string, type: string) => {
    if (type === "error") return "text-red-400";
    if (type === "status") return "text-blue-400";
    if (line.includes("PASSED")) return "text-green-400";
    if (line.includes("FAILED") || line.includes("FAIL")) return "text-red-400";
    if (line.includes("SKIPPED") || line.includes("SKIP")) return "text-yellow-400";
    if (line.includes("ERROR")) return "text-red-500";
    return "text-slate-300";
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-on-surface-variant">Loading...</p></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background">
      <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div>
          <nav className="flex items-center gap-3 text-on-surface-variant mb-2">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Automation</span>
            <div className="h-[1px] w-8 bg-outline-variant/20"></div>
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-outline">Run Tests</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Run Automation</h2>
              <p className="text-sm text-on-surface-variant mt-1">Execute Playwright test suite and import results into TCMS</p>
            </div>
            {isRunning && (
              <button onClick={cancelRun} className="bg-error/10 border border-error/20 text-error px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-error/20 active:scale-95 transition flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">stop</span> Cancel Run
              </button>
            )}
          </div>
        </div>

        {/* Progress bar (visible when running or complete) */}
        {(isRunning || results) && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm text-center">
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Total</p>
              <p className="text-2xl font-extrabold font-headline mt-1">{progress.total}</p>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-secondary/30 shadow-sm text-center">
              <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Passed</p>
              <p className="text-2xl font-extrabold font-headline text-secondary mt-1">{progress.passed}</p>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-error/30 shadow-sm text-center">
              <p className="text-[9px] font-bold text-error uppercase tracking-widest">Failed</p>
              <p className="text-2xl font-extrabold font-headline text-error mt-1">{progress.failed}</p>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Skipped</p>
              <p className="text-2xl font-extrabold font-headline text-slate-400 mt-1">{progress.skipped}</p>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm text-center">
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Pass Rate</p>
              <p className="text-2xl font-extrabold font-headline mt-1">{progress.total > 0 ? Math.round((progress.passed / progress.total) * 100) : 0}%</p>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Left: Config / Terminal */}
          <div className="flex-1 space-y-4">

            {/* Interrupted run banner */}
            {!isRunning && !results && interruptedInfo?.interrupted && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl shadow-sm px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-[24px]">warning</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Interrupted run detected</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {interruptedInfo.completedCount} / {interruptedInfo.totalCount} tests completed
                      <span className="mx-1.5">—</span>
                      <span className="text-green-700">{interruptedInfo.passed} passed</span>
                      <span className="mx-1">/</span>
                      <span className="text-red-700">{interruptedInfo.failed} failed</span>
                      <span className="mx-1">/</span>
                      <span className="text-slate-600">{interruptedInfo.skipped} skipped</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={startResume}
                    className="bg-amber-600 text-white font-bold text-sm px-5 py-2 rounded-lg hover:bg-amber-700 active:scale-95 transition flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    Resume ({interruptedInfo.totalCount - interruptedInfo.completedCount} remaining)
                  </button>
                  <button
                    onClick={discardInterrupted}
                    className="bg-surface border border-outline-variant text-on-surface-variant font-bold text-sm px-4 py-2 rounded-lg hover:bg-surface-container-high active:scale-95 transition"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Config section (when not running and no results) */}
            {!isRunning && !results && (
              <>
                {/* Test file selector */}
                <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">folder_open</span>
                      Select Test Files
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-white">{selectedFiles.size}</span>
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={selectTrial} className="text-[10px] font-bold text-primary hover:underline">Trial (3)</button>
                      <button onClick={selectAll} className="text-[10px] font-bold text-primary hover:underline">All</button>
                      <button onClick={deselectAll} className="text-[10px] font-bold text-on-surface-variant hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    {testFiles.map(f => (
                      <div key={f.filename}>
                        {/* File row */}
                        <div className="flex items-center gap-3 px-6 py-3 hover:bg-primary/5 transition-colors border-b border-outline-variant/10">
                          <input
                            type="checkbox"
                            checked={isFileFullySelected(f.filename)}
                            ref={el => { if (el) el.indeterminate = isFilePartiallySelected(f.filename); }}
                            onChange={() => toggleFile(f.filename)}
                            className="rounded border border-outline-variant bg-surface text-primary w-4 h-4 cursor-pointer"
                          />
                          <button onClick={() => toggleExpand(f.filename)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                            <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform ${expandedFiles.has(f.filename) ? "rotate-90" : ""}`}>chevron_right</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-on-surface">{f.displayName}</p>
                              <p className="text-[10px] text-on-surface-variant font-mono">{f.filename} — {f.testCount} tests</p>
                            </div>
                          </button>
                        </div>
                        {/* Individual tests */}
                        {expandedFiles.has(f.filename) && (
                          <div className="bg-surface-container-low/50">
                            {f.tests.map(t => (
                              <label key={t} className="flex items-center gap-3 pl-14 pr-6 py-2 hover:bg-primary/5 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isTestSelected(f.filename, t)}
                                  onChange={() => toggleTest(f.filename, t)}
                                  className="rounded border border-outline-variant bg-surface text-primary w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="text-xs font-mono text-on-surface-variant">{t}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Run config */}
                <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-on-surface-variant mb-1.5 uppercase tracking-wider">Link to Test Plan (optional)</label>
                    <select value={planId} onChange={e => setPlanId(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:outline-none cursor-pointer shadow-sm">
                      <option value="">No Plan</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <p className="text-[10px] text-on-surface-variant mt-1.5 font-medium">Results will be stored in "Automated Tests" project automatically.</p>
                  </div>
                  <button
                    onClick={startRun}
                    disabled={selectedFiles.size === 0}
                    className="w-full gradient-primary text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                    Start Automation Run ({getSelectedTestCount()} test{getSelectedTestCount() !== 1 ? "s" : ""})
                  </button>
                </div>
              </>
            )}

            {/* Terminal output (when running or has output) */}
            {(isRunning || outputLines.length > 0) && (
              <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 ml-2">pytest output</span>
                  </div>
                  {isRunning && <span className="text-[10px] font-bold text-green-400 animate-pulse flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span>Running</span>}
                </div>
                <div ref={terminalRef} className="p-4 font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto">
                  {outputLines.map((line, i) => (
                    <div key={i} className={getLineColor(line.text, line.type)}>{line.text}</div>
                  ))}
                  {isRunning && <div className="text-green-400 animate-pulse mt-1">▌</div>}
                </div>
              </div>
            )}

            {/* Results table (live during execution OR after completion) */}
            {((results && results.length > 0) || (isRunning && liveResults.length > 0)) && (
              <div className="space-y-4">
                {/* Actions — only after completion */}
                {results && !isRunning && (
                  <div className="flex gap-3 flex-wrap">
                    {importedRunId && (
                      <button
                        onClick={() => navigate(`/test-cases?runId=${importedRunId}`)}
                        className="bg-secondary text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:brightness-110 active:scale-95 transition flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                        View Test Run
                      </button>
                    )}
                    <button onClick={resetAll} className="bg-surface border border-outline-variant text-on-surface font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-surface-container-high transition flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">replay</span> Run Again
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const resp = await fetch("http://localhost:3001/api/automation/download-report?format=excel");
                          if (!resp.ok) { const err = await resp.json(); alert(err.error || "No Excel report available"); return; }
                          const blob = await resp.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a"); a.href = url;
                          a.download = resp.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "test_report.xlsx";
                          a.click(); URL.revokeObjectURL(url);
                        } catch { alert("Download failed."); }
                      }}
                      className="bg-surface border border-outline-variant text-on-surface font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-surface-container-high transition flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span> Download Excel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const resp = await fetch("http://localhost:3001/api/automation/download-report?format=csv");
                          if (!resp.ok) { const err = await resp.json(); alert(err.error || "No results available"); return; }
                          const blob = await resp.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a"); a.href = url;
                          a.download = resp.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "test_report.csv";
                          a.click(); URL.revokeObjectURL(url);
                        } catch { alert("Download failed."); }
                      }}
                      className="bg-surface border border-outline-variant text-on-surface font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-surface-container-high transition flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span> Download CSV
                    </button>
                  </div>
                )}

                {importedRunId && !isRunning && (
                  <div className="bg-secondary/10 border border-secondary/30 rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-bold text-secondary">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Run created automatically. View it in Test Runs to review results and escalate issues.
                  </div>
                )}

                {/* Live indicator */}
                {isRunning && liveResults.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    Live Results ({liveResults.length} tests completed)
                  </div>
                )}

                {/* Results table */}
                <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-surface-container border-b border-outline-variant">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Test Name</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Page</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Duration</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {(results || liveResults).map((r, i) => (
                        <tr key={i} className="hover:bg-primary/5 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-primary font-mono">{r.test_id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-on-surface">{r.test_name}</td>
                          <td className="px-4 py-3 text-xs text-on-surface-variant">{r.page}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              r.status === "PASS" ? "bg-secondary/10 text-secondary" :
                              r.status === "FAIL" ? "bg-error/10 text-error" :
                              "bg-slate-100 text-slate-500"
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{r.duration}s</td>
                          <td className="px-4 py-3 text-xs text-error max-w-[200px] truncate">{r.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
