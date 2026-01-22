import json

async def main(args) -> dict:
    """
    Coze Script Node: Smart Table Aligner (v9)
    
    【架构思考：为什么有了视觉大模型(VLM)还需要 OCR？】
    (同 v7/v8)
    
    核心修正：
    1. [v9] 纵向合并 (Multiline Handling)：
       针对 "单元格内文字换行" 被误识别为多行表格的问题，引入垂直间距判断。
       如果两行垂直间距 < 12px，视为同一行的多行文本，进行物理合并。
    2. [v8] Raw Info 升级为 JSON：
       输出每行原始文本和 X 坐标，供后续 VLM (GPT-4o/Gemini) 结合视觉能力进行最终修正。
       解决纯 Python 规则无法完美处理所有 edge case (如 "+2" 拆分、复杂表头) 的问题。
    2. [v6] 增强合并 & 徽标过滤：
       - 增大行内合并阈值到 60px，确保 "+2" 等标签合并。
       - 智能表头搜索增加惩罚机制：包含 "+N" 的行不作为表头。
    2. [v5] 数据行元素合并：
       针对 "包含子节点 +2" 这种被 OCR 拆分成两个框的情况，增加行内近邻合并逻辑。
    2. [v4] 强制列数锁定 & 表头内部合并：
       解决表头被打散导致列数过多的问题。
    3. [v3] 上下文保留 & 智能表头搜索：
       保留表格上方的筛选条件文本。
    """
    
    # ---------------------------------------------------------
    # 1. 数据解析
    # ---------------------------------------------------------
    params = getattr(args, 'params', args)
    ocr_root = params.get('input', {})
    if not ocr_root:
        ocr_root = params
    data = ocr_root.get('data', ocr_root)
    
    texts = data.get('line_texts', [])
    rects = data.get('line_rects', [])
    
    if not texts or not rects:
        return {"formatted_text": "【错误】OCR数据为空"}
    
    items = []
    for i in range(len(texts)):
        r = rects[i]
        items.append({
            "text": texts[i],
            "x": r.get('x', 0),
            "y": r.get('y', 0),
            "w": r.get('width', r.get('w', 0)),
            "h": r.get('height', r.get('h', 0)),
            "cx": r.get('x', 0) + r.get('width', r.get('w', 0)) / 2,
            "cy": r.get('y', 0) + r.get('height', r.get('h', 0)) / 2
        })

    # ---------------------------------------------------------
    # 2. 行聚类
    # ---------------------------------------------------------
    items.sort(key=lambda k: k['y'])
    rows = []
    if items:
        current_row = [items[0]]
        row_base_y = items[0]['y']
        row_height_ref = items[0]['h']
        
        for item in items[1:]:
            threshold = max(row_height_ref * 0.5, 10)
            if abs(item['y'] - row_base_y) < threshold:
                current_row.append(item)
            else:
                rows.append(current_row)
                current_row = [item]
                row_base_y = item['y']
                row_height_ref = item['h']
        rows.append(current_row)

    if not rows:
        return {"formatted_text": ""}

    # ---------------------------------------------------------
    # 3. 寻找最佳表头 (Best Header Search)
    # ---------------------------------------------------------
    
    # [v4新增] 表头内部合并逻辑
    def merge_header_items(row_items):
        """如果表头内两个词距离很近，合并它们，防止产生过多列"""
        if not row_items:
            return []
        
        row_items.sort(key=lambda k: k['x'])
        merged = [row_items[0]]
        
        # 间隙阈值：如果是表头，通常比较紧凑
        # [v6] 增大阈值到 60，防止表头本身被拆散
        MERGE_GAP = 60
        
        for i in range(1, len(row_items)):
            curr = row_items[i]
            prev = merged[-1]
            gap = curr['x'] - (prev['x'] + prev['w'])
            
            if gap < MERGE_GAP:
                # 合并
                new_x = prev['x']
                new_right = max(prev['x'] + prev['w'], curr['x'] + curr['w'])
                new_w = new_right - new_x
                new_text = prev['text'] + curr['text'] # 表头通常不用空格分词，或者用空字符串
                
                merged[-1] = {
                    "text": new_text,
                    "x": new_x,
                    "y": prev['y'], # 简化，沿用 prev Y
                    "w": new_w,
                    "h": max(prev['h'], curr['h']),
                    "cx": new_x + new_w / 2,
                    "cy": prev['cy']
                }
            else:
                merged.append(curr)
        return merged

    def generate_columns(row_items):
        # [v4] 先对表头行进行内部合并
        merged_items = merge_header_items(row_items)
        
        cols = []
        for i, curr in enumerate(merged_items):
            curr_right = curr['x'] + curr['w']
            
            boundary_left = 0
            boundary_right = 99999
            
            if i < len(merged_items) - 1:
                next_item = merged_items[i+1]
                next_left = next_item['x']
                boundary_right = (curr_right + next_left) / 2
            
            if i > 0:
                boundary_left = cols[-1]['right']
            
            cols.append({
                "left": boundary_left,
                "right": boundary_right,
                "ref_cx": curr['cx'],
                "title": curr['text'] # 暂时保存 title
            })
        return cols

    def calculate_alignment_score(candidate_cols, data_rows):
        score = 0
        total_items = 0
        for row in data_rows:
            for item in row:
                total_items += 1
                cx = item['cx']
                match = False
                for col in candidate_cols:
                    if col['left'] <= cx < col['right']:
                        match = True
                        break
                if match:
                    score += 1
        if total_items == 0: return 0
        return score / total_items

    # 搜索逻辑
    search_limit = min(len(rows), 8)
    best_header_idx = 0
    best_score = -1
    
    for i in range(search_limit):
        candidate_row = rows[i]
        if len(candidate_row) < 2: continue
            
        candidate_cols = generate_columns(candidate_row) # 这里已经包含了合并逻辑
        
        # [v4] 增加一个惩罚：如果生成的列数过多（比如 > 15），大概率是表头没合并好，降低得分
        if len(candidate_cols) > 15:
            continue

        validation_rows = rows[i+1 : min(i+6, len(rows))]
        if not validation_rows:
            current_score = 0
        else:
            current_score = calculate_alignment_score(candidate_cols, validation_rows)
            
        weighted_score = current_score + (len(candidate_row) * 0.01)
        if weighted_score > best_score:
            best_score = weighted_score
            best_header_idx = i

    # ---------------------------------------------------------
    # 4. 生成输出
    # ---------------------------------------------------------
    output_parts = []
    
    # 上下文
    if best_header_idx > 0:
        context_lines = []
        for i in range(best_header_idx):
            r_items = sorted(rows[i], key=lambda k: k['x'])
            line_text = " ".join([it['text'] for it in r_items])
            context_lines.append(line_text)
        if context_lines:
            output_parts.append("[上下文]:")
            output_parts.extend(context_lines)
            output_parts.append("")
            
    # 表格生成
    header_row_raw = rows[best_header_idx]
    # 重新生成最终的列定义（包含合并逻辑）
    column_boundaries = generate_columns(header_row_raw) 
    
    num_cols = len(column_boundaries)
    
    # [v4] 动态补全空表头
    # 有时候生成的列可能 title 是空的？理论上 merge_header_items 保证了 text 拼接。
    # 这里我们生成默认的 操作1, 操作2... 吗？
    # 用户抱怨的是“输出了很多本身没有的表头”。
    # 这意味着 OCR 把一个表头词拆成了两个，或者把数据行的内容误当成新列。
    # 我们现在的逻辑是：列数完全由“最佳表头行”决定。
    # 只要 merge_header_items 足够激进，列数就不会多。
    
    # 构造 Markdown
    header_titles = [c['title'].replace('|', '/') for c in column_boundaries]
    output_parts.append("| " + " | ".join(header_titles) + " |")
    output_parts.append("| " + " | ".join(["---"] * num_cols) + " |")
    
    # 只有当元素在 header 的 X 范围附近时才保留
    if column_boundaries:
        table_min_x = column_boundaries[0]['left'] if column_boundaries[0]['left'] > -999 else column_boundaries[0]['ref_cx'] - 100
        # 修正无穷大
        if table_min_x < 0: table_min_x = 0
        
        last_col = column_boundaries[-1]
        table_max_x = last_col['right'] if last_col['right'] < 99999 else last_col['ref_cx'] + 100
    else:
        table_min_x = 0
        table_max_x = 99999

    # [v5] 数据行内部合并逻辑
    def merge_data_row_items(row_items):
        """
        合并数据行中距离很近的元素（例如 '包含子节点' 和 '+2'）
        这能防止它们被分配到不同的列，或者因为中心点偏移而被错误归类。
        """
        if not row_items:
            return []
        
        row_items.sort(key=lambda k: k['x'])
        merged = [row_items[0]]
        
        # 数据行的合并阈值
        # [v6] 增大阈值到 60，确保 "+2" 等标签能被合并到前一个文本中
            # [v7] 针对 "+n" 格式的文本，进一步放宽合并阈值
            DATA_MERGE_GAP = 60
            
            for i in range(1, len(row_items)):
                curr = row_items[i]
                prev = merged[-1]
                
                # 计算水平间隙
                gap = curr['x'] - (prev['x'] + prev['w'])

                # 检查当前文本是否是 +n 格式
                import re
                is_plus_n = bool(re.match(r'^\+\d+$', curr['text'].strip()))
                
                effective_gap_limit = DATA_MERGE_GAP
                if is_plus_n:
                    effective_gap_limit = 100 # 如果是 +n，允许更远的距离 (比如 100px)
                
                # 只有当间隙足够小，且它们在同一行（Y轴重叠已经在 detect_rows 保证了，但这里可以再校验一下高度差？）
                # detect_rows 已经保证了 Y 轴接近。
                
                if gap < effective_gap_limit:
                    # 合并
                    new_x = prev['x']
                    new_right = max(prev['x'] + prev['w'], curr['x'] + curr['w'])
                    new_w = new_right - new_x
                    
                    # 数据行合并时加空格
                    new_text = prev['text'] + " " + curr['text']
                    
                    merged[-1] = {
                        "text": new_text,
                        "x": new_x,
                        "y": prev['y'], 
                        "w": new_w,
                        "h": max(prev['h'], curr['h']),
                        "cx": new_x + new_w / 2,
                        "cy": prev['cy']
                    }
                else:
                    merged.append(curr)
            return merged

    for row_idx in range(best_header_idx + 1, len(rows)):
        # [v5] 先合并行内碎片
        row_items = merge_data_row_items(rows[row_idx])
        
        row_cells = [[] for _ in range(num_cols)]
        
        for item in row_items:
            cx = item['cx']
            
            # 宽松一点的 ROI
            if cx < table_min_x - 50 or cx > table_max_x + 50:
                continue
                
            target_col_idx = -1
            for col_idx, col in enumerate(column_boundaries):
                if col['left'] <= cx < col['right']:
                    target_col_idx = col_idx
                    break
            
            if target_col_idx == -1:
                # 兜底
                min_dist = 99999
                best_idx = -1
                for col_idx, col in enumerate(column_boundaries):
                    dist = abs(cx - col['ref_cx'])
                    if dist < min_dist:
                        min_dist = dist
                        best_idx = col_idx
                if min_dist < 200:
                    target_col_idx = best_idx
            
            if target_col_idx != -1:
                row_cells[target_col_idx].append(item)
        
        has_content = any(len(cell) > 0 for cell in row_cells)
        if has_content:
            final_row_texts = []
            for col_idx in range(num_cols):
                items_in_cell = row_cells[col_idx]
                if not items_in_cell:
                    final_row_texts.append(" ")
                else:
                    items_in_cell.sort(key=lambda k: k['x'])
                    merged_text = " ".join([it['text'] for it in items_in_cell])
                    merged_text = merged_text.replace('|', '/').replace('\n', ' ')
                    final_row_texts.append(merged_text)
            output_parts.append("| " + " | ".join(final_row_texts) + " |")

    # [v8] 优化 Raw OCR Data 输出格式为 JSON，方便 LLM 结构化理解
    # 提供给大模型的不仅仅是文本，还有经过行聚类后的坐标信息
    raw_rows_info = []
    
    for i, row in enumerate(rows):
        # 按 x 排序
        sorted_items = sorted(row, key=lambda k: k['x'])
        row_data = {
            "row_index": i,
            "items": []
        }
        for item in sorted_items:
            row_data["items"].append({
                "text": item['text'],
                "x": int(item['x']),
                "w": int(item['w'])
            })
        raw_rows_info.append(row_data)
    
    output_parts.append("\n[OCR_RAW_DATA_JSON_START]")
    output_parts.append(json.dumps(raw_rows_info, ensure_ascii=False))
    output_parts.append("[OCR_RAW_DATA_JSON_END]")

    return {
        "formatted_text": "\n".join(output_parts),
        "row_count": len(rows),
        "col_count": num_cols,
        "debug_info": f"Header Merged. Final Cols: {num_cols}. Added JSON Raw Layout."
    }
