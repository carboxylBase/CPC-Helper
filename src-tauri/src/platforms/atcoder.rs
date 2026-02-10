use crate::models::{Contest, UserStats};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use reqwest::header;
use scraper::{Html, Selector};
use serde::Deserialize;

// 定义 Kenkoooo AC Rank 响应结构
#[derive(Debug, Deserialize)]
struct KenkooooAcRank {
    count: u32,
}

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    // 1. 请求 AtCoder 官网的比赛列表页面
    let url = "https://atcoder.jp/contests/?lang=en";

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
        .build()?;

    let resp = client.get(url)
        .header(header::ACCEPT_LANGUAGE, "en-US,en;q=0.9")
        .send()
        .await?;

    let html_content = resp.text().await?;
    let document = Html::parse_document(&html_content);
    
    let table_selector = Selector::parse("#contest-table-upcoming tbody tr").unwrap();
    let time_selector = Selector::parse("td:nth-child(1) time").unwrap();
    let link_selector = Selector::parse("td:nth-child(2) a").unwrap();

    let mut contests = Vec::new();

    for row in document.select(&table_selector) {
        let start_time_str = match row.select(&time_selector).next() {
            Some(el) => el.inner_html(),
            None => continue, 
        };

        let start_time = DateTime::parse_from_str(&start_time_str, "%Y-%m-%d %H:%M:%S%z")
            .context("Failed to parse AtCoder date")?
            .with_timezone(&Utc);

        let anchor = match row.select(&link_selector).next() {
            Some(el) => el,
            None => continue,
        };

        let name = anchor.text().collect::<Vec<_>>().join("");
        let href = anchor.value().attr("href").unwrap_or("");
        let full_url = format!("https://atcoder.jp{}", href);

        contests.push(Contest {
            name,
            start_time,
            url: full_url,
            platform: "AtCoder".to_string(),
        });
    }

    Ok(contests)
}

// [终极修复版]
// 依赖 Cargo.toml 中的 features = ["gzip"]
// 不再手动设置 Accept-Encoding，reqwest 会自动模拟浏览器行为并自动解压
pub async fn fetch_user_stats(handle: &str) -> Result<UserStats> {
    println!("[AtCoder Debug] Starting fetch for handle: {}", handle);

    let client = reqwest::Client::builder()
        // 使用 Firefox UA
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0")
        .build()?;

    // ---------------------------------------------------------
    // 第一步：请求 Kenkoooo (ac_rank)
    // ---------------------------------------------------------
    let ac_url = format!("https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user={}", handle);
    
    let ac_req = client.get(&ac_url)
        .header("Accept", "application/json")
        .header("Accept-Language", "en-US,en;q=0.5")
        .header("Referer", "https://kenkoooo.com/");
        // 注意：这里不需要再手动设置 Accept-Encoding 了
        // 只要 Cargo.toml 里开了 gzip，reqwest 会自动带上 gzip 头并自动解压
    
    println!("[AtCoder Debug] Sending Kenkoooo Request (ac_rank)...");
    
    let solved_count = match ac_req.send().await {
        Ok(resp) => {
            let status = resp.status();
            println!("[AtCoder Debug] Kenkoooo Status: {}", status);
            
            if status.is_success() {
                match resp.json::<KenkooooAcRank>().await {
                    Ok(info) => {
                        println!("[AtCoder Debug] Fetched AC Count: {}", info.count);
                        info.count
                    },
                    Err(e) => {
                        println!("[AtCoder Debug] JSON Parse Error: {}", e);
                        0
                    }
                }
            } else {
                if status == reqwest::StatusCode::NOT_FOUND {
                    println!("[AtCoder Debug] 404 Not Found! Please check capitalization (e.g. 'User' vs 'user')");
                } else if status == reqwest::StatusCode::FORBIDDEN {
                    println!("[AtCoder Debug] 403 Forbidden. Is 'gzip' feature enabled in Cargo.toml?");
                }
                0
            }
        },
        Err(e) => {
            println!("[AtCoder Debug] Network Error: {}", e);
            0
        }
    };

    // ---------------------------------------------------------
    // 第二步：请求 AtCoder Profile (Rating)
    // ---------------------------------------------------------
    let profile_url = format!("https://atcoder.jp/users/{}", handle);
    let profile_req = client.get(&profile_url)
         .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");

    println!("[AtCoder Debug] Sending Profile Request...");

    let mut rating: Option<u32> = None;
    let mut rank_str: Option<String> = None;

    match profile_req.send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                let html = resp.text().await.unwrap_or_default();
                let document = Html::parse_document(&html);

                let tr_selector = Selector::parse("tr").unwrap();
                let th_selector = Selector::parse("th").unwrap();
                let td_selector = Selector::parse("td").unwrap();
                
                for row in document.select(&tr_selector) {
                    if let Some(th) = row.select(&th_selector).next() {
                        let header_text = th.text().collect::<String>();
                        if header_text.contains("Rating") {
                            if let Some(td) = row.select(&td_selector).next() {
                                let td_text = td.text().collect::<String>();
                                let clean_text = td_text.trim();
                                if let Some(first_part) = clean_text.split_whitespace().next() {
                                    if let Ok(val) = first_part.parse::<u32>() {
                                        rating = Some(val);
                                        rank_str = Some(format!("Rating: {}", val));
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
        },
        Err(e) => {
             println!("[AtCoder Debug] Profile Network Error: {}", e);
        }
    }

    Ok(UserStats {
        platform: "AtCoder".to_string(),
        handle: handle.to_string(),
        solved_count,
        rank: rank_str,
        rating,
    })
}