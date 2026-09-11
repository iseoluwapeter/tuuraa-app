import { useState } from "react";
import { useInstallPrompt } from "./Useinstallprompt";

export function InstallButton() {
  const { canInstall, promptInstall, isIOS, isInstalled } = useInstallPrompt();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (isInstalled) return null;

  // Android/Chrome/Edge: native prompt available
  if (canInstall) {
    return (
      <button
        onClick={promptInstall}
        style={{
          background: "#0F3D2E",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 16px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Install Tuuraa App
      </button>
    );
  }

  // iOS Safari: no beforeinstallprompt support, show manual instructions
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSHelp(true)}
          style={{
            background: "#0F3D2E",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Install Tuuraa App
        </button>

        {showIOSHelp && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowIOSHelp(false)}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "16px 16px 0 0",
                padding: 20,
                width: "100%",
                maxWidth: 480,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
                To install Tuuraa: tap the <strong>Share</strong> icon in
                Safari, then select{" "}
                <strong>&quot;Add to Home Screen&quot;</strong>.
              </p>
              <button
                onClick={() => setShowIOSHelp(false)}
                style={{
                  marginTop: 16,
                  background: "#0F3D2E",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // No install path available (already installed, unsupported browser, etc.)
  return null;
}
