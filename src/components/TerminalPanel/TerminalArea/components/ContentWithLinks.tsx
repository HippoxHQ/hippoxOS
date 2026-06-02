import React, { JSX } from "react";
import { openUrl, handleOpenPath } from "../utils";

interface ContentWithLinksProps {
  text: string;
  t: (key: string, params?: any) => string;
}

export const ContentWithLinks: React.FC<ContentWithLinksProps> = ({ text, t }) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|ftp:\/\/[^\s]+|file:\/\/[^\s]+)/gi;
  const filePathRegex = /(?:[a-zA-Z]:)?[\\/][\w\-\.\\/]+(?:\.\w+)?/g;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  const matches: {
    index: number;
    endIndex: number;
    text: string;
    type: "url" | "file";
  }[] = [];
  
  let urlMatch: RegExpExecArray | null;
  urlRegex.lastIndex = 0;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    matches.push({
      index: urlMatch.index,
      endIndex: urlMatch.index + urlMatch[0].length,
      text: urlMatch[0],
      type: "url",
    });
  }
  
  let fileMatch: RegExpExecArray | null;
  filePathRegex.lastIndex = 0;
  while ((fileMatch = filePathRegex.exec(text)) !== null) {
    const isOverlap = matches.some(
      (m) =>
        (fileMatch!.index >= m.index && fileMatch!.index < m.endIndex) ||
        (fileMatch!.index + fileMatch![0].length > m.index &&
          fileMatch!.index + fileMatch![0].length <= m.endIndex),
    );
    if (!isOverlap && fileMatch[0].length > 3) {
      matches.push({
        index: fileMatch.index,
        endIndex: fileMatch.index + fileMatch[0].length,
        text: fileMatch[0],
        type: "file",
      });
    }
  }
  
  matches.sort((a, b) => a.index - b.index);
  let currentIndex = 0;
  
  for (const match of matches) {
    if (match.index > currentIndex) {
      parts.push(
        <span key={`text-${currentIndex}`}>
          {text.substring(currentIndex, match.index)}
        </span>,
      );
    }
    const isUrl = match.type === "url";
    parts.push(
      <span
        key={`link-${match.index}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isUrl) {
            openUrl(match.text, t);
          } else {
            handleOpenPath(match.text, t);
          }
        }}
        style={{
          color: "var(--accent-color, #00aaff)",
          textDecoration: "underline",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        {match.text}
      </span>,
    );
    currentIndex = match.endIndex;
  }
  
  if (currentIndex < text.length) {
    parts.push(<span key={`text-end`}>{text.substring(currentIndex)}</span>);
  }
  
  return <>{parts}</>;
};