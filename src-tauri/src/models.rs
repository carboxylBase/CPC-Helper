use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// 现有的 Contest 结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contest {
    pub name: String,
    pub start_time: DateTime<Utc>,
    pub url: String,
    pub platform: String,
}

// [新增] 用户刷题统计结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserStats {
    pub platform: String,  // 平台 (e.g., "Codeforces")
    pub handle: String,    // 用户名/ID
    pub solved_count: u32, // 刷题数 (AC数，去重后)
    // 预留字段，方便未来扩展 (例如排名、积分等)
    pub rank: Option<String>,
    pub rating: Option<u32>,
}
