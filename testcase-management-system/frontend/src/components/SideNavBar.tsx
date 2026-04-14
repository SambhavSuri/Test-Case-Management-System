import { Link, useLocation } from "react-router-dom";

export default function SideNavBar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-slate-50 dark:bg-slate-950 flex flex-col p-4 gap-2 pt-16 border-r border-outline-variant/30">
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center text-white shadow-lg">
          <span className="material-symbols-outlined" data-icon="architecture">architecture</span>
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">JumpIQ</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Enterprise QA</p>
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
        <Link to="/" className={`rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-200 ${path === '/' ? 'bg-white text-primary shadow-sm border border-outline-variant/30 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:translate-x-1'}`}>
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span className="font-['Inter'] font-medium text-sm">Dashboard</span>
        </Link>
        <Link to="/projects" className={`rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-200 ${path === '/projects' ? 'bg-white text-primary shadow-sm border border-outline-variant/30 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:translate-x-1'}`}>
          <span className="material-symbols-outlined" data-icon="folder_open">folder_open</span>
          <span className="font-['Inter'] font-medium text-sm">Projects</span>
        </Link>
        <Link to="/test-cases" className={`rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-200 ${path === '/test-cases' ? 'bg-white text-primary shadow-sm border border-outline-variant/30 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:translate-x-1'}`}>
          <span className="material-symbols-outlined" data-icon="play_circle">play_circle</span>
          <span className="font-['Inter'] font-medium text-sm">Test Runs</span>
        </Link>
        <Link to="/test-plans" className={`rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-200 ${path === '/test-plans' ? 'bg-white text-primary shadow-sm border border-outline-variant/30 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:translate-x-1'}`}>
          <span className="material-symbols-outlined" data-icon="assignment">assignment</span>
          <span className="font-['Inter'] font-medium text-sm">Test Plans</span>
        </Link>
        <Link to="/requirements" className={`rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-200 ${path === '/requirements' ? 'bg-white text-primary shadow-sm border border-outline-variant/30 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:translate-x-1'}`}>
          <span className="material-symbols-outlined" data-icon="description">description</span>
          <span className="font-['Inter'] font-medium text-sm">Requirements</span>
        </Link>
        <Link to="/reports" className={`rounded-lg flex items-center gap-3 px-4 py-3 transition-all duration-200 ${path === '/reports' ? 'bg-white text-primary shadow-sm border border-outline-variant/30 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 hover:translate-x-1'}`}>
          <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
          <span className="font-['Inter'] font-medium text-sm">Reports</span>
        </Link>
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-slate-200/50 pt-4">
        <button className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg flex items-center gap-3 px-4 py-3 hover:translate-x-1 transition-transform duration-200">
          <span className="material-symbols-outlined" data-icon="help_outline">help_outline</span>
          <span className="font-['Inter'] font-medium text-sm">Help</span>
        </button>
        <button className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg flex items-center gap-3 px-4 py-3 hover:translate-x-1 transition-transform duration-200">
          <span className="material-symbols-outlined" data-icon="logout">logout</span>
          <span className="font-['Inter'] font-medium text-sm">Logout</span>
        </button>
        <button className="mt-4 gradient-primary text-white py-3 rounded-lg font-bold text-sm shadow-md hover:brightness-105 active:opacity-80 transition-all">
            New Test Run
        </button>
      </div>
    </aside>
  );
}
