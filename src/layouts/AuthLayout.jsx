import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
      <main className="flex-1 overflow-y-auto overscroll-none">
        <Outlet />
      </main>
    </div>
  );
}
