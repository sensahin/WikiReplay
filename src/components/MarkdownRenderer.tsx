'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

type HighlightClasses = {
  ins: string;
  del: string;
};

interface MarkdownRendererProps {
  markdown: string;
  showLinks: boolean;
  highlightClasses: HighlightClasses;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown, showLinks, highlightClasses }) => {
  const sanitizeSchema = useMemo(() => {
    const baseTags = defaultSchema.tagNames ?? [];
    return {
      ...defaultSchema,
      tagNames: [...baseTags, 'ins', 'del'],
    };
  }, []);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      components={{
        ins: (props) => (
          <ins
            {...props}
            className={highlightClasses.ins}
          />
        ),
        del: (props) => (
          <del
            {...props}
            className={highlightClasses.del}
          />
        ),
        a: (props) =>
          showLinks ? (
            <a
              {...props}
              className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            />
          ) : (
            <span>{props.children}</span>
          ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
export const preloadMarkdownRenderer = () => import('./MarkdownRenderer');
