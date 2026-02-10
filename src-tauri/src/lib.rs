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

// [修改] 增加重试机制 (Max 3 times)
#[tauri::command]
async fn fetch_user_stats(platform: String, handle: String, cookie: Option<String>) -> Result<UserStats, String> {
    // [Debug] 打印接收到的请求
    println!("\n[Lib] 收到前端请求: Platform='{}', Handle='{}'", platform, handle);

    let max_retries = 3;
    let mut last_error = String::new();

    for attempt in 1..=max_retries {
        if attempt > 1 {
            println!("[Lib] 第 {} 次重试...", attempt);
        }

        // 根据平台分发请求
        let res = match platform.to_lowercase().as_str() {
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
                // 使用 as_deref 借用 cookie 内容，避免所有权转移导致无法重试
                let user_cookie = cookie.as_deref().unwrap_or("");
                platforms::nowcoder::fetch_user_stats(&handle, user_cookie)
                    .await
                    .map_err(|e| e.to_string())
            },
            "leetcode" => {
                println!("[Lib] 进入 LeetCode 处理分支"); 
                platforms::leetcode::fetch_user_stats(&handle)
                    .await
                    .map_err(|e| e.to_string())
            },
            _ => Err(format!("Platform '{}' not supported yet", platform)),
        };

        match res {
            Ok(stats) => {
                println!("[Lib] 请求成功，返回数据: {:?}", stats);
                return Ok(stats); // 成功则直接返回
            }
            Err(e) => {
                println!("[Lib] 请求失败: {}", e);
                last_error = e;
                // 如果不是最后一次尝试，则等待后重试
                if attempt < max_retries {
                    // 简单的指数退避或固定延迟，这里用固定 800ms 防止请求过于频繁
                    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
                }
            }
        }
    }

    // 3次全部失败，返回最后一次的错误
    println!("[Lib] 3次重试全部失败，抛出错误");
    Err(last_error)
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