use crate::models::{Contest, UserStats};
use anyhow::Result;
use chrono::{Datelike, FixedOffset, Local, NaiveDateTime, TimeZone, Utc};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, REFERER, USER_AGENT, COOKIE};
use reqwest::Client;
use scraper::{Html, Selector};
use regex::Regex;

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    // ... (fetch_contests 保持不变，这里省略以节省篇幅，请保留你原有的逻辑) ...
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"));
    headers.insert(ACCEPT, HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    headers.insert(REFERER, HeaderValue::from_static("https://ac.nowcoder.com/"));

    let client = Client::builder()
        .default_headers(headers)
        .build()?;

    let url = "https://ac.nowcoder.com/acm/contest/vip-index";
    let resp = client.get(url).send().await?;

    if !resp.status().is_success() {
        return Ok(vec![]);
    }

    let html_text = resp.text().await?;
    let document = Html::parse_document(&html_text);
    let mut contests = Vec::new();

    let item_selector = Selector::parse(".platform-item, .contest-item, tr[data-id]").unwrap();
    let name_selector = Selector::parse("h4 a, .contest-title a, td.title a").unwrap();
    
    for element in document.select(&item_selector) {
        let (name, relative_url) = match element.select(&name_selector).next() {
            Some(el) => {
                let text = el.text().collect::<Vec<_>>().join("").trim().to_string();
                let href = el.value().attr("href").unwrap_or("");
                (text, href.to_string())
            },
            None => continue,
        };

        if !relative_url.contains("/acm/contest/") { continue; }
        if relative_url.ends_with("/vip-index") { continue; }

        let full_url = format!("https://ac.nowcoder.com{}", relative_url);
        let raw_text = element.text().collect::<Vec<_>>().join(" ");
        
        if let (Some(start_time), true) = parse_nowcoder_time(&raw_text) {
            if start_time > Utc::now() {
                contests.push(Contest {
                    name,
                    start_time,
                    url: full_url,
                    platform: "NowCoder".to_string(),
                });
            }
        }
    }

    Ok(contests)
}

// [DEBUG 版] 打印接收到的 Cookie 和请求结果
pub async fn fetch_user_stats(uid: &str, cookie: &str) -> Result<UserStats> {
    println!("\n=== [NowCoder Debug] Function Called for UID: {} ===", uid);
    
    // 1. 检查 Cookie 接收情况
    println!("[NowCoder Debug] Raw Cookie Length: {}", cookie.len());
    if cookie.len() > 20 {
        println!("[NowCoder Debug] Cookie Preview: {}...", &cookie[..20]);
    } else {
        println!("[NowCoder Debug] Cookie Content: '{}'", cookie);
    }

    let clean_cookie = cookie.replace('\n', "").replace('\r', "").trim().to_string();
    
    if clean_cookie.is_empty() {
        println!("[NowCoder Debug] ERROR: Cookie is empty after cleaning!");
        return Err(anyhow::anyhow!("Cookie is empty"));
    }

    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .build()?;

    // 2. 发起主页请求
    let main_url = format!("https://ac.nowcoder.com/acm/contest/profile/{}", uid);
    println!("[NowCoder Debug] Requesting Main URL: {}", main_url);

    let main_req = client.get(&main_url)
        .header(ACCEPT, "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .header(REFERER, "https://ac.nowcoder.com/acm/contest/profile-index")
        .header(COOKIE, &clean_cookie)
        .send();

    let practice_url = format!("https://ac.nowcoder.com/acm/contest/profile/{}/practice-coding", uid);
    let practice_req = client.get(&practice_url)
        .header(ACCEPT, "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .header(REFERER, &main_url)
        .header(COOKIE, &clean_cookie)
        .send();

    println!("[NowCoder Debug] Sending requests...");
    let (main_res, practice_res) = tokio::join!(main_req, practice_req);

    // --- 解析 Rating ---
    let mut rating: Option<u32> = None;
    let mut rank_str: Option<String> = None;

    match main_res {
        Ok(resp) => {
            let status = resp.status();
            println!("[NowCoder Debug] Main Response Status: {}", status);
            
            if status.is_success() {
                let html = resp.text().await.unwrap_or_default();
                println!("[NowCoder Debug] Main HTML Length: {}", html.len());

                // 检查是否被拦截
                if html.contains("安全验证") || html.contains("login") {
                    println!("[NowCoder Debug] WARNING: Page seems to be a CAPTCHA or Login page!");
                }

                let re_class = Regex::new(r#"class="state-num[^"]*rate-score[^"]*">(\d+)"#).unwrap();
                let re_struct = Regex::new(r#">(\d+)</a>\s*</div>\s*<div[^>]*>\s*<span>Rating</span>"#).unwrap();
                let re_rank = Regex::new(r#"class="state-num">(\d+)</div>\s*<div[^>]*>\s*<span>Rating排名</span>"#).unwrap();

                if let Some(caps) = re_class.captures(&html) {
                    if let Ok(num) = caps[1].parse::<u32>() { 
                        rating = Some(num); 
                        println!("[NowCoder Debug] Found Rating (Class match): {}", num);
                    }
                } else if let Some(caps) = re_struct.captures(&html) {
                    if let Ok(num) = caps[1].parse::<u32>() { 
                        rating = Some(num);
                        println!("[NowCoder Debug] Found Rating (Struct match): {}", num);
                    }
                } else {
                    println!("[NowCoder Debug] Failed to find Rating in HTML");
                    // 打印一部分 HTML 看看
                    // println!("[NowCoder Debug] HTML Snippet: {:.200}", html);
                }

                if let Some(caps) = re_rank.captures(&html) {
                    rank_str = Some(format!("Rank: {}", &caps[1]));
                }
            }
        },
        Err(e) => println!("[NowCoder Debug] Main Request Failed: {}", e),
    }

    // --- 解析 Solved ---
    let mut solved_count = 0;

    match practice_res {
        Ok(resp) => {
            println!("[NowCoder Debug] Practice Response Status: {}", resp.status());
            if resp.status().is_success() {
                let html = resp.text().await.unwrap_or_default();
                 println!("[NowCoder Debug] Practice HTML Length: {}", html.len());

                let re_solved = Regex::new(r#"class="state-num">(\d+)</div>\s*<div[^>]*>\s*<span>题已通过</span>"#).unwrap();
                let re_solved_loose = Regex::new(r#"class="state-num">(\d+)</div>\s*.*题已通过"#).unwrap();

                if let Some(caps) = re_solved.captures(&html) {
                    if let Ok(num) = caps[1].parse::<u32>() { solved_count = num; }
                } else if let Some(caps) = re_solved_loose.captures(&html) {
                    if let Ok(num) = caps[1].parse::<u32>() { solved_count = num; }
                }
                
                if solved_count > 0 {
                    println!("[NowCoder Debug] Found Solved Count: {}", solved_count);
                } else {
                    println!("[NowCoder Debug] Failed to find Solved Count");
                }
            }
        },
        Err(e) => println!("[NowCoder Debug] Practice Request Failed: {}", e),
    }

    println!("=== [NowCoder Debug] End ===\n");

    Ok(UserStats {
        platform: "NowCoder".to_string(),
        handle: uid.to_string(),
        solved_count,
        rank: rank_str,
        rating,
    })
}

// (parse_nowcoder_time 保持不变，省略)
fn parse_nowcoder_time(text: &str) -> (Option<chrono::DateTime<Utc>>, bool) {
    let keywords = ["比赛时间", "Start Time", "开始时间"];
    let mut search_start_index = 0;
    let mut found_keyword = false;

    for kw in keywords {
        if let Some(idx) = text.find(kw) {
            search_start_index = idx;
            found_keyword = true;
            break;
        }
    }
    if !found_keyword && text.contains("报名时间") {
        return (None, false);
    }
    let relevant_text = &text[search_start_index..];
    let clean_text = relevant_text.replace('\n', " ").replace('\r', "");
    let chars: Vec<char> = clean_text.chars().collect();
    let len = chars.len();
    if len < 7 { return (None, false); }
    let china_timezone = FixedOffset::east_opt(8 * 3600).unwrap();
    let current_year = Local::now().year();
    for i in 0..len {
        if !chars[i].is_numeric() { continue; }
        if i + 16 <= len {
            let slice: String = chars[i..i+16].iter().collect();
            if let Ok(naive) = NaiveDateTime::parse_from_str(&slice, "%Y-%m-%d %H:%M") {
                let dt = china_timezone.from_local_datetime(&naive).single();
                return match dt {
                    Some(t) => (Some(t.with_timezone(&Utc)), true),
                    None => (None, false)
                };
            }
        }
        if i + 11 <= len {
             let slice: String = chars[i..i+11].iter().collect();
             if slice.chars().nth(2) == Some('-') && slice.chars().nth(5) == Some(' ') && slice.chars().nth(8) == Some(':') {
                 let full_date_str = format!("{}-{}", current_year, slice);
                 if let Ok(naive) = NaiveDateTime::parse_from_str(&full_date_str, "%Y-%m-%d %H:%M") {
                     if let Some(t) = china_timezone.from_local_datetime(&naive).single() {
                        return (Some(t.with_timezone(&Utc)), true);
                     }
                     return (None, false);
                 }
             }
        }
    }
    (None, false)
}