import { Link } from "react-router-dom";
import { InstallButton } from "./Installbutton";

/**
 * Landing page for app.tuuraalogistics.com
 *
 * - Entry point for ad / marketing traffic
 * - Login is a real link (<a href="/login">), not a click handler —
 *   swap for react-router's <Link to="/login"> if you're using a router,
 *   same markup, just avoids a full page reload.
 * - Install button surfaces without requiring login first.
 * - Background: an animated dispatch-route network (paths + moving markers)
 *   under an emerald gradient overlay. Motion pauses automatically for
 *   people with prefers-reduced-motion set.
 */
export function LandingPage() {
  return (
    <div className="landing">
      <DispatchBackground />

      <div className="landing__content">
        <img src="/icon-512.png" alt="Tuuraa" className="landing__logo" />

        <h1 className="landing__title">Tuuraa</h1>
        <p className="landing__subtitle">
          Managed last-mile logistics for your business.
        </p>

        <div className="landing__actions">
          <Link to="/login" className="landing__login-btn">
            Log In
          </Link>

          {/* Renders nothing if install isn't available */}
          <InstallButton />
        </div>
      </div>

      <style>{`
        .landing {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #0F3D2E;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .landing__content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px;
          color: #F5F3EE;
        }

        .landing__logo {
          width: 88px;
          height: 88px;
          border-radius: 20px;
          margin-bottom: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        }

        .landing__title {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }

        .landing__subtitle {
          font-size: 15px;
          color: rgba(245, 243, 238, 0.75);
          margin: 0 0 32px;
          max-width: 300px;
          line-height: 1.5;
        }

        .landing__actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 280px;
        }

        .landing__login-btn {
          display: block;
          background: #F5F3EE;
          color: #0F3D2E;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .landing__login-btn:focus-visible {
          outline: 2px solid #F5F3EE;
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
}

/**
 * Animated background: a loose grid of delivery routes with small
 * dispatch markers gliding along them, under an emerald overlay
 * gradient so foreground text stays legible.
 */
function DispatchBackground() {
  const routes = [
    {
      d: "M -50 120 C 150 40, 300 200, 500 90 S 750 30, 900 140",
      duration: "14s",
      delay: "0s",
    },
    {
      d: "M -50 340 C 200 420, 350 260, 550 380 S 800 300, 900 400",
      duration: "17s",
      delay: "-4s",
    },
    {
      d: "M -50 560 C 180 520, 380 620, 560 540 S 780 620, 900 560",
      duration: "20s",
      delay: "-9s",
    },
    {
      d: "M -50 220 C 220 260, 400 120, 620 220 S 820 260, 900 200",
      duration: "16s",
      delay: "-2s",
    },
  ];

  return (
    <svg
      className="dispatch-bg"
      viewBox="0 0 900 640"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F3D2E" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#0F3D2E" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0A2A20" stopOpacity="0.92" />
        </linearGradient>
      </defs>

      {routes.map((route, i) => (
        <path
          key={i}
          id={`route-${i}`}
          d={route.d}
          fill="none"
          stroke="#2E6B52"
          strokeWidth="1.5"
          strokeDasharray="2 10"
          opacity="0.6"
        />
      ))}

      {routes.map((route, i) => (
        <circle key={`marker-${i}`} r="5" fill="#D9A441">
          <animateMotion
            dur={route.duration}
            begin={route.delay}
            repeatCount="indefinite"
            rotate="auto"
          >
            <mpath href={`#route-${i}`} />
          </animateMotion>
        </circle>
      ))}

      <rect x="0" y="0" width="900" height="640" fill="url(#overlay)" />

      <style>{`
        .dispatch-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .dispatch-bg animateMotion {
            animation-play-state: paused;
          }
        }
      `}</style>
    </svg>
  );
}
