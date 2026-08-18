// 「流式回复消息个数」配置。
// 控制 AI 一次回复最多拆分成多少条消息气泡。
// 按会话级别存储，跟 keyboard-auto-send-config 同模式。

const CONFIG_KEY = "float_streaming_reply_count_v1";

export const MIN_STREAMING_REPLY_COUNT = 1;
export const MAX_STREAMING_REPLY_COUNT = 20;
export const DEFAULT_STREAMING_REPLY_COUNT = 5;

export interface StreamingReplyCountConfig {
    /** 按会话的消息个数。缺省用 DEFAULT_STREAMING_REPLY_COUNT。key = sessionId。 */
    sessionCount: Record<string, number>;
}

export function normalizeReplyCount(value: unknown, fallback = DEFAULT_STREAMING_REPLY_COUNT): number {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return fallback;
    return Math.max(MIN_STREAMING_REPLY_COUNT, Math.min(MAX_STREAMING_REPLY_COUNT, Math.round(raw)));
}

export function loadStreamingReplyCountConfig(): StreamingReplyCountConfig {
    if (typeof window === "undefined") return { sessionCount: {} };
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (!raw) return { sessionCount: {} };
        const saved = JSON.parse(raw) as Partial<StreamingReplyCountConfig>;
        const countMap: Record<string, number> = {};
        if (saved.sessionCount && typeof saved.sessionCount === "object") {
            for (const [key, value] of Object.entries(saved.sessionCount)) {
                const n = Number(value);
                if (Number.isFinite(n)) countMap[key] = normalizeReplyCount(n);
            }
        }
        return { sessionCount: countMap };
    } catch {
        return { sessionCount: {} };
    }
}

function saveConfig(config: StreamingReplyCountConfig): void {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

/** 取该会话的流式回复消息个数，无自定义则返回默认值。 */
export function getStreamingReplyCount(sessionId?: string): number {
    const config = loadStreamingReplyCountConfig();
    if (sessionId && sessionId in config.sessionCount) {
        return config.sessionCount[sessionId];
    }
    return DEFAULT_STREAMING_REPLY_COUNT;
}

/** 写该会话的流式回复消息个数；传 null 表示清掉、回到默认。 */
export function setSessionStreamingReplyCount(sessionId: string, count: number | null): void {
    const config = loadStreamingReplyCountConfig();
    const countMap = { ...config.sessionCount };
    if (count === null) {
        delete countMap[sessionId];
    } else {
        countMap[sessionId] = normalizeReplyCount(count);
    }
    saveConfig({ ...config, sessionCount: countMap });
}
