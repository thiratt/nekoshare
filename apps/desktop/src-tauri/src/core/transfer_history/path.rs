use anyhow::{Context, Result};
use std::path::PathBuf;

pub(crate) const DB_RELATIVE_DIR: &str = "Nekoshare/db";
pub(crate) const DB_FILE_NAME: &str = "transfer.sqlite";

pub(crate) fn resolve_db_path() -> Result<PathBuf> {
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let mut path = PathBuf::from(local_app_data);
        path.push(DB_RELATIVE_DIR);
        path.push(DB_FILE_NAME);
        return Ok(path);
    }

    let project_dirs = directories::ProjectDirs::from("", "", "Nekoshare")
        .context("failed to resolve project dirs for transfer db")?;
    let mut path = PathBuf::from(project_dirs.data_local_dir());
    path.push("db");
    path.push(DB_FILE_NAME);
    Ok(path)
}
