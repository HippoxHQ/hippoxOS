export interface Material {
  id: string;
  name: string;
  file_path: string;
  type: "video" | "audio" | "image" | "text";
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  waveform?: string;
  content_preview?: string;
  line_count?: number;
  file_size?: number;
  codec?: string;
  fps?: number;
  sample_rate?: number;
  channels?: number;
}
export interface AudioVisualizerRef {
  seek: (time: number) => void;
}
export interface AudioVisualizerProps {
  audioUrl: string;
  isDark: boolean;
  isPlaying: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  onTimeUpdate?: (time: number) => void;
  onLoaded?: () => void;
  onDuration?: (duration: number) => void;
}