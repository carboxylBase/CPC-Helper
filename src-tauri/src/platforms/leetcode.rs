use crate::models::Contest;
use anyhow::Result;
use chrono::DateTime;
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;

const LEETCODE_GRAPHQL_URL: &str = "https://leetcode.com/graphql";

#[derive(Deserialize, Debug)]
struct GraphQlResponse {
    data: Option<Data>,
    errors: Option<Vec<serde_json::Value>>, 
}

#[derive(Deserialize, Debug)]
struct Data {
    #[serde(rename = "upcomingContests")]
    upcoming_contests: Vec<RawContest>,
}

#[derive(Deserialize, Debug)]
struct RawContest {
    title: String,
    #[serde(rename = "titleSlug")]
    title_slug: String,
    #[serde(rename = "startTime")]
    start_time: i64,
}

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
        .header("Referer", "https://leetcode.com/contest/")
        .json(&query)
        .send()
        .await?;

    let graphql_resp: GraphQlResponse = resp.json().await?;

    if let Some(errs) = graphql_resp.errors {
        if !errs.is_empty() {
            return Err(anyhow::anyhow!("LeetCode API returned errors: {:?}", errs));
        }
    }

    let data = graphql_resp.data.ok_or_else(|| anyhow::anyhow!("LeetCode response missing 'data' field"))?;

    let mut contests = Vec::new();

    for raw in data.upcoming_contests {
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