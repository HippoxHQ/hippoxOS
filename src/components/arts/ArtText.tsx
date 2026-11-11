import React, { useEffect, useState } from "react";
import { osCommands } from "../../command/os";
interface ArtTextProps {
  text: string;
  className?: string;
  fontSize?: number;
  fontWeight?: string | number;
  letterSpacing?: number;
  lightColor?: string;
  textColor?: string;
  animationDuration?: number;
  fontFamily?: string;
  glowSize?: number;
  align?: "left" | "center" | "right";
}
const ArtText: React.FC<ArtTextProps> = ({ text, className = "", fontSize = 56, fontWeight = "300", letterSpacing = 2, lightColor = "#ffffff", textColor = "#818cf8", animationDuration = 3, fontFamily = "'Great Vibes', 'Sacramento', 'Dancing Script', cursive", glowSize = 0, align = "center" }) => {
  const [viewWidth, setViewWidth] = useState(800);
  const [isMacLike, setIsMacLike] = useState(false);
  const [animName] = useState(() => `art-flow-${Math.random().toString(36).substr(2, 9)}`);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const os = await osCommands.getOs();
        if (!cancelled) {
          setIsMacLike(os === "macos");
        }
      } catch (error) {
        const fallback = typeof navigator !== "undefined" && /Mac|iPad|iPhone|iPod/.test(navigator.platform || "");
        if (!cancelled) {
          setIsMacLike(fallback);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById("art-text-container");
      if (container) {
        const rect = container.getBoundingClientRect();
        const width = Math.max(rect.width, 300);
        setViewWidth(width);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  useEffect(() => {
    if (!isMacLike) return;
    const styleId = `art-text-style-${animName}`;
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes ${animName} {
        0%   { background-position: 200% center; }
        100% { background-position: -200% center; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
  }, [animName, isMacLike]);
  const gradId = `art-grad-${Math.random().toString(36).substr(2, 9)}`;
  const canvasHeight = fontSize * 1.1;
  const yPosition = fontSize * 0.85;
  const getTextX = () => {
    if (align === "left") return "0%";
    if (align === "right") return "100%";
    return "50%";
  };
  const getTextAnchor = () => {
    if (align === "left") return "start";
    if (align === "right") return "end";
    return "middle";
  };
  const getJustifyContent = () => {
    if (align === "left") return "flex-start";
    if (align === "right") return "flex-end";
    return "center";
  };
  const getTextAlign = () => {
    if (align === "left") return "left";
    if (align === "right") return "right";
    return "center";
  };
  const stopStops = [0, 42, 46, 49, 50, 51, 54, 58, 100];
  const stopColors = [textColor, textColor, lightColor, lightColor, lightColor, lightColor, lightColor, textColor, textColor];
  const macBackgroundImage = `linear-gradient(90deg, ${stopStops.map((p, i) => `${stopColors[i]} ${p}%`).join(", ")})`;
  return (
    <div
      id="art-text-container"
      className={`art-text-wrapper ${className}`}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: getJustifyContent(),
        alignItems: "center",
        background: "transparent",
      }}
    >
      {isMacLike ? (
        <span
          style={{
            display: "inline-block",
            fontFamily,
            fontStyle: "italic",
            fontSize: `${fontSize}px`,
            fontWeight,
            letterSpacing: `${letterSpacing}px`,
            lineHeight: 1.2,
            textAlign: getTextAlign(),
            backgroundImage: macBackgroundImage,
            backgroundSize: "200% auto",
            backgroundRepeat: "repeat",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            animation: `${animName} ${animationDuration}s linear infinite`,
            paddingLeft: `${letterSpacing}px`,
            paddingRight: `${letterSpacing * 2}px`,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
        >
          {text}
        </span>
      ) : (
        <svg
          viewBox={`0 0 ${viewWidth} ${canvasHeight}`}
          style={{
            width: "100%",
            height: "auto",
            overflow: "visible",
            background: "transparent",
            display: "block",
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              {stopStops.map((p, i) => (
                <stop key={i} offset={`${p}%`} stopColor={stopColors[i]} stopOpacity="1" />
              ))}
              <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur={`${animationDuration}s`} repeatCount="indefinite" />
            </linearGradient>
          </defs>
          <text
            x={getTextX()}
            y={yPosition}
            dominantBaseline="auto"
            textAnchor={getTextAnchor()}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontFamily={fontFamily}
            fill={`url(#${gradId})`}
            letterSpacing={letterSpacing}
            style={{
              fontStyle: "italic",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              textRendering: "geometricPrecision",
            }}
          >
            {text}
          </text>
        </svg>
      )}
    </div>
  );
};
export default ArtText;
