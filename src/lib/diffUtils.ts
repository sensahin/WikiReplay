import { diffWords, diffSentences, diffLines, Change } from 'diff';
import wtf from 'wtf_wikipedia';
import wtfMarkdown from 'wtf-plugin-markdown';

export type DiffGranularity = 'word' | 'sentence' | 'line';

export interface ExtendedChange extends Change {
    moved?: boolean;
    moveId?: string;
}

export type ContentFilters = {
    showReferences: boolean;
    showTemplates: boolean;
    showImages: boolean;
};

export type DiffOptions = {
    granularity?: DiffGranularity;
    contentFilters?: Partial<ContentFilters>;
};

wtf.extend(wtfMarkdown);

type ReferenceLike = {
    markdown?: () => string;
};

const defaultContentFilters: ContentFilters = {
    showReferences: true,
    showTemplates: true,
    showImages: true,
};

function stripTemplates(text: string): string {
    if (!text) return text;
    let output = '';
    let depth = 0;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '{' && next === '{') {
            depth += 1;
            i += 1;
            continue;
        }
        if (char === '}' && next === '}') {
            if (depth > 0) depth -= 1;
            i += 1;
            continue;
        }
        if (depth === 0) {
            output += char;
        }
    }

    return output;
}

function stripCategories(text: string): string {
    if (!text) return text;
    return text.replace(/\[\[\s*Category:[^\]]+\]\]\s*/gi, '');
}

function preprocessWikitext(text: string, filters: ContentFilters): string {
    let output = text;
    if (!filters.showTemplates) {
        output = stripTemplates(output);
        output = stripCategories(output);
    }
    return output.replace(/\n{3,}/g, '\n\n');
}

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

function removeReferencesSection(markdown: string): string {
    const headingRegex = /^(#{2,6})\s+References\s*$/im;
    const match = headingRegex.exec(markdown);
    if (!match) return markdown;

    const headingStart = match.index;
    const headingLineEnd = markdown.indexOf('\n', headingStart);
    const afterHeading = headingLineEnd === -1 ? '' : markdown.slice(headingLineEnd + 1);
    const nextHeading = afterHeading.match(/^\s*#{1,6}\s+/m);
    const sectionEnd = nextHeading
        ? (headingLineEnd === -1 ? markdown.length : headingLineEnd + 1 + (nextHeading.index ?? 0))
        : markdown.length;

    const before = markdown.slice(0, headingStart).replace(/\n{2,}$/g, '\n\n');
    const after = markdown.slice(sectionEnd);
    return `${before}${after}`.trimEnd();
}

function stripInlineReferences(markdown: string): string {
    if (!markdown) return markdown;
    return markdown.replace(/\s*⌃\s*(\[[^\]]*\]\([^)]+\)|\[[^\]]*]|[^\s]+)/g, '');
}

function normalizeMarkdownSpacing(markdown: string): string {
    return markdown.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

function refineSentenceDiff(diff: ExtendedChange[]): ExtendedChange[] {
    const refined: ExtendedChange[] = [];

    for (let i = 0; i < diff.length; i += 1) {
        const current = diff[i];
        const next = diff[i + 1];

        if (current.removed && next?.added) {
            if (current.value === next.value) {
                refined.push({ value: current.value, added: false, removed: false, count: current.value.length });
                i += 1;
                continue;
            }
            refined.push(...diffWords(current.value, next.value));
            i += 1;
            continue;
        }

        if (current.added && next?.removed) {
            if (current.value === next.value) {
                refined.push({ value: current.value, added: false, removed: false, count: current.value.length });
                i += 1;
                continue;
            }
            refined.push(...diffWords(next.value, current.value));
            i += 1;
            continue;
        }

        refined.push(current);
    }

    return refined;
}

export function toMarkdown(text: string, contentFilters: Partial<ContentFilters> = {}): string {
    if (!text) return '';
    const filters = { ...defaultContentFilters, ...contentFilters };
    const preprocessed = preprocessWikitext(text, filters);

    try {
        const doc = wtf(preprocessed) as {
            markdown?: (options?: Record<string, unknown>) => string;
            text?: () => string;
            references?: () => ReferenceLike[];
        };
        let baseMarkdown = typeof doc.markdown === 'function'
            ? doc.markdown({
                infoboxes: false, // We render infoboxes separately
                templates: filters.showTemplates,
                images: filters.showImages,
            })
            : doc.text?.() ?? preprocessed;

        if (!filters.showReferences) {
            baseMarkdown = stripInlineReferences(baseMarkdown);
            return normalizeMarkdownSpacing(removeReferencesSection(baseMarkdown));
        }

        const referencesMarkdown = buildReferencesMarkdown(doc);
        return normalizeMarkdownSpacing(injectReferences(baseMarkdown, referencesMarkdown));
    } catch {
        return normalizeMarkdownSpacing(preprocessed);
    }
}

export interface InfoboxData {
    type: string;
    data: Record<string, { text?: string; number?: number; links?: Array<{ text: string; page?: string }> }>;
}

interface WtfInfobox {
    type?: () => string;
    json?: () => Record<string, { text?: string; number?: number; links?: Array<{ text: string; page?: string }> }>;
}

export function extractInfoboxes(text: string): InfoboxData[] {
    if (!text) return [];
    
    try {
        const doc = wtf(text) as {
            infoboxes?: () => WtfInfobox[];
        };
        
        const infoboxes = doc.infoboxes?.() ?? [];
        
        return infoboxes.map((infobox) => ({
            type: infobox.type?.() ?? 'infobox',
            data: infobox.json?.() ?? {},
        }));
    } catch {
        return [];
    }
}

export function calculateDiff(
    oldText: string,
    newText: string,
    options: DiffOptions | DiffGranularity = 'word'
): ExtendedChange[] {
    const resolvedOptions: DiffOptions = typeof options === 'string' ? { granularity: options } : options ?? {};
    const granularity = resolvedOptions.granularity ?? 'word';
    const contentFilters = { ...defaultContentFilters, ...(resolvedOptions.contentFilters ?? {}) };

    const cleanOld = toMarkdown(oldText, contentFilters);
    const cleanNew = toMarkdown(newText, contentFilters);

    let diff: ExtendedChange[];
    switch (granularity) {
        case 'sentence':
            diff = refineSentenceDiff(diffSentences(cleanOld, cleanNew));
            break;
        case 'line':
            diff = diffLines(cleanOld, cleanNew);
            break;
        default:
            diff = diffWords(cleanOld, cleanNew);
    }

    return diff;
}
