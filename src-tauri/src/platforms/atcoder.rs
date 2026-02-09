use crate::models::Contest;
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use reqwest::header;
use scraper::{Html, Selector};

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    // 1. 请求 AtCoder 官网的比赛列表页面（英文版）
    let url = "https://atcoder.jp/contests/?lang=en";

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
        .build()?;

    let resp = client.get(url)
        .header(header::ACCEPT_LANGUAGE, "en-US,en;q=0.9")
        .send()
        .await?;

    // 获取网页 HTML 文本
    let html_content = resp.text().await?;

    // 2. 解析 HTML
    let document = Html::parse_document(&html_content);
    
    // CSS 选择器
    let table_selector = Selector::parse("#contest-table-upcoming tbody tr").unwrap();
    let time_selector = Selector::parse("td:nth-child(1) time").unwrap();
    let link_selector = Selector::parse("td:nth-child(2) a").unwrap();

    let mut contests = Vec::new();

    // 3. 遍历每一行数据
    for row in document.select(&table_selector) {
        // --- 提取时间 ---
        let start_time_str = match row.select(&time_selector).next() {
            Some(el) => el.inner_html(),
            None => continue, 
        };

        // 解析时间格式：2023-10-14 21:00:00+0900
        let start_time = DateTime::parse_from_str(&start_time_str, "%Y-%m-%d %H:%M:%S%z")
            .context("Failed to parse AtCoder date")?
            .with_timezone(&Utc);

        // --- 提取名称和链接 ---
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