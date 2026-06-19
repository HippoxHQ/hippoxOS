import React, { useEffect, useState } from "react";

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
}
const ArtText: React.FC<ArtTextProps> = ({
  text,
  className = "",
  fontSize = 56,
  fontWeight = "300",
  letterSpacing = 2,
  lightColor = "#ffffff",
  textColor = "#818cf8",
  animationDuration = 3,
  fontFamily = "'Great Vibes', 'Sacramento', 'Dancing Script', cursive",
  glowSize = 2,
}) => {
  const [viewWidth, setViewWidth] = useState(800);
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
  const gradId = `art-grad-${Math.random().toString(36).substr(2, 9)}`;
  const glowId = `art-glow-${Math.random().toString(36).substr(2, 9)}`;
  const canvasHeight = fontSize * 1.1;
  const yPosition = fontSize * 0.85;
  return (
    <div
      id="art-text-container"
      className={`art-text-wrapper ${className}`}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "transparent",
      }}
    >
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
            <stop offset="0%" stopColor={textColor} stopOpacity="1" />
            <stop offset="40%" stopColor={textColor} stopOpacity="1" />
            <stop offset="47%" stopColor={lightColor} stopOpacity="1" />
            <stop offset="50%" stopColor={lightColor} stopOpacity="1" />
            <stop offset="53%" stopColor={lightColor} stopOpacity="1" />
            <stop offset="60%" stopColor={textColor} stopOpacity="1" />
            <stop offset="100%" stopColor={textColor} stopOpacity="1" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1 0"
              to="1 0"
              dur={`${animationDuration}s`}
              repeatCount="indefinite"
            />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={glowSize} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="antialias">
            <feComponentTransfer>
              <feFuncA type="linear" slope="1.05" />
            </feComponentTransfer>
          </filter>
        </defs>
        <text
          x="50%"
          y={yPosition}
          dominantBaseline="auto"
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontFamily={fontFamily}
          fill={`url(#${gradId})`}
          letterSpacing={letterSpacing}
          filter={`url(#${glowId})`}
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
    </div>
  );
};

export default ArtText;
