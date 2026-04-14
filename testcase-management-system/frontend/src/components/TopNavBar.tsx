import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  suite?: string;
  projectId?: string;
  owner?: string;
}

export default function TopNavBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allCases, setAllCases] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch all test cases once on mount for local search
  useEffect(() => {
    fetch("http://localhost:3001/api/testcases")
      .then(res => res.json())
      .then(data => setAllCases(data))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Search as user types
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    const q = query.toLowerCase();
    const matched = allCases.filter(tc =>
      tc.title.toLowerCase().includes(q) ||
      tc.id.toLowerCase().includes(q) ||
      (tc.suite && tc.suite.toLowerCase().includes(q)) ||
      (tc.owner && tc.owner.toLowerCase().includes(q)) ||
      (tc.status && tc.status.toLowerCase().includes(q))
    ).slice(0, 8);
    setResults(matched);
    setIsOpen(true);
    setLoading(false);
  }, [query, allCases]);

  const handleSelect = (tc: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    const params = new URLSearchParams();
    if (tc.suite) params.set("suite", tc.suite);
    if (tc.projectId) params.set("projectId", tc.projectId);
    params.set("tcId", tc.id);
    navigate(`/projects?${params.toString()}`);
  };

  const statusColor = (s: string) => {
    const u = s.toUpperCase();
    if (u === "PASSED") return "bg-secondary/10 text-secondary";
    if (u === "FAILED") return "bg-error/10 text-error";
    return "bg-surface-container text-on-surface-variant";
  };

  const priorityColor = (p: string) => {
    if (p === "Critical" || p === "High") return "bg-error text-white";
    if (p === "Medium") return "bg-tertiary/10 text-tertiary";
    return "bg-slate-100 text-slate-500";
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none flex items-center justify-between px-6 h-16">
      <div className="flex items-center gap-8">
        <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">JumpIQ TCMS</div>
        <nav className="hidden md:flex gap-6 h-full items-center">
          <Link to="/" className="text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1 font-headline font-medium text-sm tracking-wide">Dashboard</Link>
          <Link to="/projects" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-headline font-medium text-sm tracking-wide transition-colors duration-200">Projects</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {/* Global Search */}
        <div className="relative" ref={wrapperRef}>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">search</span>
          <input
            className="bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-2 text-xs w-72 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none focus:w-96"
            placeholder="Search test cases..."
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (query.trim() && results.length > 0) setIsOpen(true); }}
          />

          {/* Results dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-2 w-[460px] bg-surface border border-outline-variant rounded-xl shadow-2xl overflow-hidden z-[200]">
              {loading ? (
                <div className="px-4 py-6 text-center text-xs text-on-surface-variant">Searching...</div>
              ) : results.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/20">
                    {results.length} result{results.length !== 1 ? "s" : ""} found
                  </div>
                  {results.map(tc => (
                    <div
                      key={tc.id}
                      onClick={() => handleSelect(tc)}
                      className="px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors border-b border-outline-variant/10 last:border-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-primary">{tc.id.substring(0, 12)}</span>
                            {tc.suite && (
                              <span className="text-[9px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">folder</span>
                                {tc.suite}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-on-surface truncate">{tc.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {tc.owner && <span className="text-[10px] text-on-surface-variant">{tc.owner}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${statusColor(tc.status)}`}>{tc.status}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${priorityColor(tc.priority)}`}>{tc.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => { navigate("/projects"); setIsOpen(false); setQuery(""); }}
                    className="px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    View all in Projects →
                  </div>
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-outline-variant mb-2">search_off</span>
                  <p className="text-xs text-on-surface-variant font-bold">No results for "{query}"</p>
                  <p className="text-[10px] text-on-surface-variant/60 mt-0.5">Try searching by title, ID, suite, or owner</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-full transition-colors duration-200 active:scale-95 transition-transform">
          <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
        </button>
        <button className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-full transition-colors duration-200 active:scale-95 transition-transform">
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
        </button>
        <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shadow-sm cursor-pointer active:scale-95 transition-transform">
          <img alt="User profile avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANqm57gnKAtKr4igPlChHHwgX2xdGsNsQpiA3Utk234axCK5s6vZRpZMTvbU0GEGc2eA9WvUZDVNTN3JfFnErKgnf_njoFFEUUhyY1tZ7-2yrkN0dV_Hc4i1CPYWXknPgJe3iYs_qGx0DRmyEv6FIwG9Q8nBb5GWwQWOQG9tFheA-qX2w4bVS4NUpQRHZHFjLIE2SDPfECUjLMQTZ_cSKkHs7QX_Kj9uzDxzZhMA9qv1Ii7tXpoIC52qAeeESEx2CMtCYyxo7DEyS9" />
        </div>
      </div>
    </header>
  );
}
