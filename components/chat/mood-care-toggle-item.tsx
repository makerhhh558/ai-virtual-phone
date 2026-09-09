"use client";

// 聊天设置面板里的「心情主动关心」开关
// 挂载位置：chat-settings-panel.tsx 的 StreamingReplyCountItem 下方
// 视觉与面板其他行保持一致：左侧彩色 SVG 图标 + 标题/说明 + 右侧 Toggle 开关

import { useState, type CSSProperties } from "react";
import { loadChatSessions, saveChatSessions } from "@/lib/chat-storage";
import { Toggle } from "@/components/ui/form";

export function MoodCareToggleItem({ sessionId }: { sessionId: string }) {
    const [enabled, setEnabled] = useState(() => {
        const sessions = loadChatSessions();
        const s = sessions.find(s => s.id === sessionId);
        return s?.moodCareEnabled ?? false;
    });

    const toggle = (next: boolean) => {
        setEnabled(next);
        const sessions = loadChatSessions().map(s =>
            s.id === sessionId ? { ...s, moodCareEnabled: next } : s
        );
        saveChatSessions(sessions);
    };

    return (
        <div className="menu-item">
            <span className="chat-info-icon" style={{ "--icon-color": "#f59e0b" } as CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
            </span>
            <div className="menu-label-group">
                <span className="menu-label">心情主动关心</span>
                <span className="menu-desc">开启后角色会关注你的心情变化并主动关心</span>
            </div>
            <div className="menu-right">
                <Toggle checked={enabled} onChange={toggle} />
            </div>
        </div>
    );
}
