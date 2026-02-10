// 文件路径: src-tauri/src/platforms/mod.rs

pub mod atcoder;
pub mod codeforces;
pub mod nowcoder;
pub mod leetcode;
pub mod luogu; // [新增] 注册洛谷模块
// 注意：虽然你的 lib.rs 中引用了 hdu，但你发给我的 mod.rs 中没有 hdu。
// 为了保持一致性，如果你的文件系统中有 hdu.rs，这里也可以加上 pub mod hdu;
// 但基于你发给我的原文件，我只添加 luogu。