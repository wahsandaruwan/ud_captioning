use crate::models::CaptionSegment;

pub fn format_ass_time(seconds: f64) -> String {
    let total_centisecs = (seconds * 100.0).round() as u64;
    let hours = total_centisecs / 360000;
    let remainder = total_centisecs % 360000;
    let minutes = remainder / 6000;
    let remainder = remainder % 6000;
    let secs = remainder / 100;
    let centisecs = remainder % 100;
    
    // ASS timestamp format: H:MM:SS.CC
    format!("{}:{:02}:{:02}.{:02}", hours, minutes, secs, centisecs)
}

pub fn generate_ass(captions: &[CaptionSegment], width: u32, height: u32) -> String {
    let mut ass = String::new();
    
    // Script Info
    ass.push_str("[Script Info]\n");
    ass.push_str("ScriptType: v4.00+\n");
    ass.push_str(&format!("PlayResX: {}\n", width));
    ass.push_str(&format!("PlayResY: {}\n", height));
    ass.push_str("WrapStyle: 0\n\n");
    
    // V4+ Styles
    ass.push_str("[V4+ Styles]\n");
    ass.push_str("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n");
    ass.push_str("Style: Default,Noto Sans,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1\n\n");
    
    // Events
    ass.push_str("[Events]\n");
    ass.push_str("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n");
    
    for caption in captions {
        let start_time = format_ass_time(caption.start);
        let end_time = format_ass_time(caption.end);
        
        let mut dialogue_text = String::new();
        if caption.words.is_empty() && !caption.text.is_empty() {
            dialogue_text = caption.text.clone();
        } else {
            for (i, word) in caption.words.iter().enumerate() {
                if i > 0 {
                    dialogue_text.push(' ');
                }
                
                if word.importance > 0.7 {
                    dialogue_text.push_str(&format!("{{\\b1\\c&H0000FF&}}{}{{\\b0\\c&HFFFFFF&}}", word.word));
                } else {
                    dialogue_text.push_str(&word.word);
                }
            }
        }
        
        ass.push_str(&format!("Dialogue: 0,{},{},Default,,0,0,0,,{}\n", start_time, end_time, dialogue_text));
    }
    
    ass
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Word;

    #[test]
    fn test_format_ass_time() {
        assert_eq!(format_ass_time(0.0), "0:00:00.00");
        assert_eq!(format_ass_time(1.234), "0:00:01.23");
        assert_eq!(format_ass_time(1.236), "0:00:01.24");
        assert_eq!(format_ass_time(3661.99), "1:01:01.99");
        assert_eq!(format_ass_time(3599.999), "1:00:00.00");
    }

    #[test]
    fn test_generate_ass() {
        let captions = vec![
            CaptionSegment {
                id: "1".to_string(),
                start: 0.5,
                end: 2.0,
                text: "Hello world this is important".to_string(),
                words: vec![
                    Word { word: "Hello".to_string(), start: 0.5, end: 0.8, importance: 0.2 },
                    Word { word: "world".to_string(), start: 0.8, end: 1.2, importance: 0.1 },
                    Word { word: "this".to_string(), start: 1.2, end: 1.4, importance: 0.3 },
                    Word { word: "is".to_string(), start: 1.4, end: 1.6, importance: 0.4 },
                    Word { word: "important".to_string(), start: 1.6, end: 2.0, importance: 0.9 },
                ],
            }
        ];

        let ass = generate_ass(&captions, 1920, 1080);

        assert!(ass.contains("[Script Info]"));
        assert!(ass.contains("PlayResX: 1920"));
        assert!(ass.contains("PlayResY: 1080"));
        // Make sure it contains the proper highlighting tags for the word "important"
        assert!(ass.contains("Dialogue: 0,0:00:00.50,0:00:02.00,Default,,0,0,0,,Hello world this is {\\b1\\c&H0000FF&}important{\\b0\\c&HFFFFFF&}"));
    }
}
