use crate::models::{Contest, UserStats};
use anyhow::Result;
use chrono::DateTime;
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;

// [新增] 国际服端点 (用于获取比赛列表，API 较稳定)
const LEETCODE_COM_GRAPHQL_URL: &str = "https://leetcode.com/graphql";

// [保留] 国服端点 (用于获取个人战绩)
const LEETCODE_CN_NOJ_URL: &str = "https://leetcode.cn/graphql/noj-go/";
const LEETCODE_CN_GRAPHQL_URL: &str = "https://leetcode.cn/graphql";

#[derive(Deserialize, Debug)]
struct GraphQlResponse {
    data: Option<Data>,
    #[allow(dead_code)]
    errors: Option<Vec<serde_json::Value>>,
}

#[derive(Deserialize, Debug)]
struct Data {
    // 国际服字段
    #[serde(rename = "upcomingContests")]
    upcoming_contests: Option<Vec<RawContest>>,

    // 国服用户字段
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

// [修改] 混合策略：从 COM 获取数据，但生成 CN 的链接
pub async fn fetch_contests() -> Result<Vec<Contest>> {
    let client = Client::new();
    
    // 使用国际服标准的查询语句
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

    // 请求发送给 leetcode.com
    let resp = client
        .post(LEETCODE_COM_GRAPHQL_URL)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Content-Type", "application/json")
        .json(&query)
        .send()
        .await?;

    let graphql_resp: GraphQlResponse = resp.json().await?;
    let data = graphql_resp
        .data
        .ok_or_else(|| anyhow::anyhow!("LeetCode (.com) response missing 'data' field"))?;
    
    let mut contests = Vec::new();

    for raw in data.upcoming_contests.unwrap_or_default() {
        let start_time = DateTime::from_timestamp(raw.start_time, 0).ok_or_else(|| {
            anyhow::anyhow!("Invalid timestamp from LeetCode: {}", raw.start_time)
        })?;

        contests.push(Contest {
            name: raw.title,
            // [核心修改] 强行拼接为国服链接
            url: format!("https://leetcode.cn/contest/{}", raw.title_slug),
            platform: "LeetCode".to_string(), // 显示为 LeetCode (CN 逻辑由 URL 体现)
            start_time,
        });
    }
    Ok(contests)
}

// [保留] 查询 LeetCode CN 用户 Rating 和 刷题数 (保持不变，使用 CN 接口)
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

    Ok(UserStats {
        platform: "LeetCode".to_string(),
        handle: handle.to_string(),
        solved_count,
        rank: None,
        rating: rating_val,
    })
}