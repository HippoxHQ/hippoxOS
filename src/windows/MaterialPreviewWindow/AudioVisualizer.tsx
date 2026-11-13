import React, { useEffect, useRef } from "react";
import { AudioVisualizerProps, AudioVisualizerRef } from "./types";
const AudioVisualizer = React.forwardRef<AudioVisualizerRef, AudioVisualizerProps>(({ audioUrl, isDark, isPlaying, onPlayStateChange, onTimeUpdate, onLoaded, onDuration }, ref) => {
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
  // Star field: each star has a 3D-ish position (x, y, z) where z is depth.
  type Star = {
    x: number;
    y: number;
    z: number;
    pz: number; // previous z for motion-blur trail
    hue: number;
    size: number;
    twinkle: number;
  };
  const starsRef = useRef<Star[]>([]);
  // Smoothed orb level for the pulsing core.
  const coreLevelRef = useRef(0);
  // Slowly rotating background nebula offset.
  const nebulaPhaseRef = useRef(0);
  const startTimeRef = useRef(performance.now());
  React.useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
  }));
  const createStar = (width: number, height: number, fresh = false): Star => {
    const maxDim = Math.max(width, height);
    const depth = fresh ? maxDim * (0.9 + Math.random() * 0.1) : maxDim;
    const spread = maxDim * 0.9;
    return {
      x: (Math.random() - 0.5) * spread,
      y: (Math.random() - 0.5) * spread,
      z: depth,
      pz: depth,
      hue: 200 + Math.random() * 120, // blue -> violet
      size: 0.6 + Math.random() * 1.6,
      twinkle: Math.random() * Math.PI * 2,
    };
  };
  const initStars = (width: number, height: number) => {
    const count = 320;
    const arr: Star[] = [];
    for (let i = 0; i < count; i++) {
      const s = createStar(width, height);
      s.z = 1 + Math.random() * Math.max(width, height);
      s.pz = s.z;
      arr.push(s);
    }
    starsRef.current = arr;
  };
  const drawFrame = (ctx: CanvasRenderingContext2D, width: number, height: number, spectrum: Uint8Array, bass: number, mid: number, treble: number, active: boolean) => {
    const cx = width / 2;
    const cy = height / 2;
    const maxDim = Math.max(width, height);
    const now = performance.now();
    const t = (now - startTimeRef.current) / 1000;
    // --- Smooth core level (attack/release) ---
    const targetLevel = active ? Math.max(0.05, Math.min(1, bass * 0.8 + mid * 0.2)) : 0.12 + 0.04 * Math.sin(t * 0.8);
    const attack = active ? 0.25 : 0.04;
    const release = active ? 0.1 : 0.02;
    const cur = coreLevelRef.current;
    coreLevelRef.current = cur + (targetLevel - cur) * (targetLevel > cur ? attack : release);
    const level = coreLevelRef.current;
    // --- Background: black + slow nebula glow ---
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.75);
    if (isDark) {
      bg.addColorStop(0, "rgba(10, 12, 20, 1)");
      bg.addColorStop(0.55, "rgba(6, 8, 14, 1)");
      bg.addColorStop(1, "rgba(2, 3, 6, 1)");
    } else {
      bg.addColorStop(0, "rgba(245, 247, 252, 1)");
      bg.addColorStop(0.55, "rgba(236, 240, 248, 1)");
      bg.addColorStop(1, "rgba(224, 229, 240, 1)");
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    // Nebula drift: two slow-moving radial blobs behind the field.
    nebulaPhaseRef.current += 0.0015;
    const nebulaA = nebulaPhaseRef.current;
    for (let i = 0; i < 2; i++) {
      const a = nebulaA + i * Math.PI;
      const nx = cx + Math.cos(a) * maxDim * 0.18;
      const ny = cy + Math.sin(a * 0.8) * maxDim * 0.12;
      const nr = maxDim * (0.45 + i * 0.08) + level * maxDim * 0.1;
      const neb = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      const hue = i === 0 ? 220 : 280;
      neb.addColorStop(0, `hsla(${hue}, 90%, ${isDark ? 55 : 65}%, ${isDark ? 0.08 : 0.05})`);
      neb.addColorStop(0.6, `hsla(${hue}, 90%, ${isDark ? 45 : 55}%, ${isDark ? 0.03 : 0.02})`);
      neb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = neb;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }
    // --- Star field ---
    const speed = active ? 0.9 + bass * 9 + mid * 2.5 : 0.35;
    const focal = maxDim * 0.55;
    for (let i = 0; i < starsRef.current.length; i++) {
      const s = starsRef.current[i];
      s.pz = s.z;
      s.z -= speed;
      if (s.z <= 1) {
        Object.assign(s, createStar(width, height, true));
        s.pz = s.z;
        continue;
      }
      const k = focal / s.z;
      const px = cx + s.x * k;
      const py = cy + s.y * k;
      if (px < -50 || px > width + 50 || py < -50 || py > height + 50) {
        Object.assign(s, createStar(width, height, true));
        s.pz = s.z;
        continue;
      }
      const kPrev = focal / s.pz;
      const pxPrev = cx + s.x * kPrev;
      const pyPrev = cy + s.y * kPrev;
      const depthRatio = Math.max(0, Math.min(1, 1 - s.z / maxDim));
      const twinkle = 0.7 + 0.3 * Math.sin(t * 3 + s.twinkle);
      const alpha = (0.15 + depthRatio * 0.85) * twinkle;
      const size = s.size * (0.5 + depthRatio * 1.6) * (1 + treble * 0.6);
      const hue = s.hue + level * 40 + treble * 30;
      ctx.beginPath();
      ctx.moveTo(pxPrev, pyPrev);
      ctx.lineTo(px, py);
      ctx.strokeStyle = `hsla(${hue}, 92%, ${isDark ? 78 : 55}%, ${alpha * 0.55})`;
      ctx.lineWidth = Math.max(0.4, size * 0.55);
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 92%, ${isDark ? 88 : 60}%, ${alpha})`;
      if (depthRatio > 0.6) {
        ctx.shadowBlur = size * 4;
        ctx.shadowColor = `hsla(${hue}, 92%, 70%, ${alpha * 0.8})`;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // The orb replaces the previous solid circular core.
    const orbR = Math.min(maxDim * 0.16, 88) * (0.85 + level * 0.4);
    const orbCX = cx + Math.sin(t * 0.22) * maxDim * 0.008;
    const orbCY = cy + Math.cos(t * 0.17) * maxDim * 0.008;
    // Soft halo behind the orb.
    const orbHaloR = orbR * 2.6;
    const orbHalo = ctx.createRadialGradient(orbCX, orbCY, orbR * 0.6, orbCX, orbCY, orbHaloR);
    orbHalo.addColorStop(0, `hsla(${210 + level * 50}, 95%, 62%, ${isDark ? 0.22 : 0.16})`);
    orbHalo.addColorStop(0.5, `hsla(${250 + bass * 40}, 90%, 58%, ${isDark ? 0.08 : 0.06})`);
    orbHalo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orbHalo;
    ctx.beginPath();
    ctx.arc(orbCX, orbCY, orbHaloR, 0, Math.PI * 2);
    ctx.fill();
    // Multi-layer deformed circles (the actual "voice sphere").
    const layers = active ? 4 : 3;
    const deformSpeed = active ? 1.8 : 0.8;
    for (let li = 0; li < layers; li++) {
      const layerT = li / Math.max(1, layers - 1);
      const layerR = orbR * (1.0 - layerT * 0.22);
      const phase = li * 1.9;
      const segs = 128;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const deform = 0.09 * Math.sin(3 * a + t * deformSpeed * 1.1 + phase) + 0.05 * Math.sin(5 * a - t * deformSpeed * 1.6 + phase * 1.7) + 0.03 * Math.sin(7 * a + t * deformSpeed * 2.1 + phase * 2.3);
        const r = layerR * (1 + deform);
        const x = orbCX + Math.cos(a) * r;
        const y = orbCY + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const hue = (t * (active ? 35 : 20) + li * 55 + level * 60) % 360;
      const grad = ctx.createRadialGradient(orbCX, orbCY, layerR * 0.1, orbCX, orbCY, layerR * 1.05);
      grad.addColorStop(0, `hsla(${hue}, 88%, 68%, ${0.55 - layerT * 0.25})`);
      grad.addColorStop(0.6, `hsla(${hue}, 88%, 58%, ${0.32 - layerT * 0.1})`);
      grad.addColorStop(0.92, `hsla(${hue}, 88%, 50%, ${0.16 - layerT * 0.05})`);
      grad.addColorStop(1, `hsla(${hue}, 88%, 46%, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    // Bright inner core of the orb.
    const orbCoreR = orbR * (0.26 + 0.04 * Math.sin(t * (active ? 3.2 : 1.6)));
    const orbCoreHue = (t * (active ? 45 : 28) + level * 90) % 360;
    const orbCoreGrad = ctx.createRadialGradient(orbCX - orbCoreR * 0.25, orbCY - orbCoreR * 0.25, 0, orbCX, orbCY, orbCoreR);
    orbCoreGrad.addColorStop(0, `hsla(${orbCoreHue}, 96%, 92%, 0.95)`);
    orbCoreGrad.addColorStop(0.5, `hsla(${orbCoreHue}, 92%, 72%, 0.6)`);
    orbCoreGrad.addColorStop(0.92, `hsla(${orbCoreHue}, 88%, 62%, 0.22)`);
    orbCoreGrad.addColorStop(1, `hsla(${orbCoreHue}, 88%, 58%, 0)`);
    ctx.fillStyle = orbCoreGrad;
    ctx.beginPath();
    ctx.arc(orbCX, orbCY, orbCoreR, 0, Math.PI * 2);
    ctx.fill();
    // Specular highlight on the orb.
    const specX = orbCX - orbR * 0.32;
    const specY = orbCY - orbR * 0.34;
    const specR = orbR * 0.1;
    const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, specR);
    specGrad.addColorStop(0, "rgba(255,255,255,0.95)");
    specGrad.addColorStop(0.5, "rgba(255,255,255,0.35)");
    specGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(specX, specY, specR, 0, Math.PI * 2);
    ctx.fill();
    // Thin expanding rings on strong bass hits, emitted from the orb edge.
    if (active && bass > 0.55) {
      const ringCount = 2;
      for (let r = 0; r < ringCount; r++) {
        const ringT = (t * 0.9 + r * 0.5) % 1;
        const ringR = orbR * (1.4 + ringT * 4);
        const ringAlpha = (1 - ringT) * 0.25 * (bass - 0.5) * 2;
        if (ringAlpha <= 0) continue;
        ctx.beginPath();
        ctx.arc(orbCX, orbCY, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${orbCoreHue + 30}, 95%, 70%, ${ringAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    // --- Subtle vignette ---
    const vig = ctx.createRadialGradient(cx, cy, maxDim * 0.35, cx, cy, maxDim * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, isDark ? "rgba(0,0,0,0.45)" : "rgba(120,130,150,0.12)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
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
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        if (onDuration) onDuration(audio.duration);
      }
      if (onLoaded) onLoaded();
      if (isPlaying) audio.play().catch(() => {});
    };
    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        if (onDuration) onDuration(audio.duration);
      }
    };
    audio.addEventListener("canplaythrough", onCanPlay);
    audio.addEventListener("durationchange", onDurationChange);
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const logicalWidth = rect.width;
      const logicalHeight = rect.height;
      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;
      canvas.style.width = logicalWidth + "px";
      canvas.style.height = logicalHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars(logicalWidth, logicalHeight);
    };
    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
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
      if (audioContext.state === "suspended") audioContext.resume();
      if (onPlayStateChange) onPlayStateChange(true);
    };
    const onPause = () => {
      isPlayingRef.current = false;
      if (onPlayStateChange) onPlayStateChange(false);
    };
    const onEnded = () => {
      isPlayingRef.current = false;
      if (onPlayStateChange) onPlayStateChange(false);
    };
    const onTimeUpdateHandler = () => {
      if (onTimeUpdate && audioRef.current) onTimeUpdate(audioRef.current.currentTime);
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
      const canvasEl = canvasRef.current;
      const ctx2 = canvasEl.getContext("2d");
      if (!ctx2) return;
      const analyser2 = analyserRef.current;
      const dataArray2 = dataArrayRef.current;
      analyser2.getByteFrequencyData(dataArray2 as Uint8Array<ArrayBuffer>);
      const hasData = dataArray2.some((v) => v > 0);
      const active = isPlayingRef.current && hasData;
      const bass = hasData ? dataArray2.slice(0, 12).reduce((a, b) => a + b, 0) / (12 * 255) : 0.04 + Math.sin(performance.now() / 3200) * 0.02;
      const mid = hasData ? dataArray2.slice(12, 48).reduce((a, b) => a + b, 0) / (36 * 255) : 0.04 + Math.cos(performance.now() / 2600) * 0.02;
      const treble = hasData ? dataArray2.slice(48, 96).reduce((a, b) => a + b, 0) / (48 * 255) : 0.04 + Math.sin(performance.now() / 2200 + 1) * 0.02;
      const dpr = window.devicePixelRatio || 1;
      drawFrame(ctx2, canvasEl.width / dpr, canvasEl.height / dpr, dataArray2, bass, mid, treble, active);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (audioRef.current) {
        audioRef.current.removeEventListener("canplaythrough", onCanPlay);
        audioRef.current.removeEventListener("durationchange", onDurationChange);
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
      audio.play().catch((e) => console.error("Failed to play audio:", e));
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
        borderRadius: 0,
        backgroundColor: isDark ? "#05070c" : "#f4f6fa",
      }}
    />
  );
});
AudioVisualizer.displayName = "AudioVisualizer";
export default AudioVisualizer;
