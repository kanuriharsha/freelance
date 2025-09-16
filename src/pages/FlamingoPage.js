// src/pages/FlamingoPage.js
import React, { useRef, useEffect, useState } from "react";
import "./FlamingoPage.css"; // ADDED: Using your provided CSS file

// CHANGED: Renamed component to FlamingoPage and accept props
export default function FlamingoPage({ onExit, onScore }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('flappy_best') || '0', 10));
  const [showIntro, setShowIntro] = useState(true);

  // --- NO CHANGES to your game tuning or physics variables ---
  const gravity = 1000;
  const flapVelocity = -360;
  const pipeSpeedBase = 160;
  const pipeGap = 140;
  const pipeWidth = 60;
  const spawnIntervalBase = 1.6;

  const birdRef = useRef({ x: 0, y: 0, w: 42, h: 30, vy: 0, rotation: 0 });
  const pipesRef = useRef([]);
  const spawnTimerRef = useRef(0);
  const canvasSizeRef = useRef({ w: 360, h: 640 });
  const scoreRef = useRef(0);

  // This function is new, to handle setting game over and reporting score
  function handleGameOver() {
    if (gameOver) return; // Prevent calling multiple times
    onScore(scoreRef.current); // ADDED: Report final score to App.js
    setGameOver(true);
    setRunning(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- NO CHANGES to resize, reset, spawn, collision, update, or draw logic ---
    // Your beautiful effects are all preserved in here.
    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const ratio = window.devicePixelRatio || 1;
      const vw = parent.clientWidth;
      const vh = parent.clientHeight;
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      canvas.width = Math.round(vw * ratio);
      canvas.height = Math.round(vh * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvasSizeRef.current = { w: vw, h: vh };
      const bird = birdRef.current;
      bird.x = vw * 0.28;
      bird.y = vh * 0.45;
    }

    window.addEventListener('resize', resize);
    resize();

    function resetGameVars() {
      const bird = birdRef.current;
      bird.vy = 0;
      bird.rotation = 0;
      bird.y = canvasSizeRef.current.h * 0.45;
      pipesRef.current = [];
      spawnTimerRef.current = 0;
      scoreRef.current = 0;
      setScore(0);
      setGameOver(false);
    }

    function spawnPipe() {
      const h = canvasSizeRef.current.h;
      const minCenter = Math.round(h * 0.22 + pipeGap / 2);
      const maxCenter = Math.round(h * 0.6 - pipeGap / 2);
      const centerY = Math.random() * (maxCenter - minCenter) + minCenter;
      const x = canvasSizeRef.current.w + 40;
      pipesRef.current.push({ x, centerY, passed: false });
    }

    function rectsCollide(a, b) {
      return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
    }

    function update(dt) {
      if (!running || gameOver) return;
      const bird = birdRef.current;
      bird.vy += gravity * dt;
      bird.y += bird.vy * dt;
      bird.rotation = Math.max(-0.9, Math.min(1.0, bird.vy / 600));
      const speed = pipeSpeedBase + (scoreRef.current * 3);
      for (let i = pipesRef.current.length - 1; i >= 0; i--) {
        pipesRef.current[i].x -= speed * dt;
        if (!pipesRef.current[i].passed && pipesRef.current[i].x + pipeWidth < bird.x) {
          pipesRef.current[i].passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          if (scoreRef.current > best) { setBest(scoreRef.current); localStorage.setItem('flappy_best', String(scoreRef.current)); }
        }
        if (pipesRef.current[i].x < -pipeWidth - 40) pipesRef.current.splice(i, 1);
      }
      const spawnInterval = Math.max(0.9, spawnIntervalBase - Math.min(0.8, scoreRef.current * 0.03));
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;
        spawnPipe();
      }
      if (bird.y + bird.h / 2 >= canvasSizeRef.current.h || bird.y - bird.h / 2 <= 0) {
        handleGameOver();
      }
      for (const p of pipesRef.current) {
        const bx = bird.x - bird.w / 2;
        const by = bird.y - bird.h / 2;
        const birdRect = { x: bx, y: by, w: bird.w, h: bird.h };
        const topRect = { x: p.x, y: 0, w: pipeWidth, h: p.centerY - pipeGap / 2 };
        const bottomRect = { x: p.x, y: p.centerY + pipeGap / 2, w: pipeWidth, h: canvasSizeRef.current.h - (p.centerY + pipeGap / 2) };
        if (rectsCollide(birdRect, topRect) || rectsCollide(birdRect, bottomRect)) {
          handleGameOver();
        }
      }
    }

    function draw() {
        const vw = canvasSizeRef.current.w;
        const vh = canvasSizeRef.current.h;
        ctx.clearRect(0, 0, vw, vh);
        const g = ctx.createLinearGradient(0, 0, 0, vh);
        g.addColorStop(0, '#70c5ce');
        g.addColorStop(1, '#5aa2b0');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, vw, vh);

        // Ground is now part of the canvas background to allow pipes to go to the bottom
        ctx.fillStyle = '#ded895';
        ctx.fillRect(0, vh - 20, vw, 20); // A smaller ground line
        
        ctx.fillStyle = '#2aa02a';
        for (const p of pipesRef.current) {
            ctx.fillRect(p.x, 0, pipeWidth, p.centerY - pipeGap / 2);
            ctx.fillRect(p.x, p.centerY + pipeGap / 2, pipeWidth, vh - (p.centerY + pipeGap / 2));
        }
        const bird = birdRef.current;
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bird.rotation);
        ctx.fillStyle = '#ffdd57';
        ctx.beginPath();
        ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(bird.w * 0.14, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function loop(ts) {
      const last = lastTimeRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastTimeRef.current = ts;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    resetGameVars();
    rafRef.current = requestAnimationFrame(loop);

    function flap() {
      if (gameOver) return;
      if (!running) { setRunning(true); setShowIntro(false); }
      birdRef.current.vy = flapVelocity;
    }
    
    function onPointerDown(e) {
      // only flap if the click is on the canvas wrapper, not the buttons
      if (e.target === e.currentTarget || e.target.tagName === 'CANVAS') {
        flap();
        e.preventDefault();
      }
    }

    const canvasWrap = canvas.parentElement;
    canvasWrap.addEventListener('pointerdown', onPointerDown, { passive: false });

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      if (canvasWrap) canvasWrap.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gameOver, running, best]); // Dependencies simplified

  function handleRestart() {
    setShowIntro(false);
    setGameOver(false);
    setRunning(true);
    // Let the effect handle resetting vars
  }

  return (
    <div className="flamingo-overlay">
      <div className="flamingo-topbar">
        <button className="f-back" onClick={onExit}>✕</button>
        <div className="f-score">Score: <strong>{score}</strong></div>
        <div className="f-high">Best: <strong>{best}</strong></div>
      </div>

      <div className="flamingo-canvas-wrap">
        <canvas ref={canvasRef} className="flamingo-canvas" />
        
        {showIntro && (
           <div className="f-hint">Tap to Start</div>
        )}

        {gameOver && (
          <div className="f-gameover">
            <div className="f-card">
              <h3>Game Over</h3>
              <p>Score: {score}</p>
              <div className="f-actions">
                <button className="f-btn" onClick={handleRestart}>Play Again</button>
                <button className="f-btn" onClick={onExit}>Exit</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flamingo-footer">
          <button className="f-control">FLAP</button>
          <div className="f-controls-right">
            <button className="f-small" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Resume'}</button>
            <button className="f-small" onClick={handleRestart}>Restart</button>
          </div>
      </div>
    </div>
  );
}