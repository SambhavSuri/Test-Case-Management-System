import { Outlet } from "react-router-dom";
import SideNavBar from "./SideNavBar";
import TopNavBar from "./TopNavBar";

export default function Layout() {
  return (
    <div className="bg-background text-on-surface selection:bg-primary/20 selection:text-primary flex min-h-screen">
      <SideNavBar />
      <div className="pl-64 flex flex-col flex-1 min-w-0">
        <TopNavBar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
