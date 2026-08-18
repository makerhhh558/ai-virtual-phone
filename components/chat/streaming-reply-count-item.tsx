"use client";

// 聊天设置面板里的「流式回复消息个数」设置项，自包含：
// 自己读写 streaming-reply-count-config，不向面板要任何 props（sessionId 除外）。
// 挂载方式：在 chat-settings-panel.tsx 的 KeyboardAutoSendDebounceItem 上方插一行
//   <StreamingReplyCountItem sessionId={session.id} />
//
// 视觉与面板其他行保持一致：左侧彩色图标 + 标题/说明 + 右侧加减按钮与数字。

import { useState, type CSSProperties } from "react";
import {
    getStreamingReplyCount,
    setSessionStreamingReplyCount,
    MIN_STREAMING_REPLY_COUNT,
    MAX_STREAMING_REPLY_COUNT,
} from "@/lib/streaming-reply-count-config";

export function StreamingReplyCountItem({ sessionId }: { sessionId: string }) {
    const [count, setCount] = useState(() => getStreamingReplyCount(sessionId));

    const update = (next: number) => {
        const clamped = Math.max(MIN_STREAMING_REPLY_COUNT, Math.min(MAX_STREAMING_REPLY_COUNT, next));
        setCount(clamped);
        setSessionStreamingReplyCount(sessionId, clamped);
    };

    return (
        <div className="menu-item">
            {/* 内联 SVG 图标 —— 多气泡消息样式，与面板风格一致 */}
            <span className="chat-info-icon" style={{ "--icon-color": "#6366f1" } as CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                    <line x1="8" y1="10" x2="8" y2="10.01" />
                    <line x1="12" y1="10" x2="12" y2="10.01" />
                    <line x1="16" y1="10" x2="16" y2="10.01" />
                </svg>
            </span>
            <div className="menu-label-group">
                <span className="menu-label">流式回复消息个数</span>
                <span className="menu-desc">AI 一次回复最多拆分为几条消息（{MIN_STREAMING_REPLY_COUNT}~{MAX_STREAMING_REPLY_COUNT}）</span>
            </div>
            <div className="menu-right" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                    type="button"
                    aria-label="减少"
                    disabled={count <= MIN_STREAMING_REPLY_COUNT}
                    onClick={() => update(count - 1)}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "none",
                        background: count <= MIN_STREAMING_REPLY_COUNT ? "color-mix(in srgb, var(--c-text) 8%, transparent)" : "color-mix(in srgb, var(--c-text) 12%, transparent)",
                        color: count <= MIN_STREAMING_REPLY_COUNT ? "color-mix(in srgb, var(--c-text) 30%, transparent)" : "var(--c-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: count <= MIN_STREAMING_REPLY_COUNT ? "not-allowed" : "pointer",
                        transition: "background .15s",
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
                <span style={{ minWidth: 24, textAlign: "center", fontWeight: 600, fontSize: 15, color: "var(--c-text)" }}>
                    {count}
                </span>
                <button
                    type="button"
                    aria-label="增加"
                    disabled={count >= MAX_STREAMING_REPLY_COUNT}
                    onClick={() => update(count + 1)}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "none",
                        background: count >= MAX_STREAMING_REPLY_COUNT ? "color-mix(in srgb, var(--c-text) 8%, transparent)" : "color-mix(in srgb, var(--c-text) 12%, transparent)",
                        color: count >= MAX_STREAMING_REPLY_COUNT ? "color-mix(in srgb, var(--c-text) 30%, transparent)" : "var(--c-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: count >= MAX_STREAMING_REPLY_COUNT ? "not-allowed" : "pointer",
                        transition: "background .15s",
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
