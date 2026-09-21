import React, { useEffect, useRef } from "react";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import type { BondingCurveToken } from "./TokenCard";
interface RankingPanelProps {
  i18n?: "en" | "zh-cn";
  tokens: BondingCurveToken[];
  /** Called when a bar is clicked - typically opens the detail panel */
  onSelect?: (token: BondingCurveToken) => void;
}
/**
 * Particle field rendered on a canvas behind the podium.
 * Purely decorative: slow-drifting glowing dots plus a few rising sparks.
 *
 * The activity is intentionally concentrated on the RIGHT side of the panel:
 * a density falloff masks out the left region (where the bars live) and
 * ramps up towards the right edge, so the empty area gets the visual life.
 *
 * The canvas is sized to its container via ResizeObserver and cleaned up
 * on unmount. No interaction is attached.
 */
const PodiumParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Dot + spark pools. Sizes/velocities are re-seeded on resize.
    type Dot = { x: number; y: number; r: number; vx: number; vy: number; a: number };
    type Spark = { x: number; y: number; r: number; vy: number; life: number; maxLife: number };
    let dots: Dot[] = [];
    let sparks: Spark[] = [];
    /**
     * Density mask for the right side.
     * Returns 0 on the left ~35% of the panel and ramps to 1 by ~75%.
     * Used to bias both dot spawning and spark spawning.
     */
    const rightBias = (x: number): number => {
      const t = x / Math.max(1, width);
      const start = 0.35;
      const end = 0.75;
      if (t <= start) return 0;
      if (t >= end) return 1;
      const k = (t - start) / (end - start);
      // Smoothstep for a soft ramp.
      return k * k * (3 - 2 * k);
    };
    /** Rejection-sample an x coordinate weighted by rightBias. */
    const biasedX = (): number => {
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * width;
        if (Math.random() < rightBias(x)) return x;
      }
      // Fallback: guarantee right side.
      return width * (0.6 + Math.random() * 0.4);
    };
    const seed = () => {
      dots = [];
      sparks = [];
      const dotCount = Math.round((width * height) / 9000);
      for (let i = 0; i < dotCount; i++) {
        const x = biasedX();
        dots.push({
          x,
          y: Math.random() * height,
          r: Math.random() * 1.4 + 0.3,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          // Alpha also scales with the mask so the left stays calm.
          a: (Math.random() * 0.35 + 0.1) * (0.25 + 0.75 * rightBias(x)),
        });
      }
    };
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();
    const spawnSpark = () => {
      // Sparks rise from biased x positions, so they cluster on the right.
      const x = biasedX();
      sparks.push({
        x,
        y: height - Math.random() * 20,
        r: Math.random() * 1.3 + 0.5,
        vy: -(Math.random() * 0.5 + 0.25),
        life: 0,
        maxLife: Math.random() * 120 + 90,
      });
    };
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      // Drifting dots.
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -2) d.x = width + 2;
        if (d.x > width + 2) d.x = -2;
        if (d.y < -2) d.y = height + 2;
        if (d.y > height + 2) d.y = -2;
        // Fade dots based on their live x position too, so drifting dots
        // dim as they cross into the left region.
        const a = d.a * rightBias(d.x);
        if (a <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88,166,255,${a})`;
        ctx.fill();
      }
      // Rising sparks with a soft gold glow.
      if (Math.random() < 0.35) spawnSpark();
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.y += s.vy;
        s.life += 1;
        const t = 1 - s.life / s.maxLife;
        if (t <= 0 || s.y < -10) {
          sparks.splice(i, 1);
          continue;
        }
        // Spark brightness is also gated by the right-side mask.
        const mask = rightBias(s.x);
        const alpha = Math.min(0.85, t) * mask;
        if (alpha <= 0.01) continue;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        grad.addColorStop(0, `rgba(240,185,11,${alpha})`);
        grad.addColorStop(1, "rgba(240,185,11,0)");
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};
/**
 * RankingPanel - premium top-3 podium with a bar chart.
 *
 * Layout: bars are anchored to the LEFT of the panel; the header sits on the
 * right. Circles above each bar show the token's cover image (or its symbol
 * initials when no image is present).
 *
 * Hover behaviour: NO floating / lift effect. Only border and glow change.
 */
export const RankingPanel: React.FC<RankingPanelProps> = ({ i18n = "en", tokens, onSelect }) => {
  const isZh = i18n === "zh-cn";
  // Take the top 3 by market cap.
  const ranked = [...tokens].sort((a, b) => b.marketCap - a.marketCap).slice(0, 3);
  // Reorder to [2nd, 1st, 3rd] for the podium layout.
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean) as BondingCurveToken[];
  const maxMarketCap = ranked[0]?.marketCap ?? 1;
  // Bar heights: 1st place is tallest, others scaled proportionally.
  const getBarHeight = (token: BondingCurveToken): number => {
    const ratio = token.marketCap / maxMarketCap;
    return Math.max(72, Math.min(160, 72 + ratio * 88));
  };
  // Per-rank theme: colour, glow, icon.
  const rankTheme = (index: number) => {
    if (index === 1) {
      // 1st - gold
      return {
        color: "#f0b90b",
        colorSoft: "rgba(240,185,11,0.35)",
        gradient: "linear-gradient(180deg, #f7d64a 0%, #f0b90b 45%, rgba(240,185,11,0.15) 100%)",
        glow: "0 0 18px rgba(240,185,11,0.45)",
        Icon: Crown,
        label: "1",
      };
    }
    if (index === 0) {
      // 2nd - silver
      return {
        color: "#c7d0d9",
        colorSoft: "rgba(199,208,217,0.35)",
        gradient: "linear-gradient(180deg, #e6ecf2 0%, #c7d0d9 45%, rgba(199,208,217,0.15) 100%)",
        glow: "0 0 14px rgba(199,208,217,0.35)",
        Icon: Medal,
        label: "2",
      };
    }
    // 3rd - bronze
    return {
      color: "#cd7f32",
      colorSoft: "rgba(205,127,50,0.35)",
      gradient: "linear-gradient(180deg, #e2a05a 0%, #cd7f32 45%, rgba(205,127,50,0.15) 100%)",
      glow: "0 0 14px rgba(205,127,50,0.35)",
      Icon: Award,
      label: "3",
    };
  };
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "14px 16px 12px",
        borderBottom: "1px solid var(--border-color, #30363d)",
        background: "radial-gradient(120% 100% at 50% 0%, rgba(88,166,255,0.08) 0%, rgba(88,166,255,0) 60%), var(--bg-secondary, #161b22)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Decorative particle field behind the podium, concentrated on the right. */}
      <PodiumParticles />
      {/* Decorative top hairline */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(88,166,255,0.55), transparent)",
          zIndex: 1,
        }}
      />
      {/* Header sits above the podium, aligned to the right. */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-secondary, #8b949e)",
            textTransform: "uppercase",
            letterSpacing: "1.2px",
          }}
        >
          <Trophy size={13} style={{ color: "#f0b90b" }} />
          {isZh ? "市值排行" : "Market Cap Ranking"}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary, #6e7681)",
            letterSpacing: "0.5px",
          }}
        >
          {isZh ? "TOP 3" : "TOP 3"}
        </span>
      </div>
      {/* Podium + bars: left-aligned, no centering. */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          gap: 26,
          paddingBottom: 2,
        }}
      >
        {podium.map((token, idx) => {
          const height = getBarHeight(token);
          const theme = rankTheme(idx);
          const RankIcon = theme.Icon;
          const isFirst = idx === 1;
          return (
            <div
              key={token.id}
              onClick={() => onSelect?.(token)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                minWidth: 0,
                // NO transform on hover - only opacity / border colour changes
                transition: "opacity 0.15s",
              }}
            >
              {/* Rank badge above the bar: shows the token image or initials. */}
              <div
                style={{
                  width: isFirst ? 34 : 30,
                  height: isFirst ? 34 : 30,
                  borderRadius: "50%",
                  background: token.image ? `url(${token.image}) center/cover no-repeat` : "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.25))",
                  border: `1.5px solid ${theme.color}`,
                  color: theme.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isFirst ? "0 0 16px rgba(240,185,11,0.5), inset 0 0 6px rgba(240,185,11,0.25)" : `0 0 10px ${theme.colorSoft}`,
                  position: "relative",
                  overflow: "hidden",
                }}
                title={`Rank ${theme.label}`}
              >
                {/* When there is no image, show the token initials. */}
                {!token.image && (
                  <span
                    style={{
                      fontSize: isFirst ? 12 : 11,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {token.symbol.slice(0, 2)}
                  </span>
                )}
                {/* Rank icon pinned to the bottom-right corner of the circle. */}
                <div
                  style={{
                    position: "absolute",
                    right: -3,
                    bottom: -3,
                    width: isFirst ? 16 : 14,
                    height: isFirst ? 16 : 14,
                    borderRadius: "50%",
                    background: "var(--bg-secondary, #161b22)",
                    border: `1px solid ${theme.color}`,
                    color: theme.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <RankIcon size={isFirst ? 9 : 8} strokeWidth={2.4} />
                </div>
              </div>
              {/* Bar */}
              <div
                style={{
                  width: isFirst ? 66 : 58,
                  height,
                  borderRadius: "8px 8px 0 0",
                  background: theme.gradient,
                  border: `1px solid ${theme.color}`,
                  borderBottom: "none",
                  transition: "height 0.3s, box-shadow 0.2s",
                  boxShadow: isFirst ? "0 -4px 18px rgba(240,185,11,0.28)" : "0 -2px 10px rgba(0,0,0,0.2)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Inner shine */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "45%",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0))",
                    pointerEvents: "none",
                  }}
                />
                {/* Number stamped at the bottom of the bar */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "rgba(0,0,0,0.45)",
                    letterSpacing: "1px",
                  }}
                >
                  {theme.label}
                </div>
              </div>
              {/* Token label */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-primary, #e6edf3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 80,
                  textAlign: "center",
                  letterSpacing: "0.3px",
                }}
                title={token.symbol}
              >
                {token.symbol}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: theme.color,
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                {token.marketCap.toFixed(1)} ETH
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default RankingPanel;
