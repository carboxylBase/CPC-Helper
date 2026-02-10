use crate::models::Contest;
use anyhow::Result;
use scraper::{Html, Selector};
use chrono::{NaiveDateTime, TimeZone, FixedOffset, Utc};

// HDU 列表地址
const HDU_URL: &str = "https://acm.hdu.edu.cn/contests/contest_list.php";
const HDU_BASE_URL: &str = "https://acm.hdu.edu.cn/contests/";

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    // 1. 发起请求
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()?;

    let res = client.get(HDU_URL).send().await?;
    let html_text = res.text().await?;
    let document = Html::parse_document(&html_text);

    // 2. 定义选择器
    let row_selector = Selector::parse("tr").unwrap();
    let link_selector = Selector::parse("a").unwrap();
    let td_selector = Selector::parse("td").unwrap();

    let mut contests = Vec::new();

    // 3. 解析表格
    for row in document.select(&row_selector) {
        let tds: Vec<_> = row.select(&td_selector).collect();
        
        // 至少需要有 ID, Name, Date 这几列
        if tds.len() < 3 {
            continue;
        }

        // 提取名称 (Index 1)
        let name_el = match tds.get(1) {
            Some(el) => el,
            None => continue,
        };
        let raw_name = name_el.text().collect::<Vec<_>>().join("").trim().to_string();

        // 过滤无效行
        if raw_name.is_empty() || raw_name == "Problem Archive" || raw_name.contains("Contest Name") {
            continue;
        }

        // 提取链接
        let url = match name_el.select(&link_selector).next() {
            Some(a) => {
                let href = a.value().attr("href").unwrap_or("");
                if href.is_empty() { continue; }
                format!("{}{}", HDU_BASE_URL, href)
            },
            None => continue, 
        };

        // 提取时间 (Index 2)
        let time_str = match tds.get(2) {
            Some(el) => el.text().collect::<Vec<_>>().join("").trim().to_string(),
            None => continue,
        };

        // 4. 解析时间
        let start_time = match NaiveDateTime::parse_from_str(&time_str, "%Y-%m-%d %H:%M:%S") {
            Ok(dt) => {
                let offset = FixedOffset::east_opt(8 * 3600).unwrap();
                match offset.from_local_datetime(&dt).single() {
                    Some(local_dt) => local_dt.with_timezone(&Utc),
                    None => continue,
                }
            },
            Err(_) => continue, // 解析失败直接跳过
        };

        contests.push(Contest {
            name: raw_name,
            start_time,
            url,
            platform: "HDU".to_string(),
        });
    }

    // 5. 过滤与排序
    let now = Utc::now();
    
    // 过滤掉已经结束的比赛 (只保留未来的)
    contests.retain(|c| c.start_time > now);

    // 关键修正：按时间升序排列 (即将开始的在最前面)
    contests.sort_by(|a, b| a.start_time.cmp(&b.start_time));

    // 只保留最近的 5 场
    if contests.len() > 5 {
        contests.truncate(5);
    }

    Ok(contests)
}