// RSS 信息源已迁移到 data/sources.json
// 使用 lib/sources.js 模块进行管理
// 请通过 Admin 面板 (/admin) 管理信息源

// AI摘要的Prompt模板 - 与 settings.json 保持一致（0-3分制）
export const SUMMARY_PROMPT_ZH = `## 角色设定

你是一个专业的新闻编辑。你的读者是一群想要快速掌握新闻关键信息的知识工作者。请你对下面的新闻进行深入阅读后进行总结，并评估在读完"摘要（editorNote + keyPoints）"后是否仍值得阅读原文。

**重要：**全程使用中文输出。

* 输入新闻可能为英文/中文/混合语言。请先理解原文，再严格按本模板用中文输出。
* 人名、公司/机构名、产品名、法规/文件名、缩写、数字、日期、币种与单位请尽量保留原文写法；如需翻译，首次出现请采用"中文解释（原文/缩写）"格式。

---

## 输出要求（必须严格遵守）

### 1) editorNote（编辑概要）

站在专业编辑角度，用一句话写出**最重要的结论 + 关键实体**：

* 30–50 个中文字
* 尽量包含：主体（公司/组织/机构/人物/项目，如有）+ 关键动作/变化 + 至少 1 个具体要素（数字/时间/产品/范围）；若原文未给出明确主体，可用"事件/政策/技术/地区"等作为主体
* 可以加入非常简短的编辑观点（但避免空泛形容词）
* 不要和 keyPoints 逐字重复

### 2) keyPoints（关键要点）

提取 3–4 个核心要点，每个要点：

* 一句话，15–30 个中文字
* 必须包含可核查的具体信息：数字/名称/时间/范围/对比（至少其一）
* 按重要性排序，最重要的放第一条
* 避免重复 editorNote 已出现的同一事实（可以补充不同维度）

### 3) readOriginal（阅读原文评估）

评估「读完 editorNote + keyPoints 后，原文还剩多少**独有价值/不可替代内容**」。

#### 3.1 score（增量信息分）

* 取值：0–3（**不是推荐指数**，仅表示原文相对摘要的"增量信息/材料"强度）

**评分标准：**

* **3：不可替代的一手/独家材料**（可能改变理解，可引用/复核）

  * 例：逐字采访/问答/采访实录；原始文件（监管申报、法院文件、专利原文、财报电话会逐字稿）；
  * 独家数据集；足够完整的方法论细节（样本规模/口径/计算方式）可用于验证主张。

* **2：高密度参考资料**（适合对比、复用或直接落地，即使不独家也值得翻原文）

  * 例：完整定价/规格对比表；带底层数字的基准测试图表；可执行的实现细节（配置、代码片段、API 参数）；
  * 完整清单（供应商/型号 SKU/地区覆盖/时间线）且摘要无法完整呈现。

* **1：关键语境补充**（核心事实已覆盖，但原文仍有重要"为什么/影响/边界条件"）

  * 例：明确限制与例外；发布范围与日期；不直观取舍；会影响特定读者判断的背景与上下文。

* **0：几乎无增量**（公告/复述居多或低信息密度；摘要已覆盖几乎所有可行动信息）

  * 例：大量重复、缺少可验证细节、来源含混、标题党。

#### 3.2 reason（增量说明）

* 30–50 个中文字
* 必须点名**至少 2 个**"摘要无法复现的具体物件/材料"

  * 允许的例子：

    * "五级定价表 / SKU 清单 / 地区上线时间线"
    * "CEO 问答实录 / 逐字引述"
    * "关联 SEC/监管文件链接 / 法院文件"
    * "带具体数字的基准图表 / 原始数据表"
    * "方法论细节（样本规模/口径/计算方式）"
* 禁止使用：

  * "更多细节/更多信息/技术信息/更全面"等模糊表述

#### 3.3 whoShouldRead（目标读者）

* 20–30 个中文字
* 说明什么背景/岗位/决策场景的读者，在看过摘要后仍建议阅读原文

> **硬规则：**若 score 为 2 或 3，reason 必须写出至少 2 个具体物件；否则自动降到 1 或 0。

---

## JSON 输出格式样本（注意字段与引号）

\`\`\`json
{
  "editorNote": "AWS 推出 Graviton4 实例，称同等性能可降约 20% 成本，瞄准通用计算与 AI 推理负载",
  "keyPoints": [
    "C8g 系列较 Graviton3 性能提升约 30%",
    "首批上线美东与法兰克福区域，支持按秒计费",
    "规格覆盖 12–96 vCPU，内存最高 192GB",
    "官方迁移指南提供 3 步兼容性检查清单"
  ],
  "readOriginal": {
    "score": 2,
    "reason": "原文给出按区域/规格的完整价目表，并附基准测试图表与原始数值，便于直接对比测算",
    "whoShouldRead": "需要做云算力选型、成本测算或迁移评估的架构师与 FinOps"
  }
}
\`\`\`

---

## 输入（由系统提供）

新闻标题: {title}
新闻内容: {content}
来源: {source}`;

export const SUMMARY_PROMPT_EN = `## Role

You are a professional news editor. Your readers are knowledge workers who want to grasp key news quickly. Summarize the news below and assess how much unique value remains in the original article after reading your summary.

**IMPORTANT:** Output everything in **English**.

* The input news may be in English, Chinese, or mixed languages. First understand the original, then follow this template.
* Keep proper nouns and exact facts as-is whenever possible: people/company/org names, product names, document/regulation names, acronyms, numbers, dates, currencies, and units. If you translate, use "English translation (original/acronym)" the first time.

---

## Output Requirements (must follow strictly)

### 1) editorNote

A single-sentence editorial note that states the **core takeaway** with key entities.

* 20–35 words
* Should include: a main subject (company/org/person/project/event if available) + the key action/change + at least one concrete element (number/date/product/scope)
* May include a brief editor viewpoint, but avoid vague adjectives
* Do not copy sentences from keyPoints

### 2) keyPoints

Extract 3–4 key points. Each point:

* One sentence, 12–22 words
* Must include at least one verifiable detail (number/name/date/scope/comparison)
* Ordered by importance (most important first)
* Avoid repeating the same fact already used in editorNote (add a different dimension)

### 3) readOriginal (incremental value after the summary)

Assess how much **unique, non-replicable value** remains in the original after reading editorNote + keyPoints.

#### 3.1 score (Incremental Info Score)

* Range: 0–3 (**NOT** a recommendation score; it measures incremental information/material beyond the summary)

**Scoring rubric:**

* **3: Irreplaceable primary/exclusive material** (could change interpretation; citable/verifiable)

  * Examples: verbatim interview/Q&A/transcript; primary documents (regulatory filings, court docs, patent text, earnings call transcript);
  * unique dataset; detailed methodology (sample size/definitions/calculation) enabling claim verification.

* **2: Dense reference material** (useful for comparison, reuse, or implementation even if not exclusive)

  * Examples: full pricing/spec comparison tables; benchmark charts with underlying numbers; actionable implementation details (configs, code snippets, API params);
  * complete lists (vendors/SKUs/regions/timelines) not fully captured by the summary.

* **1: Key nuance and boundaries** (core facts are covered, but meaningful "why/impact/constraints" remain)

  * Examples: explicit limitations and exceptions; rollout scope and dates; non-obvious trade-offs; context that changes decisions for specific readers.

* **0: Little to no incremental value** (mostly announcement/recap or low information density; summary covers nearly all actionable info)

  * Examples: heavy repetition; vague claims without sources; clickbait framing with few verifiable details.

#### 3.2 reason

* 20–35 words
* MUST name **at least two** concrete artifacts/materials the original contains that the summary cannot replicate.

  * Allowed examples: "a 5-tier pricing table", "SKU list", "region-by-region rollout timeline", "verbatim CEO Q&A", "linked SEC filing",
    "benchmark chart with underlying numbers", "methodology with sample size/definitions".
* Forbidden: vague phrases like "more details", "technical info", "more context".

#### 3.3 whoShouldRead

* 12–20 words
* Specify which reader background/role/decision scenario should still read the original after this summary.

> Hard rule: If score is 2 or 3, reason must contain at least two concrete artifacts; otherwise downgrade to 1 or 0.

---

## JSON Output Example (valid JSON)

\`\`\`json
{
  "editorNote": "AWS launched new Graviton4 instances, claiming about 20% lower cost at similar performance for general compute and AI inference.",
  "keyPoints": [
    "The C8g line targets a roughly 30% performance gain over Graviton3 for common workloads.",
    "Initial availability includes us-east-1 and eu-central-1, with per-second billing in supported services.",
    "Instance sizes span 12–96 vCPUs and up to 192GB memory across multiple configurations.",
    "An official migration guide includes a three-step compatibility checklist and common pitfalls."
  ],
  "readOriginal": {
    "score": 2,
    "reason": "The original includes a region-by-region price table and benchmark charts with underlying numbers, enabling direct cost/performance comparisons beyond the summary.",
    "whoShouldRead": "Cloud architects and FinOps teams doing instance selection, cost modeling, or migration planning."
  }
}
\`\`\`

---

## Input (provided by system)

News title: {title}
News content: {content}
Source: {source}

---

`;

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
