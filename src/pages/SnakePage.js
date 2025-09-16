import React, { useEffect, useRef, useState } from "react";
import "./SnakePage.css";

const DEFAULT_COLS = 20;
const DEFAULT_SPEED = 120;

// CHANGED: Added 'onScore' to the props
export default function SnakePage({ onExit, onScore }) {
  const canvasRef = useRef();
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(() => Number(localStorage.getItem("snake_high") || 0));
  const touchStartRef = useRef(null);
  const gameRef = useRef(null);

  function initGame() {
    const cols = DEFAULT_COLS;
    const rows = Math.floor((cols * 16) / 9);
    const startX = Math.floor(cols / 2);
    const startY = Math.floor(rows / 2);
    const snake = [{ x: startX, y: startY }, { x: startX - 1, y: startY }, { x: startX - 2, y: startY }];
    const dir = { x: 1, y: 0 };
    const apple = spawnApple(cols, rows, snake);
    gameRef.current = {
      cols, rows, snake, dir, nextDir: dir, apple,
      speed: DEFAULT_SPEED, tickTimer: null, gameOver: false,
    };
    setScore(0);
  }

  function spawnApple(cols, rows, snake) {
    while (true) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      if (!snake.some((s) => s.x === x && s.y === y)) return { x, y };
    }
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { cols, rows, snake, apple } = gameRef.current;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const cellW = Math.floor(W / cols);
    const cellH = Math.floor(H / rows);
    ctx.fillStyle = "#071226";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      const x = i * cellW + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      const y = j * cellH + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const ax = apple.x * cellW + cellW / 2;
    const ay = apple.y * cellH + cellH / 2;
    const ar = Math.min(cellW, cellH) * 0.36;
    const grad = ctx.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar);
    grad.addColorStop(0, "#ff6b6b");
    grad.addColorStop(1, "#ff1f1f");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.ellipse(ax - ar * 0.35, ay - ar * 0.45, ar * 0.25, ar * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const x = s.x * cellW + 2;
      const y = s.y * cellH + 2;
      const w = cellW - 4;
      const h = cellH - 4;
      const intensity = i === 0 ? 1 : 0.82 - i / (snake.length * 6);
      ctx.fillStyle = `rgba(${Math.round(20 + 180 * intensity)},${Math.round(220 * intensity)},${Math.round(180 * intensity)},1)`;
      roundRect(ctx, x, y, w, h, Math.min(8, w / 4));
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function tick() {
    const g = gameRef.current;
    if (!g || g.gameOver) return;
    if (isOpposite(g.dir, g.nextDir) === false) g.dir = g.nextDir;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
    if (head.x < 0 || head.x >= g.cols || head.y < 0 || head.y >= g.rows) { endGame(); return; }
    if (g.snake.some((s) => s.x === head.x && s.y === head.y)) { endGame(); return; }
    g.snake.unshift(head);
    if (head.x === g.apple.x && head.y === g.apple.y) {
      g.apple = spawnApple(g.cols, g.rows, g.snake);
      setScore((s) => {
        const ns = s + 1;
        if (ns > high) {
          setHigh(ns);
          localStorage.setItem("snake_high", ns);
        }
        return ns;
      });
      if ((g.snake.length - 3) % 4 === 0 && g.speed > 50) {
        g.speed = Math.max(50, g.speed - 6);
        restartTick();
      }
    } else {
      g.snake.pop();
    }
    draw();
  }

  function restartTick() {
    const g = gameRef.current;
    if (!g) return;
    if (g.tickTimer) clearInterval(g.tickTimer);
    g.tickTimer = setInterval(tick, g.speed);
  }

  function start() {
    initGame();
    setRunning(true);
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    setTimeout(() => {
      resizeCanvas();
      draw();
      restartTick();
    }, 50);
  }

  function endGame() {
    const g = gameRef.current;
    if (!g) return;
    g.gameOver = true;
    onScore(score); // ADDED: Report final score to the main app
    if (g.tickTimer) clearInterval(g.tickTimer);
    setRunning(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.clientWidth / 2, canvas.clientHeight / 2 - 10);
    ctx.font = "16px system-ui";
    ctx.fillText(`Score ${score} • Tap to restart`, canvas.clientWidth / 2, canvas.clientHeight / 2 + 20);
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  useEffect(() => {
    function onKey(e) {
      const g = gameRef.current;
      if (!g || g.gameOver) return;
      const keyDir = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } }[e.key];
      if (keyDir) { if (!isOpposite(g.dir, keyDir)) g.nextDir = keyDir; }
      else if (e.key === "Escape") exitFullscreenAndClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [high, score]); // eslint-disable-line

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function handleStart(ev) {
      if (ev.touches && ev.touches.length > 0) touchStartRef.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      else touchStartRef.current = { x: ev.clientX, y: ev.clientY };
    }
    function handleEnd(ev) {
      if (!touchStartRef.current) return;
      const end = (ev.changedTouches && ev.changedTouches[0]) || ev;
      const dx = end.clientX - touchStartRef.current.x;
      const dy = end.clientY - touchStartRef.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const g = gameRef.current;
      if (!g) return; // Game might not be initialized yet
      if (Math.max(absX, absY) < 20) {
        if (!running) start();
        else if (g.gameOver) start();
        return;
      }
      let nd;
      if (absX > absY) nd = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      else nd = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      if (g && !g.gameOver && !isOpposite(g.dir, nd)) g.nextDir = nd;
    }
    canvas.addEventListener("touchstart", handleStart, { passive: true });
    canvas.addEventListener("touchend", handleEnd, { passive: true });
    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mouseup", handleEnd);
    return () => {
      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchend", handleEnd);
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("mouseup", handleEnd);
    };
  }, [running]);

  useEffect(() => {
    initGame();
    resizeCanvas();
    draw(); // Draw initial state
    function onResize() {
      resizeCanvas();
      draw();
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (gameRef.current && gameRef.current.tickTimer) clearInterval(gameRef.current.tickTimer);
    };
  }, []);

  function exitFullscreenAndClose() {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    if (gameRef.current && gameRef.current.tickTimer) clearInterval(gameRef.current.tickTimer);
    onExit();
  }

  return (
    <div className="snake-overlay">
      <div className="snake-topbar">
        <button className="back-btn" onClick={exitFullscreenAndClose} aria-label="Back">✕</button>
        <div className="snake-score">Score {score}</div>
        <div className="snake-high">Best {high}</div>
      </div>
      <div className="snake-canvas-wrap" onClick={() => { if (!running) start(); }}>
        <canvas ref={canvasRef} className="snake-canvas" />
        {!running && <div className="tap-hint">Tap to start • Swipe to steer</div>}
      </div>
    </div>
  );
}