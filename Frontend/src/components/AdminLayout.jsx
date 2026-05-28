import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col">

      {/* TOPBAR */}
      <Topbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">

        {/* DESKTOP SIDEBAR */}
        <div className="hidden lg:block w-56 border-r">
          <Sidebar />
        </div>

        {/* MOBILE SIDEBAR */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">

            {/* overlay */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />

            {/* sidebar */}
            <div className="relative z-50 w-56 bg-white h-full">
              <Sidebar closeSidebar={() => setSidebarOpen(false)} />
            </div>

          </div>
        )}

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
};

export default AdminLayout;
