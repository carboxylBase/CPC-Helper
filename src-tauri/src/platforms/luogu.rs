use crate::models::{UserStats, Contest};
use reqwest::{header, Client, Response};
use serde::Deserialize;
use anyhow::{Result, anyhow}; // [修改] 使用 anyhow 处理错误
use regex::Regex;
use chrono::{Duration, Utc, TimeZone};

// ==================== 1. 结构体定义 ====================

// --- 通用/用户相关 ---
#[derive(Debug, Deserialize)]
struct LuoguResponse {
    #[serde(default)]
    code: i32,
    #[serde(rename = "currentData")]
    current_data: CurrentData,
}

#[derive(Debug, Deserialize)]
struct CurrentData {
    // 用户查询用
    #[serde(default)]
    user: Option<UserInfo>,
    #[serde(default)]
    elo: Vec<EloStats>,
    
    // 比赛查询用
    #[serde(default)]
    contests: Option<ContestResult>,
}

// --- 用户战绩相关 ---
#[derive(Debug, Deserialize)]
struct UserInfo {
    #[serde(rename = "passedProblemCount")]
    passed_problem_count: i32,
    #[serde(default)]
    ranking: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct EloStats {
    rating: i32,
}

// --- 比赛列表相关 ---
#[derive(Debug, Deserialize)]
struct ContestResult {
    result: Vec<LuoguRawContest>,
}

#[derive(Debug, Deserialize)]
struct LuoguRawContest {
    id: i32,
    name: String,
    #[serde(rename = "startTime")]
    start_time: i64,
    #[serde(rename = "endTime")]
    #[allow(dead_code)] // 消除 unused warning
    end_time: i64,
}

// ==================== 2. 核心网络辅助函数 (WAF 处理器) ====================

/// 通用的请求函数，封装了 Client 构建、Header 伪装、WAF Cookie 重试逻辑
/// [修改] 返回类型改为 anyhow::Result<String>
async fn fetch_raw_content(url: &str) -> Result<String> {
    let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    let referer = url;

    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none()) 
        .build()?;

    let mut resp: Response = client.get(url)
        .header(header::USER_AGENT, user_agent)
        .header(header::ACCEPT, "application/json, text/plain, */*") 
        .header("x-luogu-type", "content-only")
        .header(header::REFERER, referer)
        .send()
        .await?;

    // 处理 WAF 重定向 (302/307)
    if resp.status().is_redirection() {
        let cookies: Vec<String> = resp.headers()
            .get_all(header::SET_COOKIE)
            .iter()
            .filter_map(|h| h.to_str().ok())
            .map(|s| s.split(';').next().unwrap_or("").to_string())
            .collect();

        if !cookies.is_empty() {
            let cookie_str = cookies.join("; ");
            let location = resp.headers()
                .get(header::LOCATION)
                .and_then(|h| h.to_str().ok())
                .unwrap_or(url);

            // 携带 Cookie 重试
            resp = client.get(location)
                .header(header::USER_AGENT, user_agent)
                .header(header::ACCEPT, "application/json, text/plain, */*")
                .header("x-luogu-type", "content-only")
                .header(header::COOKIE, cookie_str) 
                .send()
                .await?;
        }
    }

    let text = resp.text().await?;
    Ok(text)
}

// ==================== 3. 业务功能实现 ====================

// [修改] 返回类型改为 anyhow::Result
pub async fn fetch_contests() -> Result<Vec<Contest>> {
    let url = "https://www.luogu.com.cn/contest/list?_contentOnly=1";
    let raw_text = fetch_raw_content(url).await?;

    // 尝试解析 JSON
    let luogu_resp: LuoguResponse = serde_json::from_str(&raw_text).map_err(|e| {
        anyhow!("Failed to parse Luogu contest list: {}", e)
    })?;

    if luogu_resp.code != 200 {
        return Err(anyhow!("Luogu API error code: {}", luogu_resp.code));
    }

    let mut contests = Vec::new();
    
    if let Some(data) = luogu_resp.current_data.contests {
        let now = Utc::now();
        let two_weeks_later = now + Duration::days(14);

        for raw in data.result {
            let start_time = Utc.timestamp_opt(raw.start_time, 0).single().unwrap_or(now);
            
            // 筛选条件：开始时间在未来且在两周内
            if start_time > now && start_time < two_weeks_later {
                contests.push(Contest {
                    platform: "Luogu".to_string(),
                    name: raw.name,
                    url: format!("https://www.luogu.com.cn/contest/{}", raw.id),
                    start_time,
                });
            }
        }
    }

    contests.sort_by(|a, b| a.start_time.cmp(&b.start_time));
    
    Ok(contests)
}

// [修改] 返回类型改为 anyhow::Result
pub async fn fetch_user_stats(uid: &str) -> Result<UserStats> {
    let url = format!("https://www.luogu.com.cn/user/{}?_contentOnly=1", uid);
    let raw_text = fetch_raw_content(&url).await?;

    // === 逻辑分支 1: HTML Fallback ===
    if raw_text.trim().starts_with('<') {
        let passed_regex = Regex::new(r#""passedProblemCount"\s*:\s*(\d+)"#).unwrap();
        let passed_count: u32 = passed_regex.captures(&raw_text)
            .and_then(|c| c[1].parse().ok())
            .unwrap_or(0);

        let elo_regex = Regex::new(r#""elo"\s*:\s*\[\s*\{\s*"rating"\s*:\s*(\d+)"#).unwrap();
        let elo_rating: Option<u32> = elo_regex.captures(&raw_text)
            .and_then(|c| c[1].parse().ok());

        if passed_count > 0 {
            return Ok(UserStats {
                platform: "Luogu".to_string(),
                handle: uid.to_string(),
                rating: elo_rating,
                rank: None,
                solved_count: passed_count,
            });
        }
        return Err(anyhow!("Luogu HTML parse failed"));
    }

    // === 逻辑分支 2: 标准 JSON API ===
    let luogu_data: LuoguResponse = serde_json::from_str(&raw_text)?;

    if luogu_data.code != 200 {
        return Err(anyhow!("Luogu API returned error code: {}", luogu_data.code));
    }

    let user = luogu_data.current_data.user.ok_or_else(|| anyhow!("Missing user data"))?;
    
    let rating = luogu_data.current_data.elo.first().map(|e| e.rating as u32);

    Ok(UserStats {
        platform: "Luogu".to_string(),
        handle: uid.to_string(),
        rating,
        rank: user.ranking.map(|r| r.to_string()),
        solved_count: user.passed_problem_count as u32,
    })
}