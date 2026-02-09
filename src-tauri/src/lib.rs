use anyhow::Result;

mod models;
mod platforms {
    pub mod codeforces;
    pub mod atcoder;
    pub mod nowcoder;
    pub mod leetcode;
    pub mod hdu;
}

use models::Contest;

// 定义应用状态（如果需要缓存，目前主要用于结构占位）
struct AppState {
    // 这里可以根据需求添加缓存字段
}

#[tauri::command]
async fn fetch_all_contests() -> Result<Vec<Contest>, String> {
    println!("Fetching contests from all platforms...");

    // 并发执行所有爬虫
    let (cf_res, ac_res, nc_res, lc_res, hdu_res) = tokio::join!(
        platforms::codeforces::fetch_contests(),
        platforms::atcoder::fetch_contests(),
        platforms::nowcoder::fetch_contests(),
        platforms::leetcode::fetch_contests(),
        platforms::hdu::fetch_contests()
    );

    let mut all_contests = Vec::new();

    // 处理 Codeforces
    match cf_res {
        Ok(mut list) => all_contests.append(&mut list),
        Err(e) => println!("Error fetching Codeforces: {}", e),
    }

    // 处理 AtCoder
    match ac_res {
        Ok(mut list) => all_contests.append(&mut list),
        Err(e) => println!("Error fetching AtCoder: {}", e),
    }

    // 处理 NowCoder
    match nc_res {
        Ok(mut list) => all_contests.append(&mut list),
        Err(e) => println!("Error fetching NowCoder: {}", e),
    }

    // 处理 LeetCode
    match lc_res {
        Ok(mut list) => all_contests.append(&mut list),
        Err(e) => println!("Error fetching LeetCode: {}", e),
    }

    // 处理 HDU
    match hdu_res {
        Ok(mut list) => all_contests.append(&mut list),
        Err(e) => println!("Error fetching HDU: {}", e),
    }

    // 按时间排序
    all_contests.sort_by(|a, b| a.start_time.cmp(&b.start_time));

    Ok(all_contests)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {})
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![fetch_all_contests])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}