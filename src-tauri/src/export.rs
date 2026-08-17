use crate::models::{ExportConfig, OverlayType};
use tauri_plugin_shell::ShellExt;
use std::path::PathBuf;
use std::fs;
use uuid::Uuid;

#[tauri::command]
pub async fn export_video(
    app: tauri::AppHandle,
    config: ExportConfig,
) -> Result<String, String> {
    // 1. Generate ASS file in temp dir
    let temp_dir = tempfile::Builder::new()
        .prefix("ud_export_")
        .tempdir()
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    // We assume 1920x1080 for ASS generation unless we can query it. 
    // This maintains the aspect ratio styling.
    let ass_content = crate::ass::generate_ass(&config.captions, 1920, 1080);
    let ass_path = temp_dir.path().join("subtitles.ass");
    fs::write(&ass_path, ass_content).map_err(|e| format!("Failed to write ASS file: {}", e))?;
    
    // Convert path to string format ffmpeg expects 
    // ffmpeg subtitles filter needs Windows paths to use forward slashes and escaped colons
    let ass_path_str = ass_path.to_string_lossy().replace('\\', "/").replace(':', "\\:");
    
    // Determine output file path
    let ext = if config.output_format.is_empty() { "mp4" } else { &config.output_format };
    let output_name = format!("exported_{}.{}", Uuid::new_v4().as_simple().to_string().chars().take(8).collect::<String>(), ext);
    let output_path = PathBuf::from(&config.video_path).with_file_name(output_name);
    let output_path_str = output_path.to_string_lossy().to_string();

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(), config.video_path.clone()
    ];
    
    let mut filter_complex = String::new();
    let mut current_v_in = "[0:v]".to_string();
    let mut inputs_count = 1; // index 0 is the original video
    
    // 2. Process Overlays
    for (i, overlay) in config.overlays.iter().enumerate() {
        if let OverlayType::Image { path } = &overlay.overlay_type {
            args.push("-i".to_string());
            args.push(path.clone());
            
            let overlay_in = format!("[{}:v]", inputs_count);
            let next_v_in = format!("[v_out_{}]", i);
            
            // e.g. [0:v][1:v]overlay=x=100:y=100:enable='between(t,0,5)'[v_out_0]
            if !filter_complex.is_empty() {
                filter_complex.push(';');
            }
            
            filter_complex.push_str(&format!(
                "{}{}overlay=x={}:y={}:enable='between(t,{},{})'{}",
                current_v_in, overlay_in, overlay.x, overlay.y, overlay.start, overlay.end, next_v_in
            ));
            
            current_v_in = next_v_in;
            inputs_count += 1;
        } else {
            return Err("Text and Emoji overlays must be converted to PNGs by the frontend first.".to_string());
        }
    }
    
    // 3. Apply subtitles filter
    let final_v_out = "[v_final]";
    if !filter_complex.is_empty() {
        filter_complex.push(';');
    }
    filter_complex.push_str(&format!(
        "{}subtitles='{}'{}",
        current_v_in, ass_path_str, final_v_out
    ));
    
    // 4. Audio mixing
    let mut final_a_out = "[0:a]".to_string();
    if let Some(bg_audio) = &config.background_audio {
        args.push("-i".to_string());
        args.push(bg_audio.clone());
        let bg_audio_idx = inputs_count;
        // inputs_count += 1; // Unneeded unless we add more inputs later
        
        final_a_out = "[a_final]".to_string();
        // mix original audio [0:a] with bg_audio [idx:a]
        filter_complex.push_str(&format!(
            ";[0:a][{}:a]amix=inputs=2:duration=first:weights=1 {}{}",
            bg_audio_idx, config.background_audio_volume, final_a_out
        ));
    }
    
    args.push("-filter_complex".to_string());
    args.push(filter_complex);
    
    args.push("-map".to_string());
    args.push(final_v_out.to_string());
    
    args.push("-map".to_string());
    args.push(final_a_out);
    
    // 5. Video codec & Quality
    args.push("-c:v".to_string());
    args.push("libx264".to_string());
    
    args.push("-preset".to_string());
    args.push("slow".to_string());
    
    let crf = match config.quality.as_str() {
        "high" => "18",
        "medium" => "23",
        "low" => "28",
        _ => "23", // Default to medium
    };
    args.push("-crf".to_string());
    args.push(crf.to_string());
    
    // Audio codec
    args.push("-c:a".to_string());
    args.push("aac".to_string());
    args.push("-b:a".to_string());
    args.push("192k".to_string());
    
    // Output path
    args.push(output_path_str.clone());

    // 6. Run Sidecar ffmpeg
    let sidecar_command = app.shell()
        .sidecar("binaries/ffmpeg")
        .map_err(|e| format!("Failed to get ffmpeg sidecar: {}", e))?;
        
    let output = sidecar_command
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;
        
    if output.status.success() {
        Ok(output_path_str)
    } else {
        let err_msg = String::from_utf8(output.stderr).unwrap_or_else(|_| "Unknown ffmpeg error".to_string());
        Err(format!("ffmpeg error: {}", err_msg))
    }
}
