import React from "react";

export default function GameBlock({ title, subtitle, onClick }) {
  return (
    <button className="game-block" onClick={onClick} aria-label={title}>
      <div className="game-thumb">
        <div className="game-thumb-inner">{title.split(" ")[0]}</div>
      </div>
      <div className="game-info">
        <div className="game-title">{title}</div>
        <div className="game-sub">{subtitle}</div>
      </div>
    </button>
  );
}
