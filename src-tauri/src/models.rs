use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Word {
    pub word: String,
    pub start: f64,
    pub end: f64,
    pub importance: f32, // 0.0 to 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionSegment {
    pub id: String,
    pub start: f64,
    pub end: f64,
    pub text: String,
    pub words: Vec<Word>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum OverlayType {
    Text { text: String },
    Image { path: String },
    Emoji { emoji: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayItem {
    pub id: String,
    pub overlay_type: OverlayType,
    pub start: f64,
    pub end: f64,
    pub x: f32,
    pub y: f32,
    pub scale: f32,
    pub font_size: f32,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportConfig {
    pub video_path: String,
    pub captions: Vec<CaptionSegment>,
    pub overlays: Vec<OverlayItem>,
    pub background_audio: Option<String>,
    pub background_audio_volume: f32,
    pub output_format: String,
    pub quality: String,
}
