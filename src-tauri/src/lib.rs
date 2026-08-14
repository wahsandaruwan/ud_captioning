pub mod models;
use tauri_plugin_shell::ShellExt;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, check_ffmpeg_version])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
