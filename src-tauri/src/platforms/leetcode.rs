use crate::models::{Contest, UserStats};
use anyhow::Result;
use chrono::DateTime;
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;

// 国际版用于查询比赛
const LEETCODE_GRAPHQL_URL: &str = "https://leetcode.com/graphql";
// [修改] 尝试使用 noj-go 端点，它通常对 Read-Only 请求更宽容
const LEETCODE_CN_NOJ_URL: &str = "https://leetcode.cn/graphql/noj-go/";
// 备用标准端点
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
    let data = graphql_resp.data.ok_or_else(|| anyhow::anyhow!("LeetCode response missing 'data' field"))?;
    let mut contests = Vec::new();

    for raw in data.upcoming_contests.unwrap_or_default() {
        let start_time = DateTime::from_timestamp(raw.start_time, 0)
            .ok_or_else(|| anyhow::anyhow!("Invalid timestamp from LeetCode: {}", raw.start_time))?;

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
    println!("[LeetCode] 开始爬取, handle: {}", handle);

    let client = Client::new();
    let profile_referer = format!("https://leetcode.cn/u/{}/", handle);

    // 1. Rating Query
    // [策略调整] 移除 operationName，直接发送匿名 Query，并切换到 noj-go 端点
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

    // 2. Solved Query (这个一直很稳定，保持原样但移除 name 以防万一)
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

    println!("[LeetCode] 发送 GraphQL 请求 (尝试 noj-go 端点)...");

    // 并发请求
    // 注意：rating 请求发送到 LEETCODE_CN_NOJ_URL
    // solved 请求继续发送到 LEETCODE_CN_GRAPHQL_URL (因为它之前是成功的，没必要改)
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
    match rating_resp {
        Ok(resp) => {
            println!("[LeetCode] Rating HTTP Status: {}", resp.status());
            if let Ok(g_resp) = resp.json::<GraphQlResponse>().await {
                if let Some(errs) = g_resp.errors {
                    println!("[LeetCode] Rating Errors: {:?}", errs);
                }
                if let Some(d) = g_resp.data {
                    if let Some(ranking) = d.user_contest_ranking {
                        rating_val = Some(ranking.rating.round() as u32);
                        println!("[LeetCode] 获取到 Rating: {}", ranking.rating);
                    } else {
                        println!("[LeetCode] userContestRanking is null");
                    }
                }
            } else {
                println!("[LeetCode] Rating JSON 解析失败");
            }
        }
        Err(e) => println!("[LeetCode] Rating 网络请求失败: {}", e),
    }

    // 5. 解析 Solved Count
    let mut solved_count: u32 = 0;
    match solved_resp {
        Ok(resp) => {
            println!("[LeetCode] Solved HTTP Status: {}", resp.status());
            if let Ok(g_resp) = resp.json::<GraphQlResponse>().await {
                if let Some(d) = g_resp.data {
                    if let Some(progress) = d.user_question_progress {
                        solved_count = progress.num_accepted_questions.iter().map(|q| q.count).sum();
                        println!("[LeetCode] 获取到 Solved: {}", solved_count);
                    }
                }
            }
        }
        Err(e) => println!("[LeetCode] Solved 网络请求失败: {}", e),
    }

    let stats = UserStats {
        platform: "LeetCode".to_string(),
        handle: handle.to_string(),
        solved_count,
        rank: None, 
        rating: rating_val,
    };

    println!("[LeetCode] 最终构造: {:?}", stats);
    Ok(stats)
}