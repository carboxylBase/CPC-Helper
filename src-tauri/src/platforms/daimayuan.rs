use crate::models::{Contest, UserStats};
use anyhow::Result;
use chrono::{DateTime, Utc};
use regex::Regex;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()?;

    let url = "https://bs.daimayuan.top/contest";
    let html = client.get(url).send().await?.text().await?;

    let re_title_link =
        Regex::new(r#"contest__title"><a\s+href="(/contest/[^"]+)"[^>]*>([^<]+)</a>"#).unwrap();
    let re_timestamp = Regex::new(r#"data-timestamp="(\d+)""#).unwrap();

    let mut contests = Vec::new();
    let now_sec = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;
    let chunks: Vec<&str> = html.split("contest__item").collect();

    for chunk in chunks.iter().skip(1) {
        let timestamp_i64 = match re_timestamp.captures(chunk) {
            Some(caps) => caps[1].parse::<i64>().unwrap_or(0),
            None => continue,
        };

        if timestamp_i64 < now_sec {
            continue;
        }

        let (link, name) = match re_title_link.captures(chunk) {
            Some(caps) => (
                format!("https://bs.daimayuan.top{}", &caps[1]),
                caps[2].trim().to_string(),
            ),
            None => continue,
        };

        let start_time_utc: DateTime<Utc> =
            DateTime::from_timestamp(timestamp_i64, 0).unwrap_or_else(|| Utc::now());

        contests.push(Contest {
            platform: "Daimayuan".to_string(),
            name,
            start_time: start_time_utc,
            url: link,
        });
    }

    Ok(contests)
}

pub async fn fetch_user_stats(handle: &str) -> Result<UserStats> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()?;

    let url = format!("https://bs.daimayuan.top/user/{}", handle);
    let html = client.get(&url).send().await?.text().await?;

    // 1. 匹配刷题数 - 恢复最稳健的“锚点+内容”逻辑
    // 逻辑：必须在同一个 numbox 容器内找到数字，且其后紧跟“已通过”
    // 使用 (?s) 开启单行模式，使用 [\s\S]*? 跨越可能的任何换行和标签
    let re_solved = Regex::new(
        r#"(?s)<div[^>]*class="numbox"[^>]*>[\s\S]*?numbox__num[^>]*>(\d+)</div>[\s\S]*?已通过"#,
    )
    .unwrap();

    let solved_count = re_solved
        .captures(&html)
        .and_then(|cap| cap[1].parse::<u32>().ok())
        .unwrap_or_else(|| {
            // 如果上述精准匹配失败，尝试寻找页面上第二个 numbox 数字（代码源主页固定结构：1.排名 2.通过）
            let re_any_numbox = Regex::new(r#"class="numbox__num[^>]*>(\d+)</div>"#).unwrap();
            let all_nums: Vec<u32> = re_any_numbox
                .captures_iter(&html)
                .map(|c| c[1].parse::<u32>().unwrap_or(0))
                .collect();
            if all_nums.len() >= 2 {
                all_nums[1]
            } else {
                0
            }
        });

    // 2. 匹配最近一次 Rating - 第一个匹配项即为最新
    let re_rating = Regex::new(r#"class="col--new_rating"[^>]*>(\d+)</td>"#).unwrap();
    let latest_rating = re_rating
        .captures(&html)
        .and_then(|cap| cap[1].parse::<u32>().ok());

    Ok(UserStats {
        platform: "Daimayuan".to_string(),
        handle: handle.to_string(),
        rating: latest_rating,
        solved_count,
        rank: None,
    })
}
