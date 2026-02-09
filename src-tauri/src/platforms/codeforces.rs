use crate::models::Contest;
use anyhow::Result;
use chrono::{TimeZone, Utc};
use serde::Deserialize;

// Codeforces API 响应结构
#[derive(Deserialize, Debug)]
struct CfResponse {
    result: Vec<CfContest>,
}

#[derive(Deserialize, Debug)]
struct CfContest {
    id: u64,
    name: String,
    #[serde(rename = "startTimeSeconds")]
    start_time_seconds: Option<i64>, 
    phase: String,
}

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    let url = "https://codeforces.com/api/contest.list";
    
    let resp = reqwest::get(url)
        .await?
        .json::<CfResponse>()
        .await?;

    let mut contests = Vec::new();

    for item in resp.result {
        if item.phase == "FINISHED" {
            continue;
        }

        if let Some(timestamp) = item.start_time_seconds {
            // 使用 timestamp_opt 处理潜在的时间戳错误
            if let Some(start_time) = Utc.timestamp_opt(timestamp, 0).single() {
                contests.push(Contest {
                    name: item.name,
                    start_time,
                    url: format!("https://codeforces.com/contest/{}", item.id),
                    platform: "Codeforces".to_string(),
                });
            }
        }
    }

    Ok(contests)
}