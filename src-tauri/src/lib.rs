use anyhow::Result;
use crate::models::{Contest, UserStats};

mod models;
mod platforms {
    pub mod codeforces;
    pub mod atcoder;
    pub mod nowcoder;
    pub mod leetcode;
    pub mod hdu;
}

#[tauri::command]
async fn fetch_all_contests() -> Result<Vec<Contest>, String> {
    // 并发执行所有平台的抓取任务
    let (cf_res, ac_res, nc_res, lc_res, hdu_res) = tokio::join!(
        platforms::codeforces::fetch_contests(),
        platforms::atcoder::fetch_contests(),
        platforms::nowcoder::fetch_contests(),
        platforms::leetcode::fetch_contests(),
        platforms::hdu::fetch_contests()
    );

    let mut all_contests = Vec::new();

    // 聚合结果，忽略单个平台的失败
    if let Ok(c) = cf_res { all_contests.extend(c); }
    if let Ok(c) = ac_res { all_contests.extend(c); }
    if let Ok(c) = nc_res { all_contests.extend(c); }
    if let Ok(c) = lc_res { all_contests.extend(c); }
    if let Ok(c) = hdu_res { all_contests.extend(c); }

    // 统一按开始时间排序
    all_contests.sort_by(|a, b| a.start_time.cmp(&b.start_time));

    Ok(all_contests)
}

// [修改] 增加 cookie 参数 (Option<String>)
#[tauri::command]
async fn fetch_user_stats(platform: String, handle: String, cookie: Option<String>) -> Result<UserStats, String> {
    match platform.to_lowercase().as_str() {
        "codeforces" => {
            platforms::codeforces::fetch_user_stats(&handle)
                .await
                .map_err(|e| e.to_string())
        },
        "atcoder" => {
            platforms::atcoder::fetch_user_stats(&handle)
                .await
                .map_err(|e| e.to_string())
        },
        "nowcoder" => {
            // [修改] 获取传入的 cookie，如果没传则默认为空字符串 (nowcoder 模块内部会检查并报错)
            let user_cookie = cookie.unwrap_or_default();
            platforms::nowcoder::fetch_user_stats(&handle, &user_cookie)
                .await
                .map_err(|e| e.to_string())
        },
        // 未来扩展
        // "leetcode" => platforms::leetcode::fetch_user_stats(&handle).await...
        _ => Err(format!("Platform '{}' not supported yet", platform)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init()) 
        .invoke_handler(tauri::generate_handler![
            fetch_all_contests, 
            fetch_user_stats 
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}