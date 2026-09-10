import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const SPLASH_TIMING = {
  total: 5_000,
  exit: 220
};

export function SplashExperience({ onContinue }: { onContinue: () => void }) {
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setReady(true), reduced ? 120 : SPLASH_TIMING.total);
    // A suspended tab can pause CSS animation events. This timer guarantees
    // that the action is eventually available even if the animation is paused.
    return () => window.clearTimeout(timer);
  }, []);

  function continueToApp() {
    if (!ready || exiting) return;
    setExiting(true);
    window.setTimeout(onContinue, SPLASH_TIMING.exit);
  }

  return (
    <div className={`splash-experience${ready ? " is-ready" : ""}${exiting ? " is-exiting" : ""}`} role="dialog" aria-label="QeSuite" aria-modal="true">
      <div className="splash-awaken-rings" aria-hidden="true">
        <span />
        <span />
        <span />
        <i className="splash-center-pulse" />
      </div>
      <div className="splash-mid-scene" aria-hidden="true">
        <div className="splash-mid-corner">
          <span className="splash-mid-corner-orbit"><i /></span>
        </div>
        <div className="splash-mid-waves">
          <svg viewBox="0 0 1000 260" preserveAspectRatio="none">
            <path className="splash-mid-wave-line" d="M0 92 C150 16 280 24 438 119 C620 228 739 41 1000 72" />
            <path className="splash-mid-wave-one" d="M0 96 C168 80 281 46 463 131 C642 214 774 43 1000 69 L1000 260 L0 260 Z" />
            <path className="splash-mid-wave-two" d="M0 137 C154 107 292 119 469 183 C646 247 805 90 1000 121 L1000 260 L0 260 Z" />
            <path className="splash-mid-wave-three" d="M0 181 C175 143 308 180 487 224 C661 267 818 145 1000 132 L1000 260 L0 260 Z" />
          </svg>
        </div>
      </div>
      <div className="splash-brand-growth" aria-hidden="true" />
      <div className="splash-reveal-disc" aria-hidden="true" />
      <div className="splash-brand-ornament splash-brand-ornament-top" aria-hidden="true" />
      <div className="splash-brand-ornament splash-brand-ornament-bottom" aria-hidden="true" />
      <div className="splash-final-orbits" aria-hidden="true">
        <span className="splash-orbit splash-orbit-one"><i /></span>
        <span className="splash-orbit splash-orbit-two"><i /></span>
      </div>
      <div className="splash-brand-group">
        <div className="splash-logo-card">
          <img className="splash-logo" src="/icons/icon-512.png" alt="" />
        </div>
        <div className="splash-wordmark">QeSuite</div>
        <div className="splash-slogan">Think Business</div>
      </div>
      <section className="splash-continue-panel" aria-label="Continue to QeSuite">
        <button className="splash-continue-button" type="button" onClick={continueToApp} disabled={!ready} aria-label="Continue to QeSuite">
          <span>Continue</span><Icon name="chevron" />
        </button>
      </section>
    </div>
  );
}
