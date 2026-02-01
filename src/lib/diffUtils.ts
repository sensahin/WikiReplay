import { diffWords, diffSentences, diffLines, Change } from 'diff';
import wtf from 'wtf_wikipedia';
import wtfMarkdown from 'wtf-plugin-markdown';

export type DiffGranularity = 'word' | 'sentence' | 'line';

export interface ExtendedChange extends Change {
    moved?: boolean;
    moveId?: string;
}

wtf.extend(wtfMarkdown);

type ReferenceLike = {
    markdown?: () => string;
};

function buildReferencesMarkdown(doc: { references?: () => ReferenceLike[] }): string {
    const refs = doc.references?.() ?? [];
    if (!Array.isArray(refs) || refs.length === 0) return '';

    return refs
        .map((ref, index) => {
            const raw = typeof ref.markdown === 'function' ? ref.markdown() : '';
            const cleaned = raw.replace(/^⌃\s*/, '').trim();
            return `${index + 1}. ${cleaned || 'Reference'}`;
        })
        .join('\n');
}

function injectReferences(markdown: string, references: string): string {
    if (!references) return markdown;

    const headingRegex = /^(#{2,6})\s+References\s*$/im;
    const match = headingRegex.exec(markdown);

    if (!match) {
        const trimmed = markdown.trimEnd();
        return `${trimmed}\n\n## References\n\n${references}\n`;
    }

    const headingLineEnd = markdown.indexOf('\n', match.index);
    const insertPos = headingLineEnd === -1 ? markdown.length : headingLineEnd + 1;
    const afterHeading = markdown.slice(insertPos);
    const nextHeading = afterHeading.match(/^\s*#{1,6}\s+/m);
    const sectionBody = nextHeading ? afterHeading.slice(0, nextHeading.index) : afterHeading;
    const hasContent = sectionBody.split('\n').some((line) => line.trim().length > 0);

    if (hasContent) return markdown;

    const prefix = markdown.slice(0, insertPos).replace(/\n*$/, '\n');
    const suffix = markdown.slice(insertPos);
    return `${prefix}\n${references}\n${suffix}`;
}

export function toMarkdown(text: string): string {
    if (!text) return '';
    try {
        const doc = wtf(text) as {
            markdown?: () => string;
            text?: () => string;
            references?: () => ReferenceLike[];
        };
        const baseMarkdown = typeof doc.markdown === 'function' ? doc.markdown() : doc.text?.() ?? text;
        const referencesMarkdown = buildReferencesMarkdown(doc);
        return injectReferences(baseMarkdown, referencesMarkdown);
    } catch {
        return text;
    }
}

export function calculateDiff(
    oldText: string,
    newText: string,
    granularity: DiffGranularity = 'word'
): ExtendedChange[] {
    const cleanOld = toMarkdown(oldText);
    const cleanNew = toMarkdown(newText);

    let diff: ExtendedChange[];
    switch (granularity) {
        case 'sentence':
            diff = diffSentences(cleanOld, cleanNew);
            break;
        case 'line':
            diff = diffLines(cleanOld, cleanNew);
            break;
        default:
            diff = diffWords(cleanOld, cleanNew);
    }

    // Basic move detection logic (placeholder)
    return diff;
}
