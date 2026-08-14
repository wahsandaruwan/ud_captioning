use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use base64::{Engine as _, engine::general_purpose};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use crate::models::{CaptionSegment, Word};
use std::time::Duration;
use gcp_auth::{CustomServiceAccount, TokenProvider};

// Google Speech API request structures
#[derive(Serialize)]
struct SpeechRequest {
    config: SpeechConfig,
    audio: SpeechAudio,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SpeechConfig {
    encoding: String,
    sample_rate_hertz: i32,
    language_code: String,
    enable_word_time_offsets: bool,
}

#[derive(Serialize)]
struct SpeechAudio {
    content: String,
}

#[derive(Deserialize, Debug)]
struct OperationResponse {
    name: String,
    done: Option<bool>,
    response: Option<serde_json::Value>,
    error: Option<serde_json::Value>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub message: String,
    pub percent: i32,
}

pub async fn transcribe_audio_impl(
    app: AppHandle,
    wav_path: String,
    language_code: String,
    service_account_path: String,
) -> Result<Vec<CaptionSegment>, String> {
    
    app.emit("transcription-progress", ProgressEvent {
        message: "Reading service account key...".to_string(),
        percent: 5,
    }).map_err(|e| e.to_string())?;

    // Load custom service account
    let sa = CustomServiceAccount::from_file(&service_account_path)
        .map_err(|e| format!("Failed to load service account {}: {}", service_account_path, e))?;
    
    let token = sa.token(&["https://www.googleapis.com/auth/cloud-platform"])
        .await
        .map_err(|e| format!("Failed to get GCP token: {}", e))?;

    app.emit("transcription-progress", ProgressEvent {
        message: "Reading audio file...".to_string(),
        percent: 10,
    }).map_err(|e| e.to_string())?;

    let audio_data = fs::read(&wav_path)
        .map_err(|e| format!("Failed to read audio file: {}", e))?;
    let base64_audio = general_purpose::STANDARD.encode(&audio_data);

    let client = Client::new();
    
    let request_body = SpeechRequest {
        config: SpeechConfig {
            encoding: "LINEAR16".to_string(),
            sample_rate_hertz: 16000,
            language_code,
            enable_word_time_offsets: true,
        },
        audio: SpeechAudio {
            content: base64_audio,
        },
    };

    app.emit("transcription-progress", ProgressEvent {
        message: "Starting long-running transcription...".to_string(),
        percent: 30,
    }).map_err(|e| e.to_string())?;

    let res = client.post("https://speech.googleapis.com/v1/speech:longrunningrecognize")
        .bearer_auth(token.as_str())
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Google API Error: {}", err_text));
    }

    let op: OperationResponse = res.json().await
        .map_err(|e| format!("Failed to parse operation response: {}", e))?;
    
    let operation_name = op.name;
    
    // Poll the operation
    let mut current_percent = 30;
    
    loop {
        tokio::time::sleep(Duration::from_secs(4)).await; // avoid hitting rate limits easily
        
        current_percent = std::cmp::min(current_percent + 2, 95);
        app.emit("transcription-progress", ProgressEvent {
            message: "Transcribing audio...".to_string(),
            percent: current_percent,
        }).map_err(|e| e.to_string())?;
        
        // re-fetch token in case it expires
        let token = sa.token(&["https://www.googleapis.com/auth/cloud-platform"])
            .await
            .map_err(|e| format!("Failed to get GCP token: {}", e))?;

        let poll_url = format!("https://speech.googleapis.com/v1/operations/{}", operation_name);
        
        let poll_res = client.get(&poll_url)
            .bearer_auth(token.as_str())
            .send()
            .await
            .map_err(|e| format!("Failed to poll operation: {}", e))?;
            
        if !poll_res.status().is_success() {
            let err_text = poll_res.text().await.unwrap_or_default();
            return Err(format!("Google API Poll Error: {}", err_text));
        }

        let poll_op: OperationResponse = poll_res.json().await
            .map_err(|e| format!("Failed to parse poll response: {}", e))?;
            
        if poll_op.done.unwrap_or(false) {
            if let Some(error) = poll_op.error {
                return Err(format!("Transcription failed: {:?}", error));
            }
            
            if let Some(response) = poll_op.response {
                app.emit("transcription-progress", ProgressEvent {
                    message: "Parsing results...".to_string(),
                    percent: 100,
                }).map_err(|e| e.to_string())?;
                
                return parse_google_speech_response(response);
            } else {
                return Err("No response in operation result".to_string());
            }
        }
    }
}

fn parse_google_speech_response(response: serde_json::Value) -> Result<Vec<CaptionSegment>, String> {
    let mut segments = Vec::new();
    
    let results = response.get("results")
        .and_then(|v| v.as_array())
        .ok_or("No results found in response")?;
        
    for result in results {
        let alternatives = result.get("alternatives").and_then(|v| v.as_array());
        if let Some(alts) = alternatives {
            if alts.is_empty() { continue; }
            let first_alt = &alts[0];
            
            let transcript = first_alt.get("transcript").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let words_json = first_alt.get("words").and_then(|v| v.as_array());
            
            let mut words = Vec::new();
            let mut seg_start = f64::MAX;
            let mut seg_end = 0.0;
            
            if let Some(w_array) = words_json {
                for w_val in w_array {
                    let word_str = w_val.get("word").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let start_time = parse_time(w_val.get("startTime"));
                    let end_time = parse_time(w_val.get("endTime"));
                    
                    if start_time < seg_start { seg_start = start_time; }
                    if end_time > seg_end { seg_end = end_time; }
                    
                    words.push(Word {
                        word: word_str,
                        start: start_time,
                        end: end_time,
                        importance: 1.0, // Default importance
                    });
                }
            }
            
            // Handle edge case where segment had no timing information
            if seg_start == f64::MAX { seg_start = 0.0; }
            
            segments.push(CaptionSegment {
                id: Uuid::new_v4().to_string(),
                start: seg_start,
                end: seg_end,
                text: transcript,
                words,
            });
        }
    }
    
    Ok(segments)
}

fn parse_time(time_val: Option<&serde_json::Value>) -> f64 {
    match time_val {
        Some(serde_json::Value::String(s)) => {
            // Format is "1.234s"
            let num_str = s.trim_end_matches('s');
            num_str.parse::<f64>().unwrap_or(0.0)
        },
        _ => 0.0,
    }
}
