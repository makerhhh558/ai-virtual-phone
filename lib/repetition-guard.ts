// lib/repetition-guard.ts
// 复读防护：检测 LLM 输出中是否大段复述了注入的世界书/角色设定内容，并自动截除。

const DEFAULT_MATCH_THRESHOLD = 50;

export function stripRepeatedInjection(
    output: string,
    injectedTexts: string[],
    threshold: number = DEFAULT_MATCH_THRESHOLD,
): { cleaned: string; stripped: boolean } {
    if (!output || injectedTexts.length === 0) return { cleaned: output, stripped: false };

    const normalize = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
    const outputNorm = normalize(output);

    const refs: string[] = [];
    for (const text of injectedTexts) {
        if (!text || text.length < threshold) continue;
        refs.push(normalize(text));
    }
    if (refs.length === 0) return { cleaned: output, stripped: false };

    const matchedRanges: [number, number][] = [];

    for (const ref of refs) {
        let searchFrom = 0;
        while (searchFrom <= outputNorm.length - threshold) {
            const snippet = outputNorm.slice(searchFrom, searchFrom + threshold);
            const refIdx = ref.indexOf(snippet);
            if (refIdx === -1) { searchFrom++; continue; }
            let len = threshold;
            while (
                searchFrom + len < outputNorm.length &&
                refIdx + len < ref.length &&
                outputNorm[searchFrom + len] === ref[refIdx + len]
            ) { len++; }
            matchedRanges.push([searchFrom, searchFrom + len]);
            searchFrom += len;
        }
    }

    if (matchedRanges.length === 0) return { cleaned: output, stripped: false };

    const merged = mergeRanges(matchedRanges);
    const normToOrig = buildNormToOrigMapping(output);
    let cleaned = output;
    let offset = 0;

    for (const [nStart, nEnd] of merged) {
        const oStart = normToOrig[nStart];
        const oEnd = normToOrig[nEnd] ?? output.length;
        if (oStart === undefined) continue;
        const adjStart = oStart - offset;
        const adjEnd = oEnd - offset;
        if (adjStart < 0 || adjEnd > cleaned.length) continue;
        cleaned = cleaned.slice(0, adjStart) + cleaned.slice(adjEnd);
        offset += (oEnd - oStart);
    }

    cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
    return { cleaned, stripped: cleaned !== output.trim() };
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        if (sorted[i][0] <= last[1]) last[1] = Math.max(last[1], sorted[i][1]);
        else merged.push(sorted[i]);
    }
    return merged;
}

function buildNormToOrigMapping(original: string): number[] {
    const mapping: number[] = [];
    let i = 0;
    while (i < original.length) {
        if (/\s/.test(original[i])) {
            mapping.push(i);
            while (i < original.length && /\s/.test(original[i])) i++;
        } else {
            mapping.push(i);
            i++;
        }
    }
    mapping.push(original.length);
    return mapping;
}
