import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiPackage, FiCreditCard, FiUser } from "react-icons/fi";
import { InstallButton } from "../Installbutton";

// Wire badgeCount from real state (e.g. pending/active deliveries count).
// Leave undefined/0 to hide the badge.
const tabs = [
  { to: "/home", label: "Home", icon: FiHome, end: true },
  { to: "/deliveries", label: "Deliveries", icon: FiPackage, badgeCount: 0 },
  // { to: "/wallet", label: "Wallet", icon: FiCreditCard },
  { to: "/account", label: "Account", icon: FiUser },
];

<InstallButton />;

const BottomTabBar = () => {
  return (
    <nav
      className="relative flex items-stretch justify-around bg-white border-t border-neutral-200
                 shadow-[0_-1px_6px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ to, label, icon: Icon, end, badgeCount }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-13
                     min-w-11 active:opacity-70 transition-opacity"
        >
          {({ isActive }) => (
            <>
              {/* active indicator bar */}
              <span
                className={`absolute top-0 h-0.75 w-8 rounded-full bg-amber-400 transition-opacity duration-150 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              <span className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 2}
                  className={isActive ? "text-emerald-800" : "text-neutral-400"}
                />
                {!!badgeCount && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500
                               text-white text-[10px] font-poppins font-semibold leading-4 text-center"
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>

              <span
                className={`font-poppins text-[11px] leading-none transition-colors ${
                  isActive ? "text-emerald-800 font-medium" : "text-neutral-400"
                }`}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomTabBar;
