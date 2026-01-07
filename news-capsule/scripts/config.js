// RSS 信息源已迁移到 data/sources.json
// 使用 lib/sources.js 模块进行管理
// 请通过 Admin 面板 (/admin) 管理信息源

// AI摘要的Prompt模板 - 新版（editorNote + keyPoints 格式）
export const SUMMARY_PROMPT_ZH = `你是一个专业的新闻编辑。你的读者是一群想要快速掌握新闻关键信息的知识工作者，他们希望你能对下面的新闻进行概述，并提供是否需要阅读原文的建议，下面是具体要求：

## 输出要求

### 1. editorNote（编辑概要）
站在一个专业编辑的角度对新闻稿进行简要评述：
- 30-50个中文字
- 突出最重要的信息点（公司、产品、数字）
- 可以带入'编辑'的角色给出简短的观点或评述

### 2. keyPoints（关键要点）
提取3-4个核心要点，每个要点：
- 一句话，15-30字
- 包含具体信息（数字、名称、时间等）
- 按重要性排序，最重要的放第一条
- 避免重复 editorNote 中已有的信息

### 3. readOriginal（阅读原文推荐）
评估「读完editorNote和keyPoints后，原文还剩多少独有价值」：

**score 评分标准：**
- 5分：原文有独家内容（专访、内部消息、独家数据），摘要无法替代
- 4分：原文有完整的数据表格、对比图、代码示例等结构化内容
- 3分：原文有更多细节，但核心信息已在摘要中
- 2分：原文是官方公告或新闻稿，摘要已完整概括
- 1分：原文内容较少或质量一般，摘要已完整呈现全部价值

**reason 理由要求：**
- 必须具体说明原文有什么摘要没有的内容
- 好的例子："原文附有5款竞品的规格对比表"、"含 CEO 专访原文"、"摘要已完整，原文无关键新增"
- 禁止使用笼统词汇如"技术细节"、"详细信息"、"更多内容"

## JSON 输出格式样本

{
  "editorNote": "三星冰箱支持语音开关门，CES 2026 智能家居再升级",
  "keyPoints": [
    "通过 Bixby 语音指令即可开关冰箱门，门开启角度超过90度",
    "支持手掌轻拍激活，适合烹饪时手部不便的场景",
    "Family Hub 系列专属功能，具体上市时间未公布"
  ],
  "readOriginal": {
    "score": 2,
    "reason": "官方功能公告，摘要已覆盖全部要点"
  }
}

---

新闻标题: {title}
新闻内容: {content}
来源: {source}`;

export const SUMMARY_PROMPT_EN = `You are a professional news editor. Your readers are knowledge workers who want to quickly grasp key news information. They want you to summarize the following news and provide a recommendation on whether to read the original. Here are the specific requirements:

## Output Requirements

### 1. editorNote
A brief editorial comment on the news article from a professional editor's perspective:
- 20-40 words
- Highlight the most important info (company, product, numbers)
- Can include editorial perspective or brief commentary

### 2. keyPoints
Extract 3-4 key points, each point should:
- Be one sentence, 15-30 words
- Include specific info (numbers, names, dates)
- Be ordered by importance
- Avoid repeating what's already in editorNote

### 3. readOriginal
Evaluate "how much unique value remains in the original after reading editorNote and keyPoints":

**Score criteria:**
- 5: Exclusive content (interviews, insider info, exclusive data) - summary can't replace
- 4: Complete data tables, comparison charts, code examples
- 3: More details available, but core info is in summary
- 2: Official announcement/press release, summary covers everything
- 1: Limited or low-quality content, summary captures full value

**Reason requirements:**
- Must specifically state what the original has that the summary doesn't
- Good examples: "Contains full spec comparison table of 5 competitors", "Includes CEO interview transcript"
- Do NOT use vague phrases like "technical details", "more information"

## JSON Output Format

{
  "editorNote": "Samsung fridge now opens with voice commands at CES 2026",
  "keyPoints": [
    "Bixby voice commands can open/close fridge door, opening beyond 90 degrees",
    "Also supports palm tap activation for hands-busy cooking scenarios",
    "Exclusive to Family Hub series, release date not announced"
  ],
  "readOriginal": {
    "score": 2,
    "reason": "Official feature announcement, summary covers all key points"
  }
}

---

**IMPORTANT: You MUST output everything in English, even if the news article is in another language.**

News title: {title}
News content: {content}
Source: {source}`;

// 新闻去重Prompt（基于标题，在AI摘要前执行）
export const DEDUPE_PROMPT = `你是一个新闻去重专家。请分析以下新闻标题列表，找出报道相同事件的重复条目。

判断标准：
- 相同的核心事件（如同一公司的同一公告、同一产品发布、同一交易等）
- 即使报道角度不同，只要是同一事件就算重复

新闻标题列表：
{news_list}

请返回应该保留的新闻索引列表（从0开始）。
如果有重复新闻：
- 优先保留标题更完整、信息更丰富的一条

只返回 JSON 数组格式，如：[0, 1, 3, 5, 6]
不要包含任何解释文字。`;
