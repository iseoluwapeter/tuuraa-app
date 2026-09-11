import { useEffect, useState, useCallback } from "react";

/**
 * Hook to manage the PWA install prompt.
 *
 * Usage:
 *   const { canInstall, promptInstall, isIOS, isInstalled } = useInstallPrompt();
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect iOS Safari (which has no beforeinstallprompt support)
  const isIOS =
    typeof window !== "undefined" &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !window.navigator.standalone;

  useEffect(() => {
    // Already running as an installed PWA?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice; // { outcome: 'accepted' | 'dismissed' }

    setDeferredPrompt(null);
    setCanInstall(false);

    return choice;
  }, [deferredPrompt]);

  return { canInstall, promptInstall, isIOS, isInstalled };
}
