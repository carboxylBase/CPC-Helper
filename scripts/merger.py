import os

def merge_files():
    # --- 配置区域 ---
    config_filename = 'file_list.txt'  # 配置文件名
    output_filename = 'merged_output.txt' # 输出文件名
    # ----------------
    
    # 1. 确定路径
    # 获取脚本当前所在的绝对路径 (例如: /project/scripts/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 获取项目根目录 (假设脚本在根目录的下一级，所以是 script_dir 的父目录)
    # 如果你的脚本藏得更深，比如 /project/tools/build/，你需要多调用一次 os.path.dirname
    project_root = os.path.dirname(script_dir)
    
    config_path = os.path.join(script_dir, config_filename)
    output_path = os.path.join(script_dir, output_filename)

    print(f"脚本位置: {script_dir}")
    print(f"项目根目录: {project_root}")
    print("-" * 30)

    # 2. 读取配置文件
    if not os.path.exists(config_path):
        print(f"错误: 找不到配置文件: {config_path}")
        return

    files_to_read = []
    with open(config_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # 跳过空行和注释
            if not line or line.startswith('#'):
                continue
            files_to_read.append(line)

    # 3. 开始合并
    print(f"正在合并 {len(files_to_read)} 个文件...")
    
    with open(output_path, 'w', encoding='utf-8') as out_f:
        for rel_path in files_to_read:
            # 组合绝对路径：根目录 + 配置文件里的相对路径
            abs_path = os.path.join(project_root, rel_path)
            
            try:
                if os.path.exists(abs_path) and os.path.isfile(abs_path):
                    # 写入分隔符，方便阅读
                    out_f.write(f"\n{'='*50}\n")
                    out_f.write(f"File: {rel_path}\n")
                    out_f.write(f"{'='*50}\n\n")
                    
                    # 写入文件内容
                    with open(abs_path, 'r', encoding='utf-8') as in_f:
                        out_f.write(in_f.read())
                        out_f.write("\n") # 确保文件末尾换行
                    
                    print(f"已处理: {rel_path}")
                else:
                    print(f"[跳过] 文件不存在: {rel_path}")
                    out_f.write(f"\n!! [MISSING FILE] {rel_path} !!\n")
            except Exception as e:
                print(f"[错误] 读取 {rel_path} 失败: {e}")
                out_f.write(f"\n!! [ERROR READING] {rel_path}: {e} !!\n")

    print("-" * 30)
    print(f"合并完成！\n输出文件位于: {output_path}")

if __name__ == "__main__":
    merge_files()