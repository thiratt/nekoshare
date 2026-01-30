use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchableItem {
    pub id: usize,
    pub name: String,
    pub device: Option<String>,
    pub friend_name: Option<String>,
    pub from: String,
    pub status: String,
    pub uploaded_at: String,
    pub is_readed: bool,
    pub can_download: bool,
    pub size: String,
    #[serde(rename = "type")]
    pub file_type: String,
    pub shared_with: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct SearchResult {
    pub item: SearchableItem,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub items: Vec<SearchableItem>,
    pub total: usize,
    pub query: String,
    pub time_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedSearchResponse {
    pub items: Vec<SearchableItem>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub total_pages: usize,
    pub query: String,
    pub time_ms: f64,
}

#[inline]
fn fuzzy_score(query: &str, target: &str, threshold: f64) -> f64 {
    if query.is_empty() {
        return 1.0;
    }

    let query_lower = query.to_lowercase();
    let target_lower = target.to_lowercase();

    if target_lower == query_lower {
        return 1.0;
    }

    if target_lower.contains(&query_lower) {
        let position_bonus = if target_lower.starts_with(&query_lower) {
            0.15
        } else {
            0.0
        };
        let length_ratio = query.len() as f64 / target.len() as f64;
        return 0.8 + (length_ratio * 0.1) + position_bonus;
    }

    let query_chars: Vec<char> = query_lower.chars().collect();
    let target_chars: Vec<char> = target_lower.chars().collect();

    let mut matched = 0;
    let mut target_idx = 0;
    let mut consecutive_matches = 0;
    let mut max_consecutive = 0;
    let mut first_match_idx: Option<usize> = None;

    for q_char in &query_chars {
        let mut found = false;
        while target_idx < target_chars.len() {
            if target_chars[target_idx] == *q_char {
                matched += 1;
                if first_match_idx.is_none() {
                    first_match_idx = Some(target_idx);
                }
                consecutive_matches += 1;
                max_consecutive = max_consecutive.max(consecutive_matches);
                target_idx += 1;
                found = true;
                break;
            }
            consecutive_matches = 0;
            target_idx += 1;
        }
        if !found {
            consecutive_matches = 0;
        }
    }

    if matched == 0 {
        return 0.0;
    }

    let match_ratio = matched as f64 / query_chars.len() as f64;
    let consecutive_bonus = (max_consecutive as f64 / query_chars.len() as f64) * 0.2;
    let position_bonus = match first_match_idx {
        Some(0) => 0.1,
        Some(idx) if idx < 3 => 0.05,
        _ => 0.0,
    };

    let score = (match_ratio * 0.7) + consecutive_bonus + position_bonus;

    if score >= threshold {
        score
    } else {
        0.0
    }
}

#[tauri::command]
pub fn search_items(items: Vec<SearchableItem>, query: String, threshold: f64) -> SearchResponse {
    use std::time::Instant;
    let start = Instant::now();

    let trimmed_query = query.trim();

    if trimmed_query.is_empty() {
        let total = items.len();
        return SearchResponse {
            items,
            total,
            query,
            time_ms: start.elapsed().as_secs_f64() * 1000.0,
        };
    }

    let threshold = if threshold <= 0.0 || threshold > 1.0 {
        0.3
    } else {
        threshold
    };

    let mut scored_items: Vec<(SearchableItem, f64)> = items
        .into_iter()
        .filter_map(|item| {
            let name_score = fuzzy_score(trimmed_query, &item.name, threshold);
            let device_score = item
                .device
                .as_ref()
                .map(|d| fuzzy_score(trimmed_query, d, threshold))
                .unwrap_or(0.0);
            let friend_score = item
                .friend_name
                .as_ref()
                .map(|f| fuzzy_score(trimmed_query, f, threshold))
                .unwrap_or(0.0);

            let max_score = name_score.max(device_score * 0.8).max(friend_score * 0.8);

            if max_score >= threshold {
                Some((item, max_score))
            } else {
                None
            }
        })
        .collect();

    scored_items.sort_by(|a, b| match b.1.partial_cmp(&a.1) {
        Some(Ordering::Equal) | None => a.0.name.cmp(&b.0.name),
        Some(ord) => ord,
    });

    let total = scored_items.len();
    let result_items: Vec<SearchableItem> =
        scored_items.into_iter().map(|(item, _)| item).collect();

    SearchResponse {
        items: result_items,
        total,
        query,
        time_ms: start.elapsed().as_secs_f64() * 1000.0,
    }
}


#[tauri::command]
pub fn search_items_paginated(
    items: Vec<SearchableItem>,
    query: String,
    threshold: f64,
    page: usize,
    page_size: usize,
) -> PaginatedSearchResponse {
    use std::time::Instant;
    let start = Instant::now();

    let search_result = search_items(items, query.clone(), threshold);
    let total = search_result.total;
    let page_size = page_size.max(1).min(1000);
    let total_pages = (total + page_size - 1) / page_size;
    let page = page.min(total_pages.saturating_sub(1));

    let start_idx = page * page_size;
    let end_idx = (start_idx + page_size).min(total);

    let page_items = if start_idx < total {
        search_result.items[start_idx..end_idx].to_vec()
    } else {
        Vec::new()
    };

    PaginatedSearchResponse {
        items: page_items,
        total,
        page,
        page_size,
        total_pages,
        query,
        time_ms: start.elapsed().as_secs_f64() * 1000.0,
    }
}
