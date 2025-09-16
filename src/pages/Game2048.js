// src/pages/Game2048.js
import React, { useEffect, useRef, useState } from "react";
import "./Game2048.css";

const SIZE = 4;
const START_TILES = 2;
function uid() { return Math.random().toString(36).slice(2, 9); }
function cloneGrid(grid) { return grid.map(row => row.map(cell => (cell ? { ...cell } : null))); }
function emptyGrid() { return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null)); }
function spawnTile(grid) {
  const empties = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) empties.push([r, c]);
  if (empties.length === 0) return grid;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  grid[r][c] = { id: uid(), value, r, c, merged: false, from: null };
  return grid;
}

export default function Game2048({ onExit }) {
  const containerRef = useRef(null);
  const [grid, setGrid] = useState(() => {
    const g = emptyGrid();
    for (let i = 0; i < START_TILES; i++) spawnTile(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("2048_best") || 0));
  const [animKey, setAnimKey] = useState(0);
  const touchStart = useRef(null);
  const animTimeout = useRef(null);

  // ---------- Fullscreen safe helpers ----------
  async function safeRequestFullscreen(el) {
    if (!el) return;
    try {
      // Only request fullscreen if not already fullscreen
      if (!document.fullscreenElement && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (fn) {
          // call the appropriate function, await if returns a promise
          const res = fn.call(el);
          if (res && typeof res.then === "function") await res;
        }
      }
    } catch (err) {
      // don't throw — just log; some browsers deny fullscreen outside user gesture
      console.warn("Fullscreen request failed or was blocked:", err);
    }
  }

  async function safeExitFullscreen() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (fn) {
          const res = fn.call(document);
          if (res && typeof res.then === "function") await res;
        }
      }
    } catch (err) {
      // ignore errors here (Document not active etc.)
      console.warn("Exit fullscreen failed or not active:", err);
    }
  }

  // ---------- Movement & game logic (unchanged) ----------
  function hasMoves(g) {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const cell = g[r][c];
      if (!cell) return true;
      const right = c + 1 < SIZE ? g[r][c + 1] : null;
      const down = r + 1 < SIZE ? g[r + 1][c] : null;
      if ((right && right.value === cell.value) || (down && down.value === cell.value)) return true;
    }
    return false;
  }

  const moveLeft = (oldGrid) => {
    let moved = false;
    let gained = 0;
    const g = cloneGrid(oldGrid);
    for (let r = 0; r < SIZE; r++) {
      const row = g[r].filter(Boolean);
      const newRow = [];
      for (let i = 0; i < row.length; i++) {
        const cur = row[i];
        if (i + 1 < row.length && row[i + 1].value === cur.value) {
          const mergedValue = cur.value * 2;
          gained += mergedValue;
          newRow.push({
            id: uid(),
            value: mergedValue,
            r,
            c: newRow.length,
            merged: true,
            from: [cur.id, row[i + 1].id],
          });
          i++;
          moved = true;
        } else {
          newRow.push({ ...cur, r, c: newRow.length, merged: false, from: cur.id });
          if (cur.c !== newRow.length - 1) moved = true;
        }
      }
      for (let c = 0; c < SIZE; c++) g[r][c] = newRow[c] ? { ...newRow[c] } : null;
    }
    return { grid: g, moved, gained };
  };

  const rotateGridCW = (g) => {
    const ng = emptyGrid();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) ng[c][SIZE - 1 - r] = g[r][c] ? { ...g[r][c] } : null;
    return ng;
  };

  const doMove = (dir) => {
    let working = cloneGrid(grid);
    if (dir === "up") {
      working = rotateGridCW(working); working = rotateGridCW(working); working = rotateGridCW(working);
    } else if (dir === "right") {
      working = rotateGridCW(working); working = rotateGridCW(working);
    } else if (dir === "down") {
      working = rotateGridCW(working);
    }
    const { grid: after, moved, gained } = moveLeft(working);
    let final = after;
    if (dir === "up") final = rotateGridCW(final);
    else if (dir === "right") { final = rotateGridCW(final); final = rotateGridCW(final); }
    else if (dir === "down") { final = rotateGridCW(final); final = rotateGridCW(final); final = rotateGridCW(final); }

    if (!moved) return false;

    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (final[r][c]) final[r][c].merged = false;

    setGrid(final);
    setScore(s => {
      const ns = s + gained;
      if (ns > best) { setBest(ns); localStorage.setItem("2048_best", ns); }
      return ns;
    });

    setAnimKey(k => k + 1);
    if (animTimeout.current) clearTimeout(animTimeout.current);
    animTimeout.current = setTimeout(() => {
      setGrid(g => {
        const clone = cloneGrid(g);
        spawnTile(clone);
        return clone;
      });
    }, 120);

    return true;
  };

  // ---------- Keyboard & touch handlers ----------
  useEffect(() => {
    function onKey(e) {
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const dir = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
        doMove(dir);
      } else if (e.key === "Escape") {
        // safe exit and close
        safeExitFullscreen().finally(() => onExit?.());
      } else if (e.key === "r" || e.key === "R") {
        restart();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grid, best]);

  useEffect(() => {
    const elem = containerRef.current;
    if (!elem) return;
    function start(ev) {
      const t = ev.touches ? ev.touches[0] : ev;
      touchStart.current = { x: t.clientX, y: t.clientY };
      // On first real user gesture, request fullscreen safely
      safeRequestFullscreen(document.documentElement).catch(()=>{});
    }
    function end(ev) {
      if (!touchStart.current) return;
      const t = ev.changedTouches ? ev.changedTouches[0] : ev;
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const dirThreshold = 20;
      if (Math.max(absX, absY) < dirThreshold) {
        touchStart.current = null;
        return;
      }
      if (absX > absY) doMove(dx > 0 ? "right" : "left");
      else doMove(dy > 0 ? "down" : "up");
      touchStart.current = null;
    }
    elem.addEventListener("touchstart", start, { passive: true });
    elem.addEventListener("touchend", end, { passive: true });
    elem.addEventListener("mousedown", start);
    elem.addEventListener("mouseup", end);
    return () => {
      elem.removeEventListener("touchstart", start);
      elem.removeEventListener("touchend", end);
      elem.removeEventListener("mousedown", start);
      elem.removeEventListener("mouseup", end);
    };
  }, [grid]);

  function restart() {
    const g = emptyGrid();
    for (let i = 0; i < START_TILES; i++) spawnTile(g);
    setGrid(g); setScore(0); setAnimKey(k => k + 1);
  }

  // ---------- Game over detection ----------
  useEffect(() => {
    const anyEmpty = grid.some(row => row.some(cell => !cell));
    if (!anyEmpty && !hasMoves(grid)) {
      // no crash — overlay renders in JSX below
    }
  }, [grid]);

  // ---------- Exit handler (safe) ----------
  async function exit() {
    await safeExitFullscreen();
    onExit?.();
  }

  // ---------- Render tile nodes ----------
  const tileNodes = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const t = grid[r][c];
    if (!t) continue;
    tileNodes.push(
      <div key={t.id + "_" + animKey} className={`tile tile-v${t.value}`} style={{ transform: `translate(${c * 100}%, ${r * 100}%)` }} data-value={t.value}>
        <div className="tile-inner">{t.value}</div>
      </div>
    );
  }
  const isGameOver = !grid.some(row => row.some(cell => !cell)) && !hasMoves(grid);

  return (
    <div className="g2048-overlay">
      <div className="g2048-topbar">
        <button className="g-back" onClick={exit}>✕</button>
        <div className="g-title">2048</div>
        <div className="g-stats">
          <div className="g-score">Score<br/><strong>{score}</strong></div>
          <div className="g-best">Best<br/><strong>{best}</strong></div>
        </div>
      </div>

      <div className="g-wrap" ref={containerRef}>
        <div className="g-board" role="application" aria-label="2048 game board">
          {Array.from({ length: SIZE }).map((_, r) =>
            Array.from({ length: SIZE }).map((__, c) => (
              <div key={`bg-${r}-${c}`} className="g-cell" style={{ gridRow: r + 1, gridColumn: c + 1 }} />
            ))
          )}

          <div className="g-tiles">
            {tileNodes}
          </div>
        </div>

        <div className="g-controls">
          <button onClick={restart} className="g-btn">Restart</button>
        </div>

        {isGameOver && (
          <div className="g-overlay">
            <div className="g-overlay-card">
              <h3>Game Over</h3>
              <p>Score {score}</p>
              <div className="g-overlay-actions">
                <button onClick={restart} className="g-btn primary">Try Again</button>
                <button onClick={exit} className="g-btn">Exit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
