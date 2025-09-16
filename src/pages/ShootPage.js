// src/pages/ShootPage.js
import React, { useRef, useEffect, useState } from "react";
import "./ShootPage.css"; // ADDED: Import for the separate CSS file

// CHANGED: Renamed component and accept onExit/onScore props
export default function ShootPage({ onExit, onScore }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const playerRef = useRef({ x: 0, y: 0, w: 56, h: 34, reload: 0.16, cooldown: 0 });
  const angleRef = useRef(0);
  const aimingRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const controlsRef = useRef({ fire: false });

  // Mobile-only tweaks
  useEffect(() => {
    document.documentElement.style.touchAction = 'manipulation';
    document.body.style.margin = '0';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.documentElement.style.touchAction = '';
      document.body.style.margin = '';
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  // REMOVED: The useEffect that injected the <style> tag is now gone.

  // Set game over and report score
  function handleGameOver() {
    onScore(score); // ADDED: Reports final score to App.js
    setGameOver(true);
    setRunning(false);
  }

  useEffect(() => {
    // --- ALL OF YOUR GAME AND DRAWING LOGIC IS PRESERVED HERE ---
    // --- NO CHANGES to effects, colors, movement, etc. ---
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      canvas.width = Math.round(vw * ratio);
      canvas.height = Math.round(vh * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const p = playerRef.current;
      p.x = vw / 2 - p.w / 2;
      p.y = vh - 78;
    }

    resize();
    window.addEventListener('resize', resize);
    
    let enemies = [];
    let bullets = [];
    let spawnTimer = 0;
    let spawnInterval = 1.2;
    const baseEnemyDownSpeed = 5;
    const enemySpeedGrowthPerSec = 0.01;
    const enemySpeedFromScore = 0.02;
    const bulletSpeed = 900;
    const angleLimit = Math.PI / 3;

    function spawnWave() {
      const cols = Math.min(5, 2 + Math.floor(level / 2));
      const rows = Math.min(3, 1 + Math.floor(level / 4));
      const gapX = 18;
      const gapY = 16;
      const startY = 28;
      enemies = [];
      const totalWidth = cols * playerRef.current.w + (cols - 1) * gapX;
      const offsetX = Math.max(12, (canvas.width / (window.devicePixelRatio || 1) - totalWidth) / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          enemies.push({
            x: offsetX + c * (playerRef.current.w + gapX),
            y: startY + r * (playerRef.current.h + gapY),
            w: playerRef.current.w - 12,
            h: playerRef.current.h - 12,
            sweep: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function computeEnemyDownSpeed() {
      const elapsed = elapsedRef.current;
      return baseEnemyDownSpeed + elapsed * enemySpeedGrowthPerSec + score * enemySpeedFromScore;
    }

    function rectsCollide(a, b) {
      return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
    }

    function update(dt) {
      if (!running || gameOver) return;
      elapsedRef.current += dt;
      const p = playerRef.current;
      const enemyDownSpeed = Math.max(1, computeEnemyDownSpeed());
      p.cooldown -= dt;
      const angle = angleRef.current;
      const bvx = Math.sin(angle) * bulletSpeed;
      const bvy = -Math.cos(angle) * bulletSpeed;
      let nearest = null; let maxY = -Infinity;
      for (const e of enemies) if (e.y > maxY) { maxY = e.y; nearest = e; }
      if (p.cooldown <= 0) {
        let shouldFire = false;
        if (nearest) {
          const targetY = nearest.y + nearest.h / 2;
          let tBullet = (targetY - p.y) / bvy;
          if (tBullet < 0) tBullet = Infinity;
          const tEnemy = Math.max(0.0001, (p.y - (nearest.y + nearest.h)) / enemyDownSpeed);
          const safeBuffer = 0.12;
          if (tBullet <= tEnemy + safeBuffer) shouldFire = true;
        }
        if (controlsRef.current.fire) shouldFire = true;
        if (shouldFire) {
          bullets.push({ x: p.x + p.w / 2 - 6, y: p.y - 10, w: 10, h: 10, vx: bvx, vy: bvy });
          p.cooldown = p.reload;
        }
      }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < -80 || b.x < -80 || b.x > (canvas.width / (window.devicePixelRatio || 1)) + 80) bullets.splice(i, 1);
      }
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.x += Math.cos((Date.now() / 1000) + e.sweep) * 8 * dt;
        e.y += enemyDownSpeed * dt;
        if (e.y + e.h >= p.y) { handleGameOver(); return; }
      }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (rectsCollide(b, e)) { bullets.splice(i, 1); enemies.splice(j, 1); setScore(s => s + 1); break; }
        }
      }
      if (enemies.length === 0) { setLevel(l => l + 1); spawnWave(); spawnInterval = Math.max(0.5, spawnInterval - 0.06); }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnTimer = spawnInterval; if (enemies.length < 2) spawnWave(); }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const vw = canvas.width / (window.devicePixelRatio || 1);
      const vh = canvas.height / (window.devicePixelRatio || 1);
      for (let i = 0; i < 60; i++) {
        const x = (i * 53) % vw;
        const y = ((i * 97) + (Date.now() / 40)) % vh;
        ctx.fillStyle = (i % 6 === 0) ? '#ffffff' : '#cfefff';
        ctx.fillRect(x, y, (i % 7 === 0) ? 2 : 1, (i % 7 === 0) ? 2 : 1);
      }
      const p = playerRef.current;
      drawShip(ctx, p.x, p.y, p.w, p.h, angleRef.current);
      const cx = p.x + p.w / 2; const cy = p.y - 6; const aimLen = 140;
      const ax = cx + Math.sin(angleRef.current) * aimLen;
      const ay = cy - Math.cos(angleRef.current) * aimLen;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.strokeStyle = 'rgba(136,240,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      for (const b of bullets) { ctx.fillStyle = '#a8ffea'; ctx.fillRect(b.x, b.y, b.w, b.h); }
      for (const e of enemies) { ctx.fillStyle = '#ff9fbf'; ctx.fillRect(e.x, e.y, e.w, e.h); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(e.x+3, e.y+3, e.w-6, e.h-6); }
      ctx.strokeStyle = 'rgba(160,240,255,0.04)'; ctx.beginPath(); ctx.moveTo(0, p.y + p.h); ctx.lineTo(vw, p.y + p.h); ctx.stroke();
    }
    
    function drawShip(ctx, px, py, w, h, angle) {
      ctx.save(); ctx.translate(px + w / 2, py + h / 2); ctx.rotate(angle); // Note: Your original had -angle, which made the turret rotate opposite the aim. I fixed this small bug.
      ctx.beginPath(); ctx.moveTo(0, -h/2); ctx.lineTo(w/2, h/2); ctx.lineTo(-w/2, h/2); ctx.closePath(); ctx.fillStyle = '#aee6ff'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -h/2 + 2); ctx.lineTo(0, -h/2 - 26); ctx.lineWidth = 3; ctx.strokeStyle = '#88f0ff'; ctx.stroke(); ctx.restore();
    }

    function loop(ts) {
      const last = lastTimeRef.current || ts; const dt = Math.min(0.05, (ts - last) / 1000); lastTimeRef.current = ts; update(dt); draw(); if (!gameOver) rafRef.current = requestAnimationFrame(loop);
    }
    
    elapsedRef.current = 0; setScore(0); spawnWave(); rafRef.current = requestAnimationFrame(loop);
    let pointerAimingId = null;

    function getCanvasPointFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function updateAngleFromPoint(x, y) {
      const p = playerRef.current;
      const centerX = p.x + p.w / 2;
      const centerY = p.y;
      let ang = Math.atan2(x - centerX, centerY - y);
      ang = Math.max(-angleLimit, Math.min(angleLimit, ang));
      angleRef.current = ang;
    }
    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const pt = getCanvasPointFromEvent(e);
      const p = playerRef.current;
      const dx = pt.x - (p.x + p.w / 2);
      const dy = (p.y) - pt.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 80) {
        pointerAimingId = e.pointerId;
        aimingRef.current = true;
        try { canvas.setPointerCapture(pointerAimingId); } catch (err) {}
        updateAngleFromPoint(pt.x, pt.y);
      } else {
        controlsRef.current.fire = true;
      }
      e.preventDefault();
    }
    function onPointerMove(e) {
      if (pointerAimingId !== null && e.pointerId === pointerAimingId) {
        const pt = getCanvasPointFromEvent(e);
        updateAngleFromPoint(pt.x, pt.y);
      }
    }
    function onPointerUp(e) {
      if (pointerAimingId !== null && e.pointerId === pointerAimingId) {
        aimingRef.current = false;
        try { canvas.releasePointerCapture(pointerAimingId); } catch (err) {}
        pointerAimingId = null;
      }
      controlsRef.current.fire = false;
      e.preventDefault();
    }
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: false });

    function onKeyDown(e) {
      if (e.key === ' ') controlsRef.current.fire = true;
      if (e.key === 'p') setRunning(r => !r);
      if (e.key === 'ArrowLeft') angleRef.current = Math.max(-angleLimit, angleRef.current - Math.PI / 30);
      if (e.key === 'ArrowRight') angleRef.current = Math.min(angleLimit, angleRef.current + Math.PI / 30);
    }
    function onKeyUp(e) { if (e.key === ' ') controlsRef.current.fire = false; }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [running, level, gameOver, onScore]);

  function startPlay() { setShowIntro(false); setGameOver(false); setRunning(true); elapsedRef.current = 0; setScore(0); setLevel(1); }
  function onFirePress() { controlsRef.current.fire = true; }
  function onFireRelease() { controlsRef.current.fire = false; }
  function resetGame() { setShowIntro(false); setGameOver(false); setRunning(true); elapsedRef.current = 0; setScore(0); setLevel(1); angleRef.current = 0; }

  return (
    <div className="shoot-overlay">
      <div className="hud">
          <button className="big-btn" onClick={onExit}>✕ Exit</button>
          <div className="big-btn">Score: {score}</div>
      </div>
      
      <canvas ref={canvasRef} className="game-canvas" />
      
      <div className="mobile-controls">
          <div className="left-joy"><div className="joy-inner" /></div>
          <div className="fire-btn" onTouchStart={onFirePress} onTouchEnd={onFireRelease} onTouchCancel={onFireRelease} onPointerDown={onFirePress} onPointerUp={onFireRelease}>FIRE</div>
      </div>
      
      {showIntro && (
        <div className="overlay">
          <div className="panel">
            <div style={{fontSize:22,fontWeight:800, marginBottom:8}}>Galaxy Attack</div>
            <div style={{marginBottom:12}}>Mobile-first — hold the ship and rotate to aim. Tap FIRE or tap elsewhere to shoot. If enemies reach the line, it's Game Over.</div>
            <button className="big-btn" onClick={startPlay}>PLAY</button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="overlay">
          <div className="panel">
            <div style={{fontSize:20,fontWeight:800, marginBottom:8}}>GAME OVER</div>
            <div style={{marginBottom:12}}>Score: {score}</div>
            <div style={{display:'flex',gap:8, justifyContent:'center'}}>
              <button className="big-btn" onClick={resetGame}>Play Again</button>
              <button className="big-btn" onClick={onExit}>Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}