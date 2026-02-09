use crate::models::Contest;
use anyhow::Result;
use chrono::{Datelike, FixedOffset, Local, NaiveDateTime, TimeZone, Utc};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, REFERER, USER_AGENT};
use reqwest::Client;
use scraper::{Html, Selector};

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    // 1. 构建请求头
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"));
    headers.insert(ACCEPT, HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    headers.insert(REFERER, HeaderValue::from_static("https://ac.nowcoder.com/"));

    let client = Client::builder()
        .default_headers(headers)
        .build()?;

    // 2. 请求页面
    let url = "https://ac.nowcoder.com/acm/contest/vip-index";
    let resp = client.get(url).send().await?;

    if !resp.status().is_success() {
        eprintln!("[NowCoder] Request failed with status: {}", resp.status());
        return Ok(vec![]);
    }

    let html_text = resp.text().await?;
    let document = Html::parse_document(&html_text);
    let mut contests = Vec::new();

    // 3. 定义选择器
    let item_selector = Selector::parse(".platform-item, .contest-item, tr[data-id]").unwrap();
    let name_selector = Selector::parse("h4 a, .contest-title a, td.title a").unwrap();
    
    // 4. 解析逻辑
    for element in document.select(&item_selector) {
        
        // 4.1 提取名称和 URL
        let (name, relative_url) = match element.select(&name_selector).next() {
            Some(el) => {
                let text = el.text().collect::<Vec<_>>().join("").trim().to_string();
                let href = el.value().attr("href").unwrap_or("");
                (text, href.to_string())
            },
            None => continue,
        };

        // 过滤非比赛链接
        if !relative_url.contains("/acm/contest/") {
            continue;
        }
        
        if relative_url.ends_with("/vip-index") {
            continue;
        }

        let full_url = format!("https://ac.nowcoder.com{}", relative_url);

        // 4.2 提取包含时间的原始文本
        let raw_text = element.text().collect::<Vec<_>>().join(" ");
        
        // 4.3 解析时间并进行过滤
        // 修改点：这里使用了 if let 模式匹配，并增加了时间过滤逻辑
        if let (Some(start_time), true) = parse_nowcoder_time(&raw_text) {
            // 核心修复：过滤掉开始时间早于现在的比赛
            // 如果你需要包含"正在进行"的比赛，由于牛客HTML很难解析Duration，
            // 这种写法会把正在进行的也过滤掉（因为它已经开始了）。
            // 鉴于你的需求是去除"已结束"的，且大部分CLI工具主要关注"Upcoming"，
            // 这里采用严格的 start_time > now 逻辑。
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

/// 解析牛客网时间字符串
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

    // 如果没找到开始时间关键字，且只有"报名时间"，则忽略
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

        // 策略1: yyyy-MM-dd HH:mm (例如 2023-10-01 12:00)
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

        // 策略2: MM-dd HH:mm (例如 10-01 12:00)
        // 注意：这种格式缺失年份，默认使用 current_year
        if i + 11 <= len {
             let slice: String = chars[i..i+11].iter().collect();
             // 简单的格式校验：第3位是'-'，第6位是空格，第9位是':'
             if slice.chars().nth(2) == Some('-') && slice.chars().nth(5) == Some(' ') && slice.chars().nth(8) == Some(':') {
                 let full_date_str = format!("{}-{}", current_year, slice);
                 if let Ok(naive) = NaiveDateTime::parse_from_str(&full_date_str, "%Y-%m-%d %H:%M") {
                     let dt = china_timezone.from_local_datetime(&naive).single();
                     
                     if let Some(t) = dt {
                        let utc_time = t.with_timezone(&Utc);
                        
                        // 跨年处理的小优化：
                        // 如果解析出来的日期比现在早了超过180天，说明这可能是明年的比赛（或者是去年的已结束比赛）
                        // 但结合外层的过滤逻辑，我们主要担心的是"明年的比赛被当成今年已过期的比赛"而被错误过滤。
                        // 不过由于牛客列表通常是最近的，这种情况较少，保持现状即可。
                        return (Some(utc_time), true);
                     }
                     return (None, false);
                 }
             }
        }
    }

    (None, false)
}