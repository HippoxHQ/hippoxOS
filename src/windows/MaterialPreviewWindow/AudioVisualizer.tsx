import React, { useState, useEffect, useRef } from "react";
import { AudioVisualizerProps, AudioVisualizerRef } from "./types";
const AudioVisualizer = React.forwardRef<AudioVisualizerRef, AudioVisualizerProps>(({ audioUrl, isDark, isPlaying, onPlayStateChange, onTimeUpdate, onLoaded }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const isInitializedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isLoadingRef = useRef(true);
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      size: number;
      angle: number;
      speed: number;
      offset: number;
      baseX: number;
      baseY: number;
      hue: number;
      saturation: number;
      lightness: number;
    }>
  >([]);
  const starDustRef = useRef<
    Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      phase: number;
    }>
  >([]);
  React.useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
  }));
  const createParticles = (width: number, height: number) => {
    const newParticles = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * Math.min(width, height) * 0.35;
      const baseX = width / 2 + Math.cos(angle) * radius;
      const baseY = height / 2 + Math.sin(angle) * radius;
      newParticles.push({
        x: baseX,
        y: baseY,
        baseX: baseX,
        baseY: baseY,
        size: 2 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.006,
        offset: Math.random() * 1000,
        hue: 180 + Math.random() * 40,
        saturation: isDark ? 60 + Math.random() * 20 : 70 + Math.random() * 20,
        lightness: isDark ? 50 + Math.random() * 20 : 40 + Math.random() * 20,
      });
    }
    return newParticles;
  };
  const createStarDust = (width: number, height: number) => {
    const stars = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 1.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  };
  const drawParticles = (ctx: CanvasRenderingContext2D, width: number, height: number, spectrum: Uint8Array, bass: number, mid: number, treble: number) => {
    const overall = (bass + mid + treble) / 3;
    const particles = particlesRef.current;
    const stars = starDustRef.current;
    const cx = width / 2;
    const cy = height / 2;
    stars.forEach((star) => {
      star.x += star.speedX;
      star.y += star.speedY;
      if (star.x < 0) star.x = width;
      if (star.x > width) star.x = 0;
      if (star.y < 0) star.y = height;
      if (star.y > height) star.y = 0;
      const flicker = 0.5 + 0.5 * Math.sin(Date.now() / 2000 + star.phase);
      const opacity = star.opacity * (0.5 + 0.5 * flicker);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? `rgba(180, 220, 255, ${opacity * 0.5})` : `rgba(100, 150, 200, ${opacity * 0.3})`;
      ctx.fill();
      if (star.size > 1) {
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
        const glowColor = isDark ? `rgba(150, 200, 255, ${opacity * 0.1})` : `rgba(100, 150, 200, ${opacity * 0.05})`;
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    if (particles.length === 0) return;
    const glowSize = 80 + overall * 120;
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
    const glowColor = isDark ? `rgba(78, 201, 176, ${0.05 + overall * 0.08})` : `rgba(30, 150, 130, ${0.05 + overall * 0.08})`;
    glowGrad.addColorStop(0, glowColor);
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          const alpha = (1 - distance / 100) * (0.15 + overall * 0.5);
          const hue = isDark ? 180 + overall * 30 : 190 + overall * 30;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
          ctx.lineWidth = 0.3 + overall * 0.8;
          ctx.stroke();
          if (overall > 0.3) {
            ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.3})`;
            ctx.lineWidth = 0.1 + overall * 0.4;
            ctx.stroke();
          }
        }
      }
    }
    particles.forEach((particle, i) => {
      const spectrumIndex = Math.floor((i / particles.length) * spectrum.length);
      const freqValue = spectrum[spectrumIndex] || 0;
      const force = freqValue / 255;
      const angleOffset = particle.angle + particle.offset;
      const radius = 20 + force * 140 + bass * 50;
      const targetX = cx + Math.cos(angleOffset) * radius;
      const targetY = cy + Math.sin(angleOffset) * radius;
      particle.x += (targetX - particle.x) * 0.05;
      particle.y += (targetY - particle.y) * 0.05;
      const sizeMultiplier = 1 + force * 2.5 + bass * 1.8;
      const currentSize = particle.size * sizeMultiplier;
      const hueOffset = force * 40 + bass * 50 + (i / particles.length) * 30;
      const hue = (190 + hueOffset) % 360;
      const saturation = 70 + force * 20;
      const lightness = 50 + force * 30 + bass * 20;
      const alpha = 0.6 + overall * 0.4;
      ctx.shadowBlur = currentSize * 2 + 10;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${0.3 + overall * 0.3})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${Math.min(lightness, 85)}%, ${alpha})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (currentSize > 2) {
        ctx.beginPath();
        ctx.arc(particle.x - currentSize * 0.2, particle.y - currentSize * 0.2, currentSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(0, 0%, 100%, ${0.2 + force * 0.3})`;
        ctx.fill();
      }
      if (currentSize > 4) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentSize * 1.6, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${0.05 + force * 0.15})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });
    const centerSize = 15 + overall * 80;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerSize);
    const centerColor = isDark ? "rgba(78, 201, 176, " : "rgba(30, 150, 130, ";
    grad.addColorStop(0, centerColor + (0.2 + overall * 0.3) + ")");
    grad.addColorStop(0.3, centerColor + (0.1 + overall * 0.15) + ")");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, centerSize, 0, Math.PI * 2);
    ctx.fill();
    const pulseSize = 3 + overall * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${0.3 + overall * 0.5})` : `rgba(255, 255, 255, ${0.5 + overall * 0.4})`;
    ctx.fill();
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgba(78, 201, 176, ${0.3 + overall * 0.4})`;
    ctx.fill();
    ctx.shadowBlur = 0;
    for (let ring = 0; ring < 3; ring++) {
      const ringRadius = 50 + overall * 100 + ring * 30;
      const ringAlpha = 0.05 + overall * 0.1 - ring * 0.02;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? `hsla(180, 80%, 60%, ${ringAlpha})` : `hsla(190, 80%, 50%, ${ringAlpha})`;
      ctx.lineWidth = 0.5 + overall * 1.5 - ring * 0.3;
      ctx.setLineDash([5, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const dotCount = 80;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 + overall * 0.5;
      const spectrumIndex = Math.floor((i / dotCount) * spectrum.length);
      const value = spectrum[spectrumIndex] || 0;
      const radius2 = 40 + (value / 255) * 80 + overall * 30;
      const x = cx + Math.cos(angle) * radius2;
      const y = cy + Math.sin(angle) * radius2;
      const dotSize = 1 + (value / 255) * 4 + overall * 2;
      const hue = 180 + (value / 255) * 60;
      ctx.shadowBlur = dotSize * 3;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${0.2 + (value / 255) * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${0.3 + (value / 255) * 0.5})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;
    const container = containerRef.current;
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const audio = document.createElement("audio");
    audio.src = audioUrl;
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;
    const onCanPlay = () => {
      isLoadingRef.current = false;
      if (onLoaded) {
        onLoaded();
      }
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    };
    audio.addEventListener("canplaythrough", onCanPlay);
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const logicalWidth = rect.width;
      const logicalHeight = rect.height;
      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;
      canvas.style.width = logicalWidth + "px";
      canvas.style.height = logicalHeight + "px";
      ctx.scale(dpr, dpr);
      particlesRef.current = createParticles(logicalWidth, logicalHeight);
      starDustRef.current = createStarDust(logicalWidth, logicalHeight);
    };
    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;
    try {
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      sourceRef.current = source;
    } catch (e) {
      console.error("Failed to create audio source:", e);
    }
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    dataArrayRef.current = dataArray;
    isInitializedRef.current = true;
    const onPlay = () => {
      isPlayingRef.current = true;
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      if (onPlayStateChange) {
        onPlayStateChange(true);
      }
    };
    const onPause = () => {
      isPlayingRef.current = false;
      if (onPlayStateChange) {
        onPlayStateChange(false);
      }
    };
    const onEnded = () => {
      isPlayingRef.current = false;
      if (onPlayStateChange) {
        onPlayStateChange(false);
      }
    };
    const onTimeUpdateHandler = () => {
      if (onTimeUpdate && audioRef.current) {
        onTimeUpdate(audioRef.current.currentTime);
      }
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdateHandler);
    const animate = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      const canvas = canvasRef.current;
      const ctx2 = canvas.getContext("2d");
      if (!ctx2) return;
      const analyser2 = analyserRef.current;
      const dataArray2 = dataArrayRef.current;
      analyser2.getByteFrequencyData(dataArray2 as Uint8Array<ArrayBuffer>);
      const hasData = dataArray2.some((v) => v > 0);
      ctx2.clearRect(0, 0, canvas.width, canvas.height);
      ctx2.fillStyle = isDark ? "rgba(26, 29, 38, 0.95)" : "rgba(248, 249, 250, 0.95)";
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      const bass = hasData ? dataArray2.slice(0, 10).reduce((a, b) => a + b, 0) / (10 * 255) : 0.05 + Math.sin(Date.now() / 3000) * 0.03;
      const mid = hasData ? dataArray2.slice(10, 30).reduce((a, b) => a + b, 0) / (20 * 255) : 0.05 + Math.cos(Date.now() / 2500) * 0.03;
      const treble = hasData ? dataArray2.slice(30, 60).reduce((a, b) => a + b, 0) / (30 * 255) : 0.05 + Math.sin(Date.now() / 2000 + 1) * 0.03;
      const dpr = window.devicePixelRatio || 1;
      drawParticles(ctx2, canvas.width / dpr, canvas.height / dpr, dataArray2, bass, mid, treble);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioRef.current) {
        audioRef.current.removeEventListener("canplaythrough", onCanPlay);
        audioRef.current.removeEventListener("play", onPlay);
        audioRef.current.removeEventListener("pause", onPause);
        audioRef.current.removeEventListener("ended", onEnded);
        audioRef.current.removeEventListener("timeupdate", onTimeUpdateHandler);
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.remove();
      }
      if (canvasRef.current && container) {
        container.removeChild(canvasRef.current);
      }
    };
  }, [audioUrl, isDark]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isInitializedRef.current) return;
    if (isLoadingRef.current) return;
    if (isPlaying) {
      audio.play().catch((e) => {
        console.error("Failed to play audio:", e);
      });
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    } else {
      audio.pause();
    }
  }, [isPlaying]);
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "140px",
        position: "relative",
        overflow: "hidden",
        borderRadius: "4px",
        backgroundColor: isDark ? "#1a1d26" : "#f8f9fa",
      }}
    />
  );
});
AudioVisualizer.displayName = "AudioVisualizer";
export default AudioVisualizer;
