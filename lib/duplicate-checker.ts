// lib/duplicate-checker.ts
// 世界书/角色卡重复内容检测工具

export type DuplicatePair = {
    sourceA: string;
    nameA: string;
    contentA: string;
    sourceB: string;
    nameB: string;
    contentB: string;
    ratio: number;
    overlaps: string[];
};

/**
 * 计算两段文本的相似度（基于公共子串）
 */
export function computeSimilarity(a: string, b: string, minLen = 20): { ratio: number; overlaps: string[] } {
    if (!a.trim() || !b.trim()) return { ratio: 0, overlaps: [] };
    const normA = a.replace(/\s+/g, " ").toLowerCase();
    const normB = b.replace(/\s+/g, " ").toLowerCase();
    const shorter = normA.length <= normB.length ? normA : normB;
    const longer = normA.length <= normB.length ? normB : normA;

    const overlaps: string[] = [];
    let totalOverlap = 0;
    let i = 0;
    while (i <= shorter.length - minLen) {
        const snippet = shorter.slice(i, i + minLen);
        const idx = longer.indexOf(snippet);
        if (idx === -1) { i++; continue; }
        let len = minLen;
        while (i + len < shorter.length && idx + len < longer.length && shorter[i + len] === longer[idx + len]) len++;
        overlaps.push(shorter.slice(i, i + len));
        totalOverlap += len;
        i += len;
    }
    const ratio = shorter.length > 0 ? totalOverlap / shorter.length : 0;
    return { ratio, overlaps };
}

type FlatEntry = { source: string; name: string; content: string };

/**
 * 世界书内部互查：找出世界书条目之间重复率 >= threshold 的配对
 */
export function checkWorldBookDuplicates(
    books: { name: string; entries: { disable?: boolean; comment?: string; key?: string; content: string }[] }[],
    threshold = 0.5,
): DuplicatePair[] {
    const allEntries: FlatEntry[] = [];
    for (const book of books) {
        for (const entry of book.entries || []) {
            if (entry.disable || !entry.content?.trim()) continue;
            allEntries.push({ source: book.name, name: entry.comment || entry.key || "无标题", content: entry.content });
        }
    }
    return findDuplicates(allEntries, threshold);
}

/**
 * 角色维度排查：角色卡(persona+personality) vs 该角色绑定的世界书条目
 */
export function checkCharacterDuplicates(
    character: { name: string; persona?: string; personality?: string },
    boundBooks: { name: string; entries: { disable?: boolean; comment?: string; key?: string; content: string }[] }[],
    threshold = 0.5,
): DuplicatePair[] {
    const allEntries: FlatEntry[] = [];

    // 角色卡内容
    if (character.persona?.trim()) {
        allEntries.push({ source: `角色卡「${character.name}」`, name: "角色描述", content: character.persona });
    }
    if (character.personality?.trim()) {
        allEntries.push({ source: `角色卡「${character.name}」`, name: "角色性格", content: character.personality });
    }

    // 世界书条目
    for (const book of boundBooks) {
        for (const entry of book.entries || []) {
            if (entry.disable || !entry.content?.trim()) continue;
            allEntries.push({ source: `世界书「${book.name}」`, name: entry.comment || entry.key || "无标题", content: entry.content });
        }
    }

    return findDuplicates(allEntries, threshold);
}

function findDuplicates(entries: FlatEntry[], threshold: number): DuplicatePair[] {
    const pairs: DuplicatePair[] = [];
    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const { ratio, overlaps } = computeSimilarity(entries[i].content, entries[j].content);
            if (ratio >= threshold) {
                pairs.push({
                    sourceA: entries[i].source,
                    nameA: entries[i].name,
                    contentA: entries[i].content,
                    sourceB: entries[j].source,
                    nameB: entries[j].name,
                    contentB: entries[j].content,
                    ratio,
                    overlaps,
                });
            }
        }
    }
    return pairs.sort((a, b) => b.ratio - a.ratio);
}

/**
 * 将文本中与 overlaps 匹配的部分用 HTML 红字包裹，用于展示
 */
export function highlightOverlaps(content: string, overlaps: string[]): string {
    if (overlaps.length === 0) return escapeHtml(content);
    const normContent = content.replace(/\s+/g, " ").toLowerCase();
    const ranges: [number, number][] = [];
    for (const overlap of overlaps) {
        const normOverlap = overlap.replace(/\s+/g, " ").toLowerCase();
        let start = 0;
        while (true) {
            const idx = normContent.indexOf(normOverlap, start);
            if (idx === -1) break;
            ranges.push([idx, idx + normOverlap.length]);
            start = idx + normOverlap.length;
        }
    }
    if (ranges.length === 0) return escapeHtml(content);
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
        const last = merged[merged.length - 1];
        if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
        else merged.push(ranges[i]);
    }
    const normLen = normContent.length;
    const origLen = content.length;
    const scale = origLen / normLen;
    let result = "";
    let cursor = 0;
    for (const [s, e] of merged) {
        const origS = Math.round(s * scale);
        const origE = Math.min(Math.round(e * scale), origLen);
        if (origS > cursor) result += escapeHtml(content.slice(cursor, origS));
        result += `<span style="color:#dc2626;font-weight:600">${escapeHtml(content.slice(origS, origE))}</span>`;
        cursor = origE;
    }
    if (cursor < origLen) result += escapeHtml(content.slice(cursor));
    return result;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
