use super::core::Ffmpeg;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
/// A single keyframe point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyframePoint {
    /// Time in seconds
    pub time: f64,
    /// Value at this time (could be position, scale, opacity, rotation, etc.)
    pub value: f64,
    /// Interpolation type: "linear" (default) or "ease-in-out"
    #[serde(default = "default_interpolation")]
    pub interpolation: String,
}
fn default_interpolation() -> String {
    "linear".to_string()
}
/// Keyframe animation parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyframeAnimation {
    /// Property to animate: x, y, scale, opacity, rotation, brightness, etc.
    pub property: String,
    /// Keyframes sorted by time
    pub keyframes: Vec<KeyframePoint>,
}
/// Keyframe animation request for a track item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyframeTrackRequest {
    /// The track item to animate
    pub track: super::compose::TrackItem,
    /// Animations to apply (one or more properties)
    pub animations: Vec<KeyframeAnimation>,
}
impl Ffmpeg {
    /// Generate FFmpeg filter expression for keyframe animations
    /// Returns a tuple of (filter_expression, needs_zoompan)
    pub fn generate_keyframe_filter(&self, animations: &[KeyframeAnimation], width: u32, height: u32) -> String {
        let mut filter_parts = Vec::new();
        for anim in animations {
            let expr = self.generate_single_keyframe_filter(anim, width, height);
            if !expr.is_empty() {
                filter_parts.push(expr);
            }
        }
        filter_parts.join(",")
    }
    /// Generate single keyframe filter expression
    fn generate_single_keyframe_filter(&self, anim: &KeyframeAnimation, width: u32, height: u32) -> String {
        if anim.keyframes.len() < 2 {
            return String::new();
        }
        let mut sorted_kf = anim.keyframes.clone();
        sorted_kf.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap_or(std::cmp::Ordering::Equal));
        // Build interpolation expression using FFmpeg's expression syntax
        // Using: val = lerp(val1, val2, t) where t = (time - t1) / (t2 - t1)
        let property = anim.property.as_str();
        match property {
            "scale" | "opacity" | "brightness" | "contrast" | "saturation" => self.build_numeric_keyframe(&sorted_kf, property),
            "x" | "y" | "rotation" => self.build_position_keyframe(&sorted_kf, property, width, height),
            _ => String::new(),
        }
    }
    /// Build keyframe expression for numeric properties
    fn build_numeric_keyframe(&self, keyframes: &[KeyframePoint], property: &str) -> String {
        let mut expr_parts = Vec::new();
        for i in 0..keyframes.len() - 1 {
            let kf1 = &keyframes[i];
            let kf2 = &keyframes[i + 1];
            let t1 = kf1.time;
            let t2 = kf2.time;
            let v1 = kf1.value;
            let v2 = kf2.value;
            // Use FFmpeg expression: if(t >= t1 && t < t2, lerp(v1, v2, (t - t1)/(t2 - t1)), ...)
            let lerp_expr = format!("lerp({}, {}, (t - {}) / ({:.10} - {:.10}))", v1, v2, t1, t2, t1);
            let condition = if i == 0 {
                format!("if(t < {}, {})", t2, lerp_expr)
            } else if i == keyframes.len() - 2 {
                format!("if(t >= {}, {})", t1, lerp_expr)
            } else {
                format!("if(t >= {} && t < {}, {})", t1, t2, lerp_expr)
            };
            expr_parts.push(condition);
        }
        // Handle before first and after last
        let first_val = keyframes.first().unwrap().value;
        let last_val = keyframes.last().unwrap().value;
        let first_time = keyframes.first().unwrap().time;
        let last_time = keyframes.last().unwrap().time;
        let final_expr = format!(
            "if(t < {}, {}, if(t < {}, {}, {}))",
            first_time,
            first_val,
            last_time,
            // Build the chained conditions
            expr_parts.join(" "),
            last_val
        );
        match property {
            "opacity" => format!("format=rgba,colorchannelmixer=aa={}", final_expr),
            "scale" => format!("scale=iw*{}:ih*{}", final_expr, final_expr),
            _ => format!("eq={}={}", property, final_expr),
        }
    }
    /// Build keyframe expression for position (x, y)
    fn build_position_keyframe(&self, keyframes: &[KeyframePoint], property: &str, _width: u32, _height: u32) -> String {
        let mut expr_parts = Vec::new();
        for i in 0..keyframes.len() - 1 {
            let kf1 = &keyframes[i];
            let kf2 = &keyframes[i + 1];
            let t1 = kf1.time;
            let t2 = kf2.time;
            let v1 = kf1.value;
            let v2 = kf2.value;
            let lerp_expr = format!("lerp({}, {}, (t - {}) / ({:.10} - {:.10}))", v1, v2, t1, t2, t1);
            let condition = if i == 0 {
                format!("if(t < {}, {})", t2, lerp_expr)
            } else if i == keyframes.len() - 2 {
                format!("if(t >= {}, {})", t1, lerp_expr)
            } else {
                format!("if(t >= {} && t < {}, {})", t1, t2, lerp_expr)
            };
            expr_parts.push(condition);
        }
        let first_val = keyframes.first().unwrap().value;
        let last_val = keyframes.last().unwrap().value;
        let first_time = keyframes.first().unwrap().time;
        let last_time = keyframes.last().unwrap().time;
        format!("if(t < {}, {}, if(t < {}, {}, {}))", first_time, first_val, last_time, expr_parts.join(" "), last_val)
    }
    /// Apply keyframe animation to a video or overlay
    pub fn apply_keyframe_animation(
        &self,
        input_path: &str,
        output_path: &str,
        animations: &[KeyframeAnimation],
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let filter_expr = self.generate_keyframe_filter(animations, width, height);
        if filter_expr.is_empty() {
            return Err("No valid keyframe animations".to_string());
        }
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-vf", &filter_expr, "-c:a", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to apply keyframe animation: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Apply keyframe animation to an overlay (image/video on top of another)
    /// This is used for animating overlay position, scale, opacity, rotation
    pub fn apply_overlay_keyframe_animation(
        &self,
        background_path: &str,
        overlay_path: &str,
        output_path: &str,
        animations: &[KeyframeAnimation],
        width: u32,
        height: u32,
        start: f64,
        duration: f64,
    ) -> Result<(), String> {
        if !Path::new(background_path).exists() {
            return Err(format!("Background file not found: {}", background_path));
        }
        if !Path::new(overlay_path).exists() {
            return Err(format!("Overlay file not found: {}", overlay_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        // Extract x and y animations
        let x_anim = animations.iter().find(|a| a.property == "x");
        let y_anim = animations.iter().find(|a| a.property == "y");
        let scale_anim = animations.iter().find(|a| a.property == "scale");
        let opacity_anim = animations.iter().find(|a| a.property == "opacity");
        let rotation_anim = animations.iter().find(|a| a.property == "rotation");
        // Build overlay filter chain
        let mut overlay_filter = String::new();
        // Scale
        if let Some(anim) = scale_anim {
            let scale_expr = self.generate_position_keyframe_expr(&anim.keyframes, "scale", start, duration, 1.0);
            if !scale_expr.is_empty() {
                overlay_filter.push_str(&format!("scale=iw*{}:ih*{}:", scale_expr, scale_expr));
            }
        }
        // Opacity
        if let Some(anim) = opacity_anim {
            let opacity_expr = self.generate_position_keyframe_expr(&anim.keyframes, "opacity", start, duration, 1.0);
            if !opacity_expr.is_empty() {
                overlay_filter.push_str(&format!("format=rgba,colorchannelmixer=aa={},", opacity_expr));
            }
        }
        // Rotation
        if let Some(anim) = rotation_anim {
            let rot_expr = self.generate_position_keyframe_expr(&anim.keyframes, "rotation", start, duration, 0.0);
            if !rot_expr.is_empty() {
                overlay_filter.push_str(&format!("rotate={}*PI/180:", rot_expr));
            }
        }
        // X position
        let x_expr =
            if let Some(anim) = x_anim { self.generate_position_keyframe_expr(&anim.keyframes, "x", start, duration, 0.0) } else { "0".to_string() };
        // Y position
        let y_expr =
            if let Some(anim) = y_anim { self.generate_position_keyframe_expr(&anim.keyframes, "y", start, duration, 0.0) } else { "0".to_string() };
        // Build the final command
        let filter_cmd = if overlay_filter.is_empty() {
            format!("[0:v][1:v]overlay={}:{}:enable='between(t,{},{})'[out]", x_expr, y_expr, start, start + duration)
        } else {
            // Remove trailing comma from overlay_filter
            let overlay_filter_trimmed = overlay_filter.trim_end_matches(',');
            format!(
                "[1:v]{}[ov];[0:v][ov]overlay={}:{}:enable='between(t,{},{})'[out]",
                overlay_filter_trimmed,
                x_expr,
                y_expr,
                start,
                start + duration
            )
        };
        let output = Command::new("ffmpeg")
            .args(["-i", background_path, "-i", overlay_path, "-filter_complex", &filter_cmd, "-map", "[out]", "-c:a", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to apply overlay keyframe animation: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Generate position keyframe expression with time offset
    fn generate_position_keyframe_expr(&self, keyframes: &[KeyframePoint], _property: &str, start: f64, duration: f64, default_val: f64) -> String {
        if keyframes.len() < 2 {
            return default_val.to_string();
        }
        let mut sorted_kf: Vec<KeyframePoint> = keyframes.to_vec();
        sorted_kf.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap_or(std::cmp::Ordering::Equal));
        // Offset time by start
        let mut expr_parts = Vec::new();
        for i in 0..sorted_kf.len() - 1 {
            let kf1 = &sorted_kf[i];
            let kf2 = &sorted_kf[i + 1];
            let t1 = kf1.time;
            let t2 = kf2.time;
            let v1 = kf1.value;
            let v2 = kf2.value;
            let lerp_expr = format!("lerp({}, {}, (t - {}) / ({:.10} - {:.10}))", v1, v2, t1, t2, t1);
            let condition = if i == 0 {
                format!("if(t < {}, {})", t2, lerp_expr)
            } else if i == sorted_kf.len() - 2 {
                format!("if(t >= {}, {})", t1, lerp_expr)
            } else {
                format!("if(t >= {} && t < {}, {})", t1, t2, lerp_expr)
            };
            expr_parts.push(condition);
        }
        if sorted_kf.is_empty() {
            return default_val.to_string();
        }
        let first_val = sorted_kf.first().unwrap().value;
        let last_val = sorted_kf.last().unwrap().value;
        let first_time = sorted_kf.first().unwrap().time;
        let last_time = sorted_kf.last().unwrap().time;
        format!("if(t < {}, {}, if(t < {}, {}, {}))", first_time, first_val, last_time, expr_parts.join(" "), last_val)
    }
    /// Create a slide transition between two clips using keyframes
    pub fn create_slide_transition(
        &self,
        clip_a: &str,
        clip_b: &str,
        output_path: &str,
        duration: f64,
        direction: &str, // "left", "right", "up", "down"
    ) -> Result<(), String> {
        if !Path::new(clip_a).exists() {
            return Err(format!("Clip A not found: {}", clip_a));
        }
        if !Path::new(clip_b).exists() {
            return Err(format!("Clip B not found: {}", clip_b));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let (start_x, end_x, start_y, end_y) = match direction {
            "left" => (0.0, -1920.0, 0.0, 0.0),
            "right" => (-1920.0, 0.0, 0.0, 0.0),
            "up" => (0.0, 0.0, 0.0, -1080.0),
            "down" => (0.0, 0.0, -1080.0, 0.0),
            _ => (0.0, -1920.0, 0.0, 0.0),
        };
        let filter_cmd = format!(
            "[0:v]setpts=PTS-STARTPTS[bg];\
         [1:v]setpts=PTS-STARTPTS,scale=1920:1080[fg];\
         [bg][fg]overlay=x='if(between(t,0,{}), lerp({}, {}, t/{}), {})':\
         y='if(between(t,0,{}), lerp({}, {}, t/{}), {})'[out]",
            duration, start_x, end_x, duration, end_x, duration, start_y, end_y, duration, end_y
        );
        let output = Command::new("ffmpeg")
            .args([
                "-i",
                clip_a,
                "-i",
                clip_b,
                "-filter_complex",
                &filter_cmd,
                "-map",
                "[out]",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "23",
                "-y",
                output_path,
            ])
            .output()
            .map_err(|e| format!("Failed to create slide transition: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_keyframe_animation_generation() {
        let ffmpeg = Ffmpeg::new();
        let animations = vec![
            KeyframeAnimation {
                property: "x".to_string(),
                keyframes: vec![
                    KeyframePoint { time: 0.0, value: 0.0, interpolation: "linear".to_string() },
                    KeyframePoint { time: 2.0, value: 100.0, interpolation: "linear".to_string() },
                ],
            },
            KeyframeAnimation {
                property: "y".to_string(),
                keyframes: vec![
                    KeyframePoint { time: 0.0, value: 0.0, interpolation: "linear".to_string() },
                    KeyframePoint { time: 2.0, value: 50.0, interpolation: "linear".to_string() },
                ],
            },
        ];
        let expr = ffmpeg.generate_keyframe_filter(&animations, 1920, 1080);
        println!("Generated keyframe filter: {}", expr);
        assert!(!expr.is_empty());
    }
}
