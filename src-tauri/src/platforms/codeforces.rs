use crate::models::{Contest, UserStats};
use anyhow::Result;
use chrono::{TimeZone, Utc};
use serde::Deserialize;
use std::collections::HashSet;

const CF_API_URL: &str = "https://codeforces.com/api/contest.list";
const CF_USER_STATUS_URL: &str = "https://codeforces.com/api/user.status";
// [新增] 用户信息接口
const CF_USER_INFO_URL: &str = "https://codeforces.com/api/user.info";

#[derive(Deserialize)]
struct CfResponse {
    status: String,
    result: Vec<CfContest>,
}

#[derive(Deserialize)]
struct CfContest {
    id: u64,
    name: String,
    phase: String,
    startTimeSeconds: Option<i64>,
}

#[derive(Deserialize)]
struct CfStatusResponse {
    status: String,
    result: Vec<CfSubmission>,
}

#[derive(Deserialize)]
struct CfSubmission {
    verdict: Option<String>,
    problem: CfProblem,
}

#[derive(Deserialize)]
struct CfProblem {
    contestId: Option<u64>,
    index: String,
    name: String,
}

// [新增] 用户信息响应结构
#[derive(Deserialize)]
struct CfUserInfoResponse {
    status: String,
    result: Vec<CfUserInfo>,
}

#[derive(Deserialize)]
struct CfUserInfo {
    rating: Option<u32>,
    rank: Option<String>,
    // maxRating: Option<u32>, // 也可以获取最高分，如果需要的话
}

pub async fn fetch_contests() -> Result<Vec<Contest>> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()?;

    let res = client.get(CF_API_URL).query(&[("gym", "false")]).send().await?;
    let cf_res: CfResponse = res.json().await?;

    if cf_res.status != "OK" {
        return Err(anyhow::anyhow!("Codeforces API returned error status"));
    }

    let mut contests = Vec::new();
    let now = Utc::now();

    for c in cf_res.result {
        if c.phase == "BEFORE" {
            if let Some(start_ts) = c.startTimeSeconds {
                let start_time = Utc.timestamp_opt(start_ts, 0).single();
                if let Some(st) = start_time {
                    if st > now {
                        contests.push(Contest {
                            name: c.name,
                            start_time: st,
                            url: format!("https://codeforces.com/contests/{}", c.id),
                            platform: "Codeforces".to_string(),
                        });
                    }
                }
            }
        }
    }

    Ok(contests)
}

pub async fn fetch_user_stats(handle: &str) -> Result<UserStats> {
    let client = reqwest::Client::new();

    // 1. 构建两个请求的 Future
    let status_req = client
        .get(CF_USER_STATUS_URL)
        .query(&[("handle", handle), ("from", "1"), ("count", "10000")])
        .send();

    let info_req = client
        .get(CF_USER_INFO_URL)
        .query(&[("handles", handle)])
        .send();

    // 2. 并发执行请求 (tokio::join!)
    let (status_res, info_res) = tokio::join!(status_req, info_req);

    // 3. 处理 user.status (做题数)
    let status_resp: CfStatusResponse = status_res?.json().await?;
    if status_resp.status != "OK" {
        return Err(anyhow::anyhow!("Failed to fetch user status"));
    }

    let mut solved_problems = HashSet::new();
    for submission in status_resp.result {
        if let Some(verdict) = submission.verdict {
            if verdict == "OK" {
                if let Some(cid) = submission.problem.contestId {
                    let key = format!("{}-{}", cid, submission.problem.index);
                    solved_problems.insert(key);
                }
            }
        }
    }

    // 4. 处理 user.info (Rating & Rank)
    let info_resp: CfUserInfoResponse = info_res?.json().await?;
    if info_resp.status != "OK" || info_resp.result.is_empty() {
        return Err(anyhow::anyhow!("Failed to fetch user info"));
    }
    
    let user_info = &info_resp.result[0];

    Ok(UserStats {
        platform: "Codeforces".to_string(),
        handle: handle.to_string(),
        solved_count: solved_problems.len() as u32,
        rank: user_info.rank.clone(),
        rating: user_info.rating,
    })
}