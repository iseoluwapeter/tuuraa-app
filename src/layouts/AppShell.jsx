import { Outlet } from "react-router-dom";
import BottomTabBar from "../components/nav/BottomTabBar";
// import TopBar from "../components/nav/TopBar";

export default function AppShell() {
  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-50 overflow-hidden">
      {/* <TopBar /> */}
      <main className="flex-1 overflow-y-auto overscroll-none">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
