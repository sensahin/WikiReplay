This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Implementation Plan - WikiDiff
WikiDiff is a web application that visualizes the evolution of Wikipedia articles through an interactive timeline. It allows users to scrub through revisions and see additions, deletions, and moves animated in real-time.

Proposed Changes
Project Setup
[NEW] Initialize Next.js project with Tailwind CSS.
[NEW] Set up basic layout with a main viewing area and a sidebar.
Data Layer
MediaWiki API Integration:
Fetch revision history for a given article title.
Fetch content (HTML or Wikitext) for specific revisions.
Diffing Engine:
Use a library like diff (jsdiff) or a custom implementation to detect changes.
Implement "move detection" to differentiate between text being relocated vs. deleted and re-added.
Components
TimelineSlider: A custom range input or slider that maps to the list of revisions.
ArticleViewer:
Renders the article content with diff highlighting.
Uses framer-motion or CSS transitions for animations (fade-in, fade-out, slide).
Sidebar: Displays metadata about the current revision (editor, date, comment, size delta).
ArticleSearch: A search bar to find and load Wikipedia articles.
Layout & Aesthetics
Main Layout: Wide viewport for the article, collapsible sidebar.
Visuals: Dark mode support, glassmorphism for UI elements, vibrant highlights for diffs (green for additions, red for deletions, blue for moves).
Verification Plan
Automated Tests
Test API client with known Wikipedia articles.
Unit tests for diffing logic and move detection.
Manual Verification
Test timeline scrubbing with articles of varying lengths and revision counts.
Verify animations feel smooth and "satisfying".
Check responsiveness on mobile and tablet viewports.