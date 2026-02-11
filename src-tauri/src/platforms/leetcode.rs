use crate::models::{Contest, UserStats};
use anyhow::Result;
use chrono::DateTime;
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;

// 国际版用于查询比赛
const LEETCODE_GRAPHQL_URL: &str = "https://leetcode.com/graphql";
// noj-go 端点，通常对 Read-Only 请求更宽容 (Rating)
const LEETCODE_CN_NOJ_URL: &str = "https://leetcode.cn/graphql/noj-go/";
// 备用标准端点 (Solved)
const LEETCODE_CN_GRAPHQL_URL: &str = "https://leetcode.cn/graphql";

#[derive(Deserialize, Debug)]
struct GraphQlResponse {
    data: Option<Data>,
    #[allow(dead_code)]
    errors: Option<Vec<serde_json::Value>>,
}

#[derive(Deserialize, Debug)]
struct Data {
    #[serde(rename = "upcomingContests")]
    upcoming_contests: Option<Vec<RawContest>>,

    // UserStats
    #[serde(rename = "userContestRanking")]
    user_contest_ranking: Option<UserContestRanking>,
    #[serde(rename = "userProfileUserQuestionProgress")]
    user_question_progress: Option<UserQuestionProgress>,
}

// --- 比赛相关 ---
#[derive(Deserialize, Debug)]
struct RawContest {
    title: String,
    #[serde(rename = "titleSlug")]
    title_slug: String,
    #[serde(rename = "startTime")]
    start_time: i64,
}

// --- 战绩相关 ---
#[derive(Deserialize, Debug)]
struct UserContestRanking {
    rating: f64,
}

#[derive(Deserialize, Debug)]
struct UserQuestionProgress {
    #[serde(rename = "numAcceptedQuestions")]
    num_accepted_questions: Vec<QuestionCount>,
}

#[derive(Deserialize, Debug)]
struct QuestionCount {
    count: u32,
}

// [原有功能] 查询比赛列表
pub async fn fetch_contests() -> Result<Vec<Contest>> {
    let client = Client::new();
    let query = json!({
        "query": r#"
        query contestUpcomingContests {
            upcomingContests {
                title
                titleSlug
                startTime
            }
        }
        "#
    });

    let resp = client
        .post(LEETCODE_GRAPHQL_URL)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Content-Type", "application/json")
        .json(&query)
        .send()
        .await?;

    let graphql_resp: GraphQlResponse = resp.json().await?;
    let data = graphql_resp
        .data
        .ok_or_else(|| anyhow::anyhow!("LeetCode response missing 'data' field"))?;
    let mut contests = Vec::new();

    for raw in data.upcoming_contests.unwrap_or_default() {
        let start_time = DateTime::from_timestamp(raw.start_time, 0).ok_or_else(|| {
            anyhow::anyhow!("Invalid timestamp from LeetCode: {}", raw.start_time)
        })?;

        contests.push(Contest {
            name: raw.title,
            url: format!("https://leetcode.com/contest/{}", raw.title_slug),
            platform: "LeetCode".to_string(),
            start_time,
        });
    }
    Ok(contests)
}

// [修改] 查询 LeetCode CN 用户 Rating 和 刷题数
pub async fn fetch_user_stats(handle: &str) -> Result<UserStats> {
    let client = Client::new();
    let profile_referer = format!("https://leetcode.cn/u/{}/", handle);

    // 1. Rating Query (noj-go)
    let rating_query = json!({
        "query": r#"
            query ($userSlug: String!) {
                userContestRanking(userSlug: $userSlug) {
                    rating
                }
            }
        "#,
        "variables": { "userSlug": handle }
    });

    // 2. Solved Query (graphql)
    let solved_query = json!({
        "query": r#"
            query ($userSlug: String!) {
                userProfileUserQuestionProgress(userSlug: $userSlug) {
                    numAcceptedQuestions {
                        count
                    }
                }
            }
        "#,
        "variables": { "userSlug": handle }
    });

    // 并发请求
    // rating -> LEETCODE_CN_NOJ_URL
    // solved -> LEETCODE_CN_GRAPHQL_URL
    let (rating_resp, solved_resp) = tokio::join!(
        client.post(LEETCODE_CN_NOJ_URL)
            .header("Content-Type", "application/json")
            .header("Origin", "https://leetcode.cn")
            .header("Referer", &profile_referer)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            .json(&rating_query)
            .send(),
        client.post(LEETCODE_CN_GRAPHQL_URL)
            .header("Content-Type", "application/json")
            .header("Origin", "https://leetcode.cn")
            .header("Referer", &profile_referer)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            .json(&solved_query)
            .send()
    );

    // 4. 解析 Rating
    let mut rating_val: Option<u32> = None;

    // 如果请求失败，这里不直接返回 Err，而是尝试解析另一个结果，尽可能返回部分数据
    // 但如果两个都失败，最后可能会返回全空数据，或者你可以选择在这里抛出错误触发重试
    if let Ok(resp) = rating_resp {
        if resp.status().is_success() {
            if let Ok(g_resp) = resp.json::<GraphQlResponse>().await {
                if let Some(d) = g_resp.data {
                    if let Some(ranking) = d.user_contest_ranking {
                        rating_val = Some(ranking.rating.round() as u32);
                    }
                }
            }
        }
    }

    // 5. 解析 Solved Count
    let mut solved_count: u32 = 0;
    if let Ok(resp) = solved_resp {
        if resp.status().is_success() {
            if let Ok(g_resp) = resp.json::<GraphQlResponse>().await {
                if let Some(d) = g_resp.data {
                    if let Some(progress) = d.user_question_progress {
                        solved_count = progress
                            .num_accepted_questions
                            .iter()
                            .map(|q| q.count)
                            .sum();
                    }
                }
            }
        }
    }

    // 如果两个请求都失败（或者数据都为空），是否需要抛出错误让上层重试？
    // 这里采取的策略是：只要网络请求没崩 panic，就尽量返回结果（即使是0或None）
    // 如果你想让网络错误触发重试，可以在上面的 if let Ok(resp) 的 else 分支里做处理。
    // 但为了保持 user experience，返回部分数据往往比一直转圈重试要好。

    Ok(UserStats {
        platform: "LeetCode".to_string(),
        handle: handle.to_string(),
        solved_count,
        rank: None,
        rating: rating_val,
    })
}
