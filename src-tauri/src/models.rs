use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// 增加 Serialize 以便 Tauri 可以将其转换为 JSON 返回给前端
// 增加 Deserialize 以便后续可能的反序列化需求
// Clone 和 Debug 是标准 Rust 实践
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contest {
    pub name: String,
    pub start_time: DateTime<Utc>,
    pub url: String,
    pub platform: String,
}