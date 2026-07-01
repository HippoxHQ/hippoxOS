import { invoke } from "@tauri-apps/api/core";

export interface VideoEditorState {
  timeline: any;
  currentTime: number;
  isPlaying: boolean;
}

export interface ExportOptions {
  output_path: string;
  width?: number;
  height?: number;
  bitrate?: string;
  fps?: number;
  format?: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
  bitrate: number;
  codec: string;
}

export interface ThumbnailOptions {
  time: number;
  width?: number;
  height?: number;
  output_path?: string;
}

export interface ClipInfo {
  path: string;
  start: number;
  duration: number;
}


export interface TrackItem {
  source: string;
  track_type: "video" | "audio" | "image" | "text" | "emoji";
  start: number;
  duration: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  z_index?: number;
  text?: string;
  font_size?: number;
  font_color?: string;
  font_family?: string;
  background_color?: string;
  volume?: number;
}

export interface ComposeTracksRequest {
  width: number;
  height: number;
  fps: number;
  output_path: string;
  tracks: TrackItem[];
  background_color?: string;
  audio_bitrate?: string;
  video_bitrate?: string;
}

export interface OverlayRequest {
  background_path: string;
  overlay_path: string;
  output_path: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  opacity: number;
  start: number;
  duration: number;
}

export interface AddTextRequest {
  input_path: string;
  output_path: string;
  text: string;
  x: number;
  y: number;
  font_size: number;
  font_color: string;
  font_family: string;
  start: number;
  duration: number;
  background_color?: string;
}

export interface MixAudioRequest {
  inputs: string[];
  output_path: string;
  volumes?: number[];
}


export interface KeyframePoint {
  time: number;
  value: number;
  interpolation?: "linear" | "ease-in-out";
}

export interface KeyframeAnimation {
  property: "x" | "y" | "scale" | "opacity" | "rotation" | "brightness" | "contrast" | "saturation";
  keyframes: KeyframePoint[];
}

export interface ApplyKeyframesRequest {
  input_path: string;
  output_path: string;
  animations: KeyframeAnimation[];
  width: number;
  height: number;
}

export interface OverlayKeyframesRequest {
  background_path: string;
  overlay_path: string;
  output_path: string;
  animations: KeyframeAnimation[];
  width: number;
  height: number;
  start: number;
  duration: number;
}

export interface SlideTransitionRequest {
  clip_a: string;
  clip_b: string;
  output_path: string;
  duration: number;
  direction: "left" | "right" | "up" | "down";
}

export interface SplitScreenRequest {
  inputs: string[];
  output_path: string;
  layout: string;
}

export interface BackgroundMusicRequest {
  video_path: string;
  audio_path: string;
  output_path: string;
  video_volume: number;
  bgm_volume: number;
}

export interface ChangeSpeedRequest {
  input_path: string;
  output_path: string;
  speed: number;
}

export interface FadeRequest {
  input_path: string;
  output_path: string;
  fade_in: number;
  fade_out: number;
}

export interface VideoOperationResult {
  success: boolean;
  message: string;
}


export const videoEditorCommands = {

  async exportVideo(
    clips: ClipInfo[],
    options: ExportOptions
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_export", { clips, options });
  },

  async getVideoMetadata(path: string): Promise<VideoMetadata | null> {
    return await invoke("cmd_video_metadata", { path });
  },

  async generateThumbnail(
    path: string,
    options: ThumbnailOptions
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_thumbnail", { path, options });
  },

  async trimVideo(
    inputPath: string,
    outputPath: string,
    start: number,
    duration: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_trim", {
      inputPath,
      outputPath,
      start,
      duration,
    });
  },

  async concatVideos(
    inputs: string[],
    outputPath: string
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_concat", { inputs, outputPath });
  },

  async extractAudio(
    inputPath: string,
    outputPath: string
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_extract_audio", { inputPath, outputPath });
  },

  async applyFilter(
    inputPath: string,
    outputPath: string,
    filterType: string,
    intensity?: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_filter", {
      inputPath,
      outputPath,
      filterType,
      intensity: intensity || 0.5,
    });
  },

  async getVideoDuration(path: string): Promise<number> {
    return await invoke("cmd_video_duration", { path });
  },

  async validateVideo(path: string): Promise<boolean> {
    return await invoke("cmd_video_validate", { path });
  },


  async composeTracks(request: ComposeTracksRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_compose_tracks", { request });
  },

  async overlayMedia(request: OverlayRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_overlay", { request });
  },

  async addTextOverlay(request: AddTextRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_add_text", { request });
  },

  async addEmojiOverlay(
    inputPath: string,
    outputPath: string,
    emoji: string,
    x: number,
    y: number,
    size: number,
    start: number,
    duration: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_add_emoji", {
      inputPath,
      outputPath,
      emoji,
      x,
      y,
      size,
      start,
      duration,
    });
  },

  async mixAudio(request: MixAudioRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_mix_audio", { request });
  },


  async applyKeyframes(request: ApplyKeyframesRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_apply_keyframes", { request });
  },

  async applyOverlayKeyframes(request: OverlayKeyframesRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_overlay_keyframes", { request });
  },

  async createSlideTransition(request: SlideTransitionRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_slide_transition", { request });
  },

  async createSplitScreen(request: SplitScreenRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_create_split_screen", { request });
  },

  async addBackgroundMusic(request: BackgroundMusicRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_add_background_music", { request });
  },

  async changeSpeed(request: ChangeSpeedRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_change_speed", { request });
  },

  async addFade(request: FadeRequest): Promise<VideoOperationResult> {
    return await invoke("cmd_video_add_fade", { request });
  },

  async rotateVideo(
    inputPath: string,
    outputPath: string,
    degrees: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_rotate", { inputPath, outputPath, degrees });
  },

  async flipVideo(
    inputPath: string,
    outputPath: string,
    direction: "horizontal" | "vertical" | "both"
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_flip", { inputPath, outputPath, direction });
  },

  async adjustVolume(
    inputPath: string,
    outputPath: string,
    volume: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_adjust_volume", { inputPath, outputPath, volume });
  },

  async addWatermark(
    inputPath: string,
    watermarkPath: string,
    outputPath: string,
    position: "topleft" | "topright" | "bottomleft" | "bottomright" | "center",
    marginX: number,
    marginY: number,
    opacity: number,
    scale?: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_add_watermark", {
      inputPath,
      watermarkPath,
      outputPath,
      position,
      marginX,
      marginY,
      opacity,
      scale,
    });
  },

  async generateGif(
    inputPath: string,
    outputPath: string,
    fps: number,
    start: number,
    duration: number,
    width?: number,
    height?: number,
    quality: number = 50
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_generate_gif", {
      inputPath,
      outputPath,
      fps,
      width,
      height,
      start,
      duration,
      quality,
    });
  },

  async compressVideo(
    inputPath: string,
    outputPath: string,
    crf: number = 23,
    preset: string = "medium",
    videoBitrate?: string,
    audioBitrate?: string,
    scaleWidth?: number,
    scaleHeight?: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_compress", {
      inputPath,
      outputPath,
      crf,
      preset,
      videoBitrate,
      audioBitrate,
      scaleWidth,
      scaleHeight,
    });
  },

  async audioFade(
    inputPath: string,
    outputPath: string,
    fadeIn: number,
    fadeOut: number
  ): Promise<VideoOperationResult> {
    return await invoke("cmd_video_audio_fade", { inputPath, outputPath, fadeIn, fadeOut });
  },
};

