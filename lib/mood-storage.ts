// lib/mood-storage.ts
// 用户心情（全局一份）与角色心情（每个 session 独立）的读写工具

import { kvGet, kvSet, registerKvMigration } from "./kv-db";

// ── 用户心情 ──

export type UserMood = {
    emoji: string;   // e.g. "😊"
    text: string;    // e.g. "今天天气真好"
    updatedAt: string; // ISO date
};

const USER_MOOD_KEY = "user-mood";
registerKvMigration(USER_MOOD_KEY);

const DEFAULT_USER_MOOD: UserMood = {
    emoji: "💭",
    text: "在线",
    updatedAt: new Date().toISOString(),
};

export function loadUserMood(): UserMood {
    const raw = kvGet(USER_MOOD_KEY);
    if (!raw) return DEFAULT_USER_MOOD;
    try {
        return JSON.parse(raw) as UserMood;
    } catch {
        return DEFAULT_USER_MOOD;
    }
}

export function saveUserMood(mood: UserMood): void {
    kvSet(USER_MOOD_KEY, JSON.stringify(mood));
    window.dispatchEvent(new CustomEvent(USER_MOOD_UPDATED_EVENT));
}

export const USER_MOOD_UPDATED_EVENT = "user-mood-updated";

// ── 角色心情 ──

export type CharacterMood = {
    emoji: string;
    text: string;
    updatedAt: string;
};

const DEFAULT_CHARACTER_MOOD: CharacterMood = {
    emoji: "💭",
    text: "在线",
    updatedAt: new Date().toISOString(),
};

export function getDefaultCharacterMood(): CharacterMood {
    return { ...DEFAULT_CHARACTER_MOOD, updatedAt: new Date().toISOString() };
}

// ── 从 AI 回复中解析心情标签 ──
// 格式：[心情:😊开心] 或 [心情:😊 开心]
// 返回解析出的心情或 null

const MOOD_TAG_REGEX = /\[心情[:：]([^\]]+)\]/;

export function parseMoodFromResponse(text: string): CharacterMood | null {
    const match = text.match(MOOD_TAG_REGEX);
    if (!match) return null;
    const raw = match[1].trim();
    if (!raw) return null;

    // 尝试分离 emoji 和文字
    // emoji 通常在最前面，可能跟着空格或直接跟文字
    const emojiMatch = raw.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    if (emojiMatch) {
        const emoji = emojiMatch[0];
        const text = raw.slice(emoji.length).trim();
        return {
            emoji,
            text: text || "心情中",
            updatedAt: new Date().toISOString(),
        };
    }

    // 没有 emoji，把整段当文字
    return {
        emoji: "💭",
        text: raw,
        updatedAt: new Date().toISOString(),
    };
}

// ── 从 AI 回复中移除心情标签（不展示给用户看） ──

export function stripMoodTag(text: string): string {
    return text.replace(MOOD_TAG_REGEX, "").trim();
}

// ── 构建提示词片段 ──

export function buildMoodCarePrompt(userMood: UserMood): string {
    return `【用户心情状态】\n用户当前心情：${userMood.emoji} ${userMood.text}\n\n你需要关注用户的情绪变化。如果用户心情不好或情绪波动，请主动关心、提供安慰或聊一些轻松的话题让对方开心。用自然的方式表达关心，不要生硬或说教。`;
}

export function buildMoodOutputInstruction(): string {
    return `\n【心情表达】\n你可以在回复中更新自己的心情状态。格式：[心情:emoji+简短描述]，例如 [心情:😊心情不错] [心情:😤有点烦] [心情:🥰想你了]。这个标签会被系统提取后展示在你的名字下方，用户不会在聊天气泡中看到。你可以随时更新也可以不更新，完全取决于当下的情绪和聊天氛围。不聊天时也会保留上一次的心情状态。`;
}

// ── 基础 emoji 列表（用于用户心情选择器） ──

export const MOOD_EMOJI_LIST = [
    "😊", "😄", "🥰", "😎", "🤗", "😌", "🥱", "😴",
    "😢", "😭", "😤", "😡", "🥺", "😰", "😱", "🤯",
    "🤔", "😏", "😜", "🤪", "😇", "🥳", "🤩", "😋",
    "💪", "🔥", "✨", "💭", "❤️", "💔", "🌈", "☀️",
    "🌙", "⭐", "🎵", "🎮", "📚", "☕", "🍜", "🌸",
];
