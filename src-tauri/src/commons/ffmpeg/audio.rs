use std::{fs, path::Path, process::Command};

/// Extract PCM audio data from an audio file at specified time range
///
/// This function uses ffmpeg to extract PCM audio data from the given audio file
/// within the specified time range. The audio is decoded to 32-bit float PCM format
/// at 44.1kHz with 2 channels, suitable for waveform rendering and audio analysis.
///
/// # Arguments
/// * `audio_path` - Path to the source audio file
/// * `start_time` - Start time in seconds
/// * `duration` - Duration in seconds to extract
///
/// # Returns
/// * `Ok(Vec<f32>)` - Vector of PCM samples (f32, -1.0 to 1.0)
/// * `Err(String)` - Error message if extraction fails
pub fn extract_audio_pcm_data_from_path(audio_path: &Path, start_time: f64, duration: f64) -> Result<Vec<f32>, String> {
    if !audio_path.exists() {
        return Ok(Vec::new());
    }
    if duration <= 0.0 {
        return Ok(Vec::new());
    }
    let output = Command::new("ffmpeg")
        .args([
            "-ss",
            &start_time.to_string(),
            "-i",
            audio_path.to_str().unwrap(),
            "-t",
            &duration.to_string(),
            "-vn",
            "-acodec",
            "pcm_f32le",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-f",
            "f32le",
            "-",
        ])
        .output()
        .map_err(|e| format!("Failed to extract audio: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Ok(Vec::new());
    }
    let samples: Vec<f32> = output.stdout.chunks_exact(4).map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]])).collect();
    Ok(samples)
}

/// Decode entire audio file to PCM and save to cache
///
/// This function decodes the entire audio file to 32-bit float PCM format
/// and saves it to the specified cache path. The output is suitable for
/// fast subsequent reads without re-decoding.
///
/// # Arguments
/// * `source_path` - Path to the source audio file
/// * `output_path` - Path where the PCM cache file will be written
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` - Error message if decoding fails
pub fn decode_audio_to_pcm(source_path: &Path, output_path: &Path) -> Result<(), String> {
    if !source_path.exists() {
        return Err(format!("Source file not found: {:?}", source_path));
    }
    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }
    let output = Command::new("ffmpeg")
        .args([
            "-i",
            source_path.to_str().unwrap(),
            "-vn",
            "-acodec",
            "pcm_f32le",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-f",
            "f32le",
            "-y",
            output_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to decode audio to PCM: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg audio decode failed: {}", stderr));
    }
    Ok(())
}

/// Read PCM data from cached file
///
/// Reads previously cached PCM data from the filesystem and converts it
/// to a vector of 32-bit float samples.
///
/// # Arguments
/// * `pcm_path` - Path to the PCM cache file
///
/// # Returns
/// * `Ok(Vec<f32>)` - Vector of PCM samples
/// * `Err(String)` - Error message if reading fails
pub fn read_pcm_from_cache(pcm_path: &Path) -> Result<Vec<f32>, String> {
    if !pcm_path.exists() {
        return Err(format!("PCM cache not found: {:?}", pcm_path));
    }
    let data = fs::read(pcm_path).map_err(|e| format!("Failed to read PCM: {}", e))?;
    let samples: Vec<f32> = data.chunks_exact(4).map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]])).collect();
    Ok(samples)
}

/// Extract PCM data from cached file with time range
///
/// Reads a subset of PCM data from the cache file within the specified
/// time range. The sample rate and channel count are assumed to be 44.1kHz stereo.
///
/// # Arguments
/// * `pcm_path` - Path to the PCM cache file
/// * `start_time` - Start time in seconds
/// * `duration` - Duration in seconds to extract
///
/// # Returns
/// * `Ok(Vec<f32>)` - Vector of PCM samples in the time range
/// * `Err(String)` - Error message if extraction fails
pub fn extract_pcm_from_cache(pcm_path: &Path, start_time: f64, duration: f64) -> Result<Vec<f32>, String> {
    let samples = read_pcm_from_cache(pcm_path)?;
    if samples.is_empty() {
        return Ok(Vec::new());
    }
    let sample_rate = 44100;
    let channels = 2;
    let samples_per_second = sample_rate * channels;
    let start_sample = (start_time * samples_per_second as f64) as usize;
    let end_sample = ((start_time + duration) * samples_per_second as f64) as usize;
    let start = start_sample.min(samples.len());
    let end = end_sample.min(samples.len());
    if start >= end {
        return Ok(Vec::new());
    }
    Ok(samples[start..end].to_vec())
}

/// Mix multiple audio sample vectors into a single mixed audio buffer with peak normalization
///
/// This function mixes multiple audio tracks by summing samples and then
/// applying peak normalization to prevent clipping. All input vectors must
/// have the same sample rate and channel count.
///
/// # Arguments
/// * `samples_list` - Vector of sample vectors to mix
///
/// # Returns
/// * `Vec<f32>` - Mixed audio buffer with peak normalization applied
pub fn mix_audio_samples(samples_list: Vec<Vec<f32>>) -> Vec<f32> {
    if samples_list.is_empty() {
        return Vec::new();
    }
    let max_len = samples_list.iter().map(|s| s.len()).max().unwrap_or(0);
    if max_len == 0 {
        return Vec::new();
    }
    let mut mixed = vec![0.0f32; max_len];
    for samples in samples_list {
        for (i, &sample) in samples.iter().enumerate() {
            if i < mixed.len() {
                mixed[i] += sample;
            }
        }
    }
    let max_peak = mixed.iter().map(|&s| s.abs()).fold(0.0_f32, |a, b| a.max(b));
    if max_peak > 1.0 {
        let scale = 1.0 / max_peak;
        for sample in &mut mixed {
            *sample *= scale;
        }
    }
    mixed
}
