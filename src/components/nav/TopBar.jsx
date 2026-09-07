import React from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiMenu, FiBell } from "react-icons/fi";

const TopBar = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  onMenuPress,
  notificationCount = 0,
  avatarInitials,
  onAvatarPress,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    navigate(-1);
  };

  return (
    <header
      className="relative z-10 flex items-center justify-between gap-3 bg-gray-50 px-4 border-b border-gray-100"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-14 flex-1 items-center gap-2 min-w-0">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                       text-gray-700 active:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <FiChevronLeft size={22} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onMenuPress}
            aria-label="Open menu"
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                       text-gray-700 active:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <FiMenu size={20} />
          </button>
        )}

        {title && (
          <div className="min-w-0">
            <p className="truncate font-poppins font-semibold text-[15px] text-gray-900 leading-tight">
              {title}
            </p>
            {subtitle && (
              <p className="truncate font-poppins text-[11px] text-gray-500 leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex h-14 items-center gap-3 shrink-0">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full
                     text-gray-700 active:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <FiBell size={20} />
          {notificationCount > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500
                         text-white text-[10px] font-poppins font-bold leading-4 text-center"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {avatarInitials && (
          <button
            type="button"
            onClick={onAvatarPress}
            aria-label="Account"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600
                       font-poppins text-xs font-bold text-white active:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {avatarInitials}
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
