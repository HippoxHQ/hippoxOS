use rodio::cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::sync::{Mutex, OnceLock};
/// Store an f32 into an atomic u32 without a Mutex.
#[inline]
pub fn store_level(target: &AtomicU32, value: f32) {
    target.store(value.to_bits(), Ordering::Relaxed);
}
/// Load an f32 from an atomic u32.
#[inline]
pub fn load_level(source: &AtomicU32) -> f32 {
    f32::from_bits(source.load(Ordering::Relaxed))
}
/// Compute the RMS of an interleaved f32 sample slice.
#[inline]
pub fn rms_f32(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let mut sum = 0.0f32;
    for &s in samples {
        sum += s * s;
    }
    (sum / samples.len() as f32).sqrt()
}
/// Compute the RMS of an interleaved i16 sample slice.
#[inline]
pub fn rms_i16(samples: &[i16]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let mut sum = 0.0f32;
    for &s in samples {
        let n = s as f32 / i16::MAX as f32;
        sum += n * n;
    }
    (sum / samples.len() as f32).sqrt()
}
/// Compute the RMS of an interleaved u16 sample slice.
#[inline]
pub fn rms_u16(samples: &[u16]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let mut sum = 0.0f32;
    for &s in samples {
        // u16 PCM is centered at 32768.
        let n = (s as f32 - 32768.0) / 32768.0;
        sum += n * n;
    }
    (sum / samples.len() as f32).sqrt()
}
/// Compute the RMS of an interleaved i32 sample slice.
#[inline]
pub fn rms_i32(samples: &[i32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let mut sum = 0.0f32;
    for &s in samples {
        let n = s as f32 / i32::MAX as f32;
        sum += n * n;
    }
    (sum / samples.len() as f32).sqrt()
}
/// Compute the RMS of an interleaved f64 sample slice.
#[inline]
pub fn rms_f64(samples: &[f64]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let mut sum = 0.0f32;
    for &s in samples {
        let n = s as f32;
        sum += n * n;
    }
    (sum / samples.len() as f32).sqrt()
}
/// Downmix an interleaved f32 buffer to mono i16 and append it to `buf`.
#[inline]
pub fn push_mono_from_f32(channels: usize, data: &[f32], buf: &Mutex<VecDeque<i16>>) {
    if channels == 0 || data.is_empty() {
        return;
    }
    let frames = data.len() / channels;
    if frames == 0 {
        return;
    }
    let mut mono: Vec<i16> = Vec::with_capacity(frames);
    for f in 0..frames {
        let mut acc = 0.0f32;
        for c in 0..channels {
            acc += data[f * channels + c];
        }
        let avg = (acc / channels as f32).clamp(-1.0, 1.0);
        mono.push((avg * i16::MAX as f32) as i16);
    }
    crate::subsystem::push_pcm_mono(buf, &mono);
}
/// Downmix an interleaved i16 buffer to mono i16 and append it to `buf`.
#[inline]
pub fn push_mono_from_i16(channels: usize, data: &[i16], buf: &Mutex<VecDeque<i16>>) {
    if channels == 0 || data.is_empty() {
        return;
    }
    let frames = data.len() / channels;
    if frames == 0 {
        return;
    }
    let mut mono: Vec<i16> = Vec::with_capacity(frames);
    for f in 0..frames {
        let mut acc: i32 = 0;
        for c in 0..channels {
            acc += data[f * channels + c] as i32;
        }
        let avg = acc / channels as i32;
        mono.push(avg.clamp(i16::MIN as i32, i16::MAX as i32) as i16);
    }
    crate::subsystem::push_pcm_mono(buf, &mono);
}
/// Downmix an interleaved u16 buffer to mono i16 and append it to `buf`.
#[inline]
pub fn push_mono_from_u16(channels: usize, data: &[u16], buf: &Mutex<VecDeque<i16>>) {
    if channels == 0 || data.is_empty() {
        return;
    }
    let frames = data.len() / channels;
    if frames == 0 {
        return;
    }
    let mut mono: Vec<i16> = Vec::with_capacity(frames);
    for f in 0..frames {
        let mut acc: i32 = 0;
        for c in 0..channels {
            // u16 PCM is centered at 32768.
            acc += data[f * channels + c] as i32 - 32768;
        }
        let avg = acc / channels as i32;
        mono.push(avg.clamp(i16::MIN as i32, i16::MAX as i32) as i16);
    }
    crate::subsystem::push_pcm_mono(buf, &mono);
}
/// Open the default microphone input device.
pub fn open_microphone_device() -> Result<rodio::cpal::Device, String> {
    let host = rodio::cpal::default_host();
    let device = host.default_input_device();
    match &device {
        Some(d) => match d.name() {
            Ok(_name) => {}
            Err(_e) => {}
        },
        None => {}
    }
    device.ok_or_else(|| "no default input device".to_string())
}
/// build an input stream on the default OUTPUT device.
#[cfg(target_os = "macos")]
pub fn open_system_audio_device() -> Result<rodio::cpal::Device, String> {
    let host = rodio::cpal::default_host();
    host.default_output_device().ok_or_else(|| "no default output device".to_string())
}
/// find a PulseAudio / PipeWire monitor source.
#[cfg(target_os = "linux")]
pub fn open_system_audio_device() -> Result<rodio::cpal::Device, String> {
    let host = rodio::cpal::default_host();
    let devices = host.input_devices().map_err(|e| format!("input_devices failed: {e}"))?;
    let default_sink = default_pulse_sink_name();
    let mut first_monitor: Option<rodio::cpal::Device> = None;
    for device in devices {
        let Ok(name) = device.name() else { continue };
        let lower = name.to_lowercase();
        if !lower.contains("monitor") {
            continue;
        }
        if let Some(ref sink) = default_sink {
            if lower.contains(&sink.to_lowercase()) {
                return Ok(device);
            }
        }
        if first_monitor.is_none() {
            first_monitor = Some(device);
        }
    }
    first_monitor.ok_or_else(|| "no PulseAudio monitor source found".to_string())
}
/// ask PulseAudio for the default sink name.
#[cfg(target_os = "linux")]
pub fn default_pulse_sink_name() -> Option<String> {
    let output = std::process::Command::new("pactl").arg("get-default-sink").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}
/// Build a CPAL input stream that updates a smoothed level into the given atomics.
pub fn build_input_stream(
    device: &rodio::cpal::Device,
    level_bits: &'static AtomicU32,
    active_flag: &'static AtomicBool,
    envelope: Arc<Mutex<crate::subsystem::AudioEnvelope>>,
) -> Result<rodio::cpal::Stream, String> {
    let config = device.default_input_config().map_err(|e| format!("default_input_config failed: {e}"))?;
    let sample_format = config.sample_format();
    let stream_config: rodio::cpal::StreamConfig = config.into();
    // Mark the source active as soon as we begin building the stream.
    active_flag.store(true, Ordering::Relaxed);
    let err_fn = |_err| {
        active_flag.store(false, Ordering::Relaxed);
    };
    let env_f32 = envelope.clone();
    let env_i16 = envelope.clone();
    let env_u16 = envelope.clone();
    let stream = match sample_format {
        rodio::cpal::SampleFormat::F32 => device
            .build_input_stream(
                &stream_config,
                move |data: &[f32], _| {
                    let rms = rms_f32(data);
                    if let Ok(mut env) = env_f32.lock() {
                        let smoothed = env.process(rms);
                        store_level(level_bits, smoothed);
                    }
                },
                err_fn,
                None,
            )
            .map_err(|e| format!("build_input_stream (f32) failed: {e}"))?,
        rodio::cpal::SampleFormat::I16 => device
            .build_input_stream(
                &stream_config,
                move |data: &[i16], _| {
                    let rms = rms_i16(data);
                    if let Ok(mut env) = env_i16.lock() {
                        let smoothed = env.process(rms);
                        store_level(level_bits, smoothed);
                    }
                },
                err_fn,
                None,
            )
            .map_err(|e| format!("build_input_stream (i16) failed: {e}"))?,
        rodio::cpal::SampleFormat::U16 => device
            .build_input_stream(
                &stream_config,
                move |data: &[u16], _| {
                    let rms = rms_u16(data);
                    if let Ok(mut env) = env_u16.lock() {
                        let smoothed = env.process(rms);
                        store_level(level_bits, smoothed);
                    }
                },
                err_fn,
                None,
            )
            .map_err(|e| format!("build_input_stream (u16) failed: {e}"))?,
        other => {
            return Err(format!("unsupported sample format: {other:?}"));
        }
    };
    stream.play().map_err(|e| format!("stream.play() failed: {e}"))?;
    Ok(stream)
}
/// Build a CPAL input stream that captures the RAW PCM samples into a process-global ring buffer, for real audio recording.
pub fn build_pcm_input_stream(device: &rodio::cpal::Device, target_buf: &'static Mutex<VecDeque<i16>>) -> Result<rodio::cpal::Stream, String> {
    let config = device.default_input_config().map_err(|e| format!("default_input_config failed: {e}"))?;
    let sample_format = config.sample_format();
    let channels: usize = config.channels() as usize;
    let stream_config: rodio::cpal::StreamConfig = config.into();
    let err_fn = |_err| {};
    let stream = match sample_format {
        rodio::cpal::SampleFormat::F32 => {
            let target = target_buf;
            device
                .build_input_stream(
                    &stream_config,
                    move |data: &[f32], _| {
                        push_mono_from_f32(channels, data, target);
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| format!("build_pcm_input_stream (f32) failed: {e}"))?
        }
        rodio::cpal::SampleFormat::I16 => {
            let target = target_buf;
            device
                .build_input_stream(
                    &stream_config,
                    move |data: &[i16], _| {
                        push_mono_from_i16(channels, data, target);
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| format!("build_pcm_input_stream (i16) failed: {e}"))?
        }
        rodio::cpal::SampleFormat::U16 => {
            let target = target_buf;
            device
                .build_input_stream(
                    &stream_config,
                    move |data: &[u16], _| {
                        push_mono_from_u16(channels, data, target);
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| format!("build_pcm_input_stream (u16) failed: {e}"))?
        }
        other => {
            return Err(format!("unsupported sample format: {other:?}"));
        }
    };
    stream.play().map_err(|e| format!("stream.play() failed: {e}"))?;
    Ok(stream)
}
/// Ensure the audio-level service is running.
pub fn ensure_audio_level_service() -> Result<(), String> {
    let cell = crate::subsystem::screen_record::types::AUDIO_LEVEL_SERVICE.get_or_init(|| {
        Mutex::new(crate::subsystem::AudioLevelService {
            _mic_stream: None,
            _system_stream: None,
            #[cfg(target_os = "windows")]
            _system_loopback: None,
            _mic_envelope: Arc::new(Mutex::new(crate::subsystem::AudioEnvelope::new())),
            _system_envelope: Arc::new(Mutex::new(crate::subsystem::AudioEnvelope::new())),
        })
    });
    let mut guard = cell.lock().map_err(|_| "audio-level service mutex poisoned".to_string())?;
    // Microphone: rebuild the stream if it is missing OR if the capture
    // callback has reported itself inactive.
    let mic_stream_alive = crate::subsystem::MIC_ACTIVE.load(Ordering::Relaxed);
    if guard._mic_stream.is_none() || !mic_stream_alive {
        let _ = guard._mic_stream.take();
        crate::subsystem::MIC_LEVEL_BITS.store(0f32.to_bits(), Ordering::Relaxed);
        crate::subsystem::MIC_ACTIVE.store(false, Ordering::Relaxed);
        match open_microphone_device() {
            Ok(device) => {
                match build_input_stream(&device, &crate::subsystem::MIC_LEVEL_BITS, &crate::subsystem::MIC_ACTIVE, guard._mic_envelope.clone()) {
                    Ok(s) => guard._mic_stream = Some(s),
                    Err(_e) => {
                        crate::subsystem::MIC_ACTIVE.store(false, Ordering::Relaxed);
                    }
                }
            }
            Err(_e) => {
                crate::subsystem::MIC_ACTIVE.store(false, Ordering::Relaxed);
            }
        }
    }
    // rebuild the stream if it is missing OR if the worker thread has reported itself inactive.
    #[cfg(target_os = "windows")]
    {
        let system_stream_alive = crate::subsystem::SYSTEM_ACTIVE.load(Ordering::Relaxed);
        if guard._system_loopback.is_none() || !system_stream_alive {
            let _ = guard._system_loopback.take();
            crate::subsystem::SYSTEM_LEVEL_BITS.store(0f32.to_bits(), Ordering::Relaxed);
            crate::subsystem::SYSTEM_ACTIVE.store(false, Ordering::Relaxed);
            match crate::subsystem::wasapi_loopback::start(
                &crate::subsystem::SYSTEM_LEVEL_BITS,
                &crate::subsystem::SYSTEM_ACTIVE,
                guard._system_envelope.clone(),
            ) {
                Ok(handle) => guard._system_loopback = Some(handle),
                Err(_e) => {
                    crate::subsystem::SYSTEM_ACTIVE.store(false, Ordering::Relaxed);
                }
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let system_stream_alive = crate::subsystem::SYSTEM_ACTIVE.load(Ordering::Relaxed);
        if guard._system_stream.is_none() || !system_stream_alive {
            let _ = guard._system_stream.take();
            crate::subsystem::SYSTEM_LEVEL_BITS.store(0f32.to_bits(), Ordering::Relaxed);
            crate::subsystem::SYSTEM_ACTIVE.store(false, Ordering::Relaxed);
            match open_system_audio_device() {
                Ok(device) => match build_input_stream(
                    &device,
                    &crate::subsystem::SYSTEM_LEVEL_BITS,
                    &crate::subsystem::SYSTEM_ACTIVE,
                    guard._system_envelope.clone(),
                ) {
                    Ok(s) => guard._system_stream = Some(s),
                    Err(_e) => {
                        crate::subsystem::SYSTEM_ACTIVE.store(false, Ordering::Relaxed);
                    }
                },
                Err(_e) => {
                    crate::subsystem::SYSTEM_ACTIVE.store(false, Ordering::Relaxed);
                }
            }
        }
    }
    Ok(())
}
