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
  showImages: boolean;
  highlightClasses: HighlightClasses;
  onArticleClick?: (articleTitle: string) => void;
}

// Helper to recursively check if children contain an image element
const containsImage = (children: React.ReactNode): boolean => {
  const childArray = React.Children.toArray(children);
  for (const child of childArray) {
    if (React.isValidElement(child)) {
      // Check if this element is an img
      if (child.type === 'img') return true;
      // Check if it's a custom component that renders img (by checking props.src)
      const props = child.props as Record<string, unknown>;
      if (props && typeof props === 'object' && 'src' in props && 'alt' in props) return true;
      // Recursively check children (for ins, del, span wrappers etc.)
      if (props && typeof props === 'object' && 'children' in props) {
        if (containsImage(props.children as React.ReactNode)) return true;
      }
    }
  }
  return false;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown, showLinks, showImages, highlightClasses, onArticleClick }) => {
  const sanitizeSchema = useMemo(() => {
    const baseTags = defaultSchema.tagNames ?? [];
    return {
      ...defaultSchema,
      tagNames: [...baseTags, 'ins', 'del', 'figure', 'figcaption'],
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
        strong: (props) => (
          <strong
            {...props}
            className="text-current font-semibold"
          />
        ),
        em: (props) => (
          <em
            {...props}
            className="text-current"
          />
        ),
        // Custom paragraph that unwraps images to avoid nesting block elements in <p>
        p: ({ children, ...props }) => {
          // If paragraph contains an image (even nested in ins/del), render as div to avoid hydration error
          if (showImages && containsImage(children)) {
            return <div {...props}>{children}</div>;
          }
          return <p {...props}>{children}</p>;
        },
        img: (props) =>
          showImages ? (
            <figure className="float-right clear-right ml-4 mb-3 w-[250px] max-w-[40%] bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden not-prose">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...props}
                alt={props.alt ?? ''}
                className="w-full h-auto"
              />
              {props.alt && (
                <figcaption className="px-2 py-1.5 text-[11px] text-white/50 leading-snug">
                  {props.alt}
                </figcaption>
              )}
            </figure>
          ) : null,
        a: (props) => {
          if (!showLinks) {
            return <span>{props.children}</span>;
          }
          
          const href = props.href || '';
          // Check if this is an internal Wikipedia link (e.g., /wiki/Article_Name or ./Article_Name)
          const wikiLinkMatch = href.match(/^(?:\.\/|\/wiki\/)(.+)$/);
          
          if (wikiLinkMatch && onArticleClick) {
            const articleTitle = decodeURIComponent(wikiLinkMatch[1].replace(/_/g, ' '));
            return (
              <a
                {...props}
                href={`/${encodeURIComponent(articleTitle)}`}
                className="text-blue-300 hover:text-blue-200 underline underline-offset-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  onArticleClick(articleTitle);
                }}
              />
            );
          }
          
          // External link - open in new tab
          return (
            <a
              {...props}
              className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            />
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
export const preloadMarkdownRenderer = () => import('./MarkdownRenderer');
