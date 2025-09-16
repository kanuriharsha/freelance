import React, { useCallback, useEffect, useState, Suspense, lazy } from "react";
import GameBlock from "./components/GameBlock";
import "./App.css";

// Lazy load heavy pages so the main menu stays fast
const SnakePage = lazy(() => import("./pages/SnakePage"));
const Game2048 = lazy(() => import("./pages/Game2048"));
const FlamingoPage = lazy(() => import("./pages/FlamingoPage"));
const ShootPage = lazy(() => import("./pages/ShootPage"));

export default function App() {
  const [activeGame, setActiveGame] = useState(null); // "snake" | "2048" | "flamingo" | "shoot" | null
  const [totalScore, setTotalScore] = useState(0);

  const games = [
    { id: "snake", title: "🐍 Snake", subtitle: "Swipe to steer" },
    { id: "2048", title: "🔢 2048", subtitle: "Swipe to merge" },
    { id: "flamingo", title: "🦩 Flamingo", subtitle: "Tap to flap" },
    { id: "shoot", title: "🎯 Shoot", subtitle: "Rotate to aim" },

    // Future game placeholders — mark comingSoon: true
    { id: "coming-1", title: "+ More", subtitle: "Games coming soon", comingSoon: true },
  ];

  // Callback a game page can call to add to the aggregated total score
  const handleScore = useCallback((points) => {
    setTotalScore((prev) => prev + Number(points || 0));
  }, []);

  // Close active game (and attempt to exit fullscreen safely)
  const closeActiveGame = useCallback(() => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const fn =
          document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.msExitFullscreen;
        if (fn) fn.call(document);
      }
    } catch {
      // ignore errors (some browsers throw if not active)
    } finally {
      setActiveGame(null);
    }
  }, []);

  // Pressing Escape closes the active game (UX convenience)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && activeGame) {
        closeActiveGame();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGame, closeActiveGame]);

  return (
    <div className="app-shell">
      <div
        className="mobile-frame"
        role="application"
        aria-label="Pocket Fun Zone"
      >
        <header className="top-bar">
          <div className="app-left">
            <div className="app-badge">PA</div>
            <div className="app-name">Pocket Arcade</div>
          </div>
          <div className="score-pill" aria-live="polite">Score {totalScore}</div>
        </header>

        <main className="tiles-area" aria-live="polite">
          {games.map((g) => (
            <GameBlock
              key={g.id}
              id={g.id}
              title={g.title}
              subtitle={g.subtitle}
              comingSoon={!!g.comingSoon}
              onClick={() => {
                if (g.comingSoon) return;
                setActiveGame(g.id);
              }}
            />
          ))}
        </main>

        <footer className="app-footer">
          Made for pocket • tap a tile to play
        </footer>
      </div>

      {/* Fullscreen overlays (lazy-loaded). Suspense fallback shows a spinner */}
      <Suspense
        fallback={
          <div className="overlay-loading" aria-hidden>
            <div className="spinner" />
          </div>
        }
      >
        {activeGame === "snake" && (
          <SnakePage onExit={closeActiveGame} onScore={handleScore} />
        )}

        {activeGame === "2048" && (
          <Game2048 onExit={closeActiveGame} onScore={handleScore} />
        )}

        {activeGame === "flamingo" && (
          <FlamingoPage onExit={closeActiveGame} onScore={handleScore} />
        )}

        {activeGame === "shoot" && (
          <ShootPage onExit={closeActiveGame} onScore={handleScore} />
        )}
      </Suspense>
    </div>
  );
}
