use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

#[derive(Debug, Error, Serialize, Deserialize)]
pub enum FileError {
    #[error("Directory not found: {0}")]
    DirectoryNotFound(String),

    #[error("Failed to read directory: {0}")]
    ReadError(String),

    #[error("Failed to read file metadata: {0}")]
    MetadataError(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Failed to delete: {0}")]
    DeleteError(String),
}

#[derive(Debug, PartialEq, Eq)]
enum NaturalSegment<'a> {
    Text(&'a str),
    Number(u64),
}

#[inline]
fn natural_cmp(a: &str, b: &str) -> Ordering {
    let a_lower = a.to_lowercase();
    let b_lower = b.to_lowercase();

    let mut a_iter = NaturalSegmentIter::new(&a_lower);
    let mut b_iter = NaturalSegmentIter::new(&b_lower);

    loop {
        match (a_iter.next(), b_iter.next()) {
            (None, None) => return Ordering::Equal,
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(seg_a), Some(seg_b)) => {
                let cmp = match (seg_a, seg_b) {
                    (NaturalSegment::Number(na), NaturalSegment::Number(nb)) => na.cmp(&nb),
                    (NaturalSegment::Text(ta), NaturalSegment::Text(tb)) => ta.cmp(tb),
                    (NaturalSegment::Number(_), NaturalSegment::Text(_)) => Ordering::Less,
                    (NaturalSegment::Text(_), NaturalSegment::Number(_)) => Ordering::Greater,
                };
                if cmp != Ordering::Equal {
                    return cmp;
                }
            }
        }
    }
}

struct NaturalSegmentIter<'a> {
    remaining: &'a str,
}

impl<'a> NaturalSegmentIter<'a> {
    fn new(s: &'a str) -> Self {
        Self { remaining: s }
    }
}

impl<'a> Iterator for NaturalSegmentIter<'a> {
    type Item = NaturalSegment<'a>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.remaining.is_empty() {
            return None;
        }

        let first_char = self.remaining.chars().next()?;

        if first_char.is_ascii_digit() {
            let end = self
                .remaining
                .char_indices()
                .find(|(_, c)| !c.is_ascii_digit())
                .map(|(i, _)| i)
                .unwrap_or(self.remaining.len());

            let num_str = &self.remaining[..end];
            self.remaining = &self.remaining[end..];

            let num = num_str.parse::<u64>().unwrap_or(0);
            Some(NaturalSegment::Number(num))
        } else {
            let end = self
                .remaining
                .char_indices()
                .find(|(_, c)| c.is_ascii_digit())
                .map(|(i, _)| i)
                .unwrap_or(self.remaining.len());

            let text = &self.remaining[..end];
            self.remaining = &self.remaining[end..];
            Some(NaturalSegment::Text(text))
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    name: String,
    size: u64,
    is_file: bool,
    is_directory: bool,
    path: String,
    created_at: Option<u64>,
    modified_at: Option<u64>,
    accessed_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareItemDto {
    id: usize,
    name: String,
    path: String,
    from: &'static str,
    device: &'static str,
    status: &'static str,
    uploaded_at: String,
    is_readed: bool,
    can_download: bool,
    size: String,
    #[serde(rename = "type")]
    file_type: &'static str,
}

#[inline]
fn to_millis(time: std::io::Result<SystemTime>) -> Option<u64> {
    time.ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
}

#[tauri::command]
pub fn read_files_in_dir(path: String) -> Result<Vec<FileMetadata>, FileError> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(FileError::DirectoryNotFound(path));
    }

    let entries = fs::read_dir(dir_path).map_err(|e| FileError::ReadError(e.to_string()))?;

    let mut files = Vec::with_capacity(128);

    for entry_result in entries {
        let entry = match entry_result {
            Ok(e) => e,
            Err(_) => continue,
        };

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let file_name = entry.file_name().to_string_lossy().into_owned();
        let file_path = entry.path().to_string_lossy().into_owned();

        files.push(FileMetadata {
            name: file_name,
            size: metadata.len(),
            is_file: metadata.is_file(),
            is_directory: metadata.is_dir(),
            path: file_path,
            created_at: to_millis(metadata.created()),
            modified_at: to_millis(metadata.modified()),
            accessed_at: to_millis(metadata.accessed()),
        });
    }

    files.sort_unstable_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        _ => natural_cmp(&a.name, &b.name),
    });

    Ok(files)
}

#[inline]
fn format_file_size(size: u64) -> String {
    if size == 0 {
        return "0 B".to_string();
    }

    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let size_f64 = size as f64;
    let exponent = (size_f64.ln() / 1024_f64.ln()).floor() as usize;
    let unit_index = exponent.min(UNITS.len() - 1);
    let divisor = 1024_f64.powi(unit_index as i32);
    let formatted_size = size_f64 / divisor;

    format!("{:.2} {}", formatted_size, UNITS[unit_index])
}

#[inline]
fn get_file_type(name: &str, is_dir: bool) -> &'static str {
    if is_dir {
        return "folder";
    }

    let ext = Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    match ext.as_deref() {
        Some("pdf") => "pdf",
        Some("doc" | "docx" | "txt" | "md" | "rtf" | "odt") => "document",
        Some("jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "ico") => "image",
        Some("mp4" | "mov" | "mkv" | "avi" | "wmv" | "flv" | "webm") => "video",
        Some("mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a") => "audio",
        Some("zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz") => "archive",
        Some(
            "js" | "ts" | "jsx" | "tsx" | "rs" | "py" | "go" | "java" | "c" | "cpp" | "h" | "hpp"
            | "html" | "css" | "scss" | "json" | "yaml" | "toml" | "xml",
        ) => "code",
        Some("exe" | "msi" | "dmg" | "app" | "deb" | "rpm") => "executable",
        Some("xls" | "xlsx" | "csv") => "spreadsheet",
        Some("ppt" | "pptx" | "key") => "presentation",
        _ => "file",
    }
}

#[tauri::command]
pub fn read_files_ready_to_use(path: String) -> Result<Vec<ShareItemDto>, FileError> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(FileError::DirectoryNotFound(path));
    }

    let entries = fs::read_dir(dir_path).map_err(|e| FileError::ReadError(e.to_string()))?;

    let mut files: Vec<ShareItemDto> = Vec::with_capacity(256);
    let mut id_counter: usize = 1;

    for entry_result in entries {
        let entry = match entry_result {
            Ok(e) => e,
            Err(_) => continue,
        };

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let name = entry.file_name().to_string_lossy().into_owned();
        let file_path = entry.path().to_string_lossy().into_owned();
        let is_dir = metadata.is_dir();

        let date_str = metadata
            .created()
            .or_else(|_| metadata.modified())
            .ok()
            .and_then(|time| {
                let datetime: chrono::DateTime<chrono::Local> = time.into();
                Some(datetime.format("%d %b %Y %H:%M").to_string())
            })
            .unwrap_or_else(|| "-".to_string());

        let is_from_me = id_counter % 2 == 0;

        files.push(ShareItemDto {
            id: id_counter,
            name: name.clone(),
            path: file_path,
            from: if is_from_me { "me" } else { "buddy" },
            device: if is_from_me {
                "MacBook Pro"
            } else {
                "iPhone 15"
            },
            status: "success",
            uploaded_at: date_str,
            is_readed: true,
            can_download: !is_dir,
            size: format_file_size(metadata.len()),
            file_type: get_file_type(&name, is_dir),
        });

        id_counter += 1;
    }

    files.sort_unstable_by(|a, b| {
        let a_is_folder = a.file_type == "folder";
        let b_is_folder = b.file_type == "folder";
        match (a_is_folder, b_is_folder) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => natural_cmp(&a.name, &b.name),
        }
    });

    for (idx, file) in files.iter_mut().enumerate() {
        file.id = idx + 1;
    }

    Ok(files)
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), FileError> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(FileError::FileNotFound(path));
    }

    let path_clone = path.clone();
    let is_dir = file_path.is_dir();

    tokio::task::spawn_blocking(move || {
        if is_dir {
            fs::remove_dir_all(&path_clone)
        } else {
            fs::remove_file(&path_clone)
        }
    })
    .await
    .map_err(|e| FileError::DeleteError(format!("Task join error: {}", e)))?
    .map_err(|e| FileError::DeleteError(e.to_string()))?;

    Ok(())
}
