import { diffWords, Change } from 'diff';
import wtf from 'wtf_wikipedia';

export interface ExtendedChange extends Change {
    moved?: boolean;
    moveId?: string;
}

export function cleanWikiText(text: string): string {
    if (!text) return '';
    try {
        const doc = wtf(text);
        return doc.text();
    } catch (e) {
        return text; // Fallback to raw text if parsing fails
    }
}

export function calculateDiff(oldText: string, newText: string): ExtendedChange[] {
    const cleanOld = cleanWikiText(oldText);
    const cleanNew = cleanWikiText(newText);

    const diff = diffWords(cleanOld, cleanNew);

    // Basic move detection logic (placeholder)
    return diff;
}
