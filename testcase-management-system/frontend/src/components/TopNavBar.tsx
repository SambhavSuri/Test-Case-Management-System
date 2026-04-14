import { Link } from "react-router-dom";

export default function TopNavBar() {
  return (
    <header className="w-full sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none flex items-center justify-between px-6 h-16 w-full">
      <div className="flex items-center gap-8">
        <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">JumpIQ TCMS</div>
        <nav className="hidden md:flex gap-6 h-full items-center">
          <Link to="/" className="text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1 font-headline font-medium text-sm tracking-wide">Dashboard</Link>
          <Link to="/projects" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-headline font-medium text-sm tracking-wide transition-colors duration-200">Projects</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">search</span>
          <input className="bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-1.5 text-xs w-64 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none" placeholder="Global Search..." type="text" />
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
