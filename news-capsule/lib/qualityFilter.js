/**
 * 内容质量过滤器
 * 检测不适合进行 AI 总结的内容
 */

// 默认过滤规则
export const DEFAULT_QUALITY_RULES = {
    // 规则1: 最小字数阈值
    minWordCount: 80,

    // 规则2: 信息合集关键词（标题匹配）
    aggregationPatterns: [
        '8点1氪',
        '早报',
        '晚报',
        '日报',
        '周报',
        '今日热点',
        '一周回顾',
        '快讯汇总',
        'TOP\\s*\\d+',
        '盘点',
        '合集'
    ],

    // 规则3: 视频检测模式
    videoPatterns: [
        '<video',
        '<iframe.*youtube',
        '<iframe.*bilibili',
        'youtube\\.com/watch',
        'bilibili\\.com/video',
        'v\\.qq\\.com',
        'youku\\.com/v_show'
    ],

    // 视频内容的最小文字量（低于此值认为是视频为主）
    videoMinWordCount: 200
};

/**
 * 检测单个条目的内容质量
 * @param {Object} item - 条目数据，包含 title, content, wordCount 等
 * @param {Object} rules - 过滤规则配置
 * @returns {{ skipSummary: boolean, reasons: string[], checkedAt: string }}
 */
export function checkItemQuality(item, rules = DEFAULT_QUALITY_RULES) {
    const reasons = [];

    // 规则1: 内容太短
    const wordCount = item.wordCount || 0;
    if (wordCount < rules.minWordCount) {
        reasons.push('content_too_short');
    }

    // 规则2: 信息合集（标题匹配）
    const title = item.title || '';
    const aggregationMatched = rules.aggregationPatterns.some(pattern => {
        try {
            const re = new RegExp(pattern, 'i');
            return re.test(title);
        } catch {
            return title.includes(pattern);
        }
    });
    if (aggregationMatched) {
        reasons.push('aggregation_content');
    }

    // 规则3: 视频为主（HTML 检测 + 字数判断）
    const rawHtml = item.content || item.rawHtml || '';
    const hasVideo = rules.videoPatterns.some(pattern => {
        try {
            const re = new RegExp(pattern, 'i');
            return re.test(rawHtml);
        } catch {
            return rawHtml.includes(pattern);
        }
    });
    if (hasVideo && wordCount < rules.videoMinWordCount) {
        reasons.push('video_primary');
    }

    return {
        skipSummary: reasons.length > 0,
        reasons,
        checkedAt: new Date().toISOString()
    };
}

/**
 * 批量检测条目质量
 * @param {Array} items - 条目数组
 * @param {Object} rules - 过滤规则
 * @returns {{ items: Array, stats: { total, flagged, byReason } }}
 */
export function checkItemsQuality(items, rules = DEFAULT_QUALITY_RULES) {
    const stats = {
        total: items.length,
        flagged: 0,
        byReason: {
            content_too_short: 0,
            aggregation_content: 0,
            video_primary: 0
        }
    };

    const checkedItems = items.map(item => {
        const qualityFlags = checkItemQuality(item, rules);

        if (qualityFlags.skipSummary) {
            stats.flagged++;
            qualityFlags.reasons.forEach(reason => {
                if (stats.byReason[reason] !== undefined) {
                    stats.byReason[reason]++;
                }
            });
        }

        return {
            ...item,
            qualityFlags
        };
    });

    return { items: checkedItems, stats };
}

/**
 * 获取质量标记的中文描述
 * @param {string} reason - 原因代码
 * @returns {{ label: string, emoji: string, color: string }}
 */
export function getReasonDisplay(reason) {
    const displays = {
        content_too_short: {
            label: '内容太短',
            emoji: '🚫',
            color: 'red'
        },
        aggregation_content: {
            label: '信息合集',
            emoji: '📰',
            color: 'orange'
        },
        video_primary: {
            label: '视频为主',
            emoji: '🎬',
            color: 'blue'
        }
    };
    return displays[reason] || { label: reason, emoji: '❓', color: 'gray' };
}
