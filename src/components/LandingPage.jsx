import { Link } from "react-router-dom";
import { InstallButton } from "./Installbutton";
import { LoopVid } from "../assets";

/**
 * Landing page for app.tuuraalogistics.com
 *
 * - Entry point for ad / marketing traffic
 * - Login is a real link (<a href="/login">) via react-router's <Link>
 * - Install button surfaces without requiring login first.
 * - Background: hero delivery photo under an emerald gradient overlay
 *   so foreground text stays legible.
 */
export function LandingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#239751] font-sans">
      <img
        src={LoopVid}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F3D2E]/85 via-[#0F3D2E]/70 to-[#0F3D2E]/92" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center text-[#F5F3EE]">
        <img
          src="/icon-512.png"
          alt="Tuuraa"
          className="mb-6 h-[88px] w-[88px] rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        />

        <h1 className="mb-2 text-3xl font-bold tracking-tight">Tuuraa</h1>
        <p className="mb-8 max-w-[300px] text-[15px] leading-relaxed text-[#F5F3EE]/75">
          Managed last-mile logistics for your business.
        </p>

        <div className="flex w-full max-w-[280px] flex-col gap-3">
          <Link
            to="/login"
            className="block rounded-lg bg-[#F5F3EE] px-4 py-3 text-[15px] font-bold text-[#0F3D2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#F5F3EE]"
          >
            Get Started
          </Link>

          {/* Renders nothing if install isn't available */}
          <InstallButton />
        </div>
      </div>
    </div>
  );
}
