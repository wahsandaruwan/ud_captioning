pub mod models;
pub mod google_speech;
pub mod gemini;
pub mod ass;

use tauri_plugin_shell::ShellExt;
use tauri_plugin_store::StoreExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn check_ffmpeg_version(app: tauri::AppHandle) -> Result<String, String> {
    // Resolve and execute the sidecar
    let sidecar_command = app.shell().sidecar("binaries/ffmpeg").map_err(|e| e.to_string())?;
    
    let output = sidecar_command
        .args(["-version"])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(String::from_utf8(output.stdout).unwrap_or_else(|_| "Invalid UTF-8".to_string()))
    } else {
        Err(String::from_utf8(output.stderr).unwrap_or_else(|_| "Unknown error".to_string()))
    }
}

#[tauri::command]
async fn extract_audio(app: tauri::AppHandle, video_path: String) -> Result<String, String> {
    // Create a temporary directory that won't be immediately deleted
    let temp_dir = tempfile::Builder::new()
        .prefix("ud_captioning_")
        .tempdir()
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    // Convert to path and keep it from being deleted
    #[allow(deprecated)]
    let temp_dir_path = temp_dir.into_path();
    let wav_path = temp_dir_path.join("audio.wav");
    let wav_path_str = wav_path.to_string_lossy().to_string();
    
    // Note: ensure the sidecar name matches your tauri.conf.json bundle configuration
    let sidecar_command = app.shell()
        .sidecar("binaries/ffmpeg")
        .map_err(|e| format!("Failed to get ffmpeg sidecar: {}", e))?;
    
    // Arguments: -i <video_path> -vn -ac 1 -ar 16000 -acodec pcm_s16le <wav_path>
    let output = sidecar_command
        .args([
            "-i", &video_path,
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-acodec", "pcm_s16le",
            "-y",
            &wav_path_str
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;
        
    if output.status.success() {
        Ok(wav_path_str)
    } else {
        let err_msg = String::from_utf8(output.stderr).unwrap_or_else(|_| "Unknown ffmpeg error".to_string());
        Err(format!("ffmpeg error: {}", err_msg))
    }
}

#[tauri::command]
async fn transcribe_audio(
    app: tauri::AppHandle,
    wav_path: String,
    language_code: String,
) -> Result<Vec<crate::models::CaptionSegment>, String> {
    // Read the service account path from the store
    let store = app.store("store.json").map_err(|e| format!("Store error: {}", e))?;
    
    let service_account_path = store.get("google_key_path")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or("Google service account key path not found in store. Please configure it first.")?;
        
    crate::google_speech::transcribe_audio_impl(app, wav_path, language_code, service_account_path).await
}

#[tauri::command]
async fn extract_important_words(
    app: tauri::AppHandle,
    segments: Vec<crate::models::CaptionSegment>,
    language_code: String,
) -> Result<Vec<crate::models::CaptionSegment>, String> {
    crate::gemini::extract_important_words_impl(app, segments, language_code).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, check_ffmpeg_version, extract_audio, transcribe_audio, extract_important_words])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
