use crate::models::{ExportConfig, OverlayType};
use tauri_plugin_shell::ShellExt;
use std::path::PathBuf;
use std::fs;
use uuid::Uuid;

pub fn build_export_args(
    config: &ExportConfig,
    ass_path_str: &str,
    output_path_str: &str,
) -> Result<Vec<String>, String> {
    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(), config.video_path.clone()
    ];
    
    let mut filter_complex = String::new();
    let mut current_v_in = "[0:v]".to_string();
    let mut inputs_count = 1;
    
    for (i, overlay) in config.overlays.iter().enumerate() {
        if let OverlayType::Image { path } = &overlay.overlay_type {
            args.push("-i".to_string());
            args.push(path.clone());
            
            let overlay_in = format!("[{}:v]", inputs_count);
            let next_v_in = format!("[v_out_{}]", i);
            
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
    
    let final_v_out = "[v_final]";
    if !filter_complex.is_empty() {
        filter_complex.push(';');
    }
    filter_complex.push_str(&format!(
        "{}subtitles='{}'{}",
        current_v_in, ass_path_str, final_v_out
    ));
    
    let mut final_a_out = "[0:a]".to_string();
    if let Some(bg_audio) = &config.background_audio {
        args.push("-i".to_string());
        args.push(bg_audio.clone());
        let bg_audio_idx = inputs_count;
        
        final_a_out = "[a_final]".to_string();
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
    args.push("-c:v".to_string());
    args.push("libx264".to_string());
    args.push("-preset".to_string());
    args.push("slow".to_string());
    
    let crf = match config.quality.as_str() {
        "high" => "18",
        "medium" => "23",
        "low" => "28",
        _ => "23",
    };
    args.push("-crf".to_string());
    args.push(crf.to_string());
    args.push("-c:a".to_string());
    args.push("aac".to_string());
    args.push("-b:a".to_string());
    args.push("192k".to_string());
    args.push(output_path_str.to_string());

    Ok(args)
}

#[tauri::command]
pub async fn export_video(
    app: tauri::AppHandle,
    config: ExportConfig,
) -> Result<String, String> {
    let temp_dir = tempfile::Builder::new()
        .prefix("ud_export_")
        .tempdir()
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let ass_content = crate::ass::generate_ass(&config.captions, 1920, 1080);
    let ass_path = temp_dir.path().join("subtitles.ass");
    fs::write(&ass_path, ass_content).map_err(|e| format!("Failed to write ASS file: {}", e))?;
    
    let ass_path_str = ass_path.to_string_lossy().replace('\\', "/").replace(':', "\\:");
    let ext = if config.output_format.is_empty() { "mp4" } else { &config.output_format };
    let output_name = format!("exported_{}.{}", Uuid::new_v4().as_simple().to_string().chars().take(8).collect::<String>(), ext);
    let output_path = PathBuf::from(&config.video_path).with_file_name(output_name);
    let output_path_str = output_path.to_string_lossy().to_string();

    let args = build_export_args(&config, &ass_path_str, &output_path_str)?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{OverlayItem, OverlayType};

    #[test]
    fn test_build_export_args_integration() {
        let config = ExportConfig {
            video_path: "input.mp4".to_string(),
            captions: vec![],
            overlays: vec![
                OverlayItem {
                    id: "1".to_string(),
                    overlay_type: OverlayType::Image { path: "overlay.png".to_string() },
                    start: 1.0, end: 5.0, x: 100.0, y: 100.0, scale: 1.0, font_size: 16.0, color: "#fff".to_string()
                }
            ],
            background_audio: Some("bg.mp3".to_string()),
            background_audio_volume: 0.5,
            output_format: "mp4".to_string(),
            quality: "high".to_string(),
        };

        let args = build_export_args(&config, "C\\:/temp/subtitles.ass", "output.mp4").unwrap();

        // Check if complex filter is constructed correctly containing the overlay, subtitle, and amix
        let filter_complex = args.iter().position(|r| r == "-filter_complex").map(|i| &args[i + 1]).unwrap();
        
        assert!(filter_complex.contains("[0:v][1:v]overlay=x=100"));
        assert!(filter_complex.contains("subtitles='C\\:/temp/subtitles.ass'"));
        assert!(filter_complex.contains("amix=inputs=2:duration=first:weights=1 0.5[a_final]"));
        
        // Assert quality param crf = 18 for 'high'
        let crf = args.iter().position(|r| r == "-crf").map(|i| &args[i + 1]).unwrap();
        assert_eq!(crf, "18");
    }
}

