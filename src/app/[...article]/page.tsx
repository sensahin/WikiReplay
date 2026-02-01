import type { Metadata } from 'next';
import Home from '../page';

type Props = {
  params: Promise<{ article: string[] }>;
};

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { article } = await params;
  const articleTitle = article ? decodeURIComponent(article.join('/').replace(/_/g, ' ')) : 'Wikipedia';
  
  return {
    title: `${articleTitle} - Edit History | WikiReplay`,
    description: `Watch the complete edit history of "${articleTitle}" on Wikipedia. See how this article evolved from its first edit to today with WikiReplay.`,
    openGraph: {
      title: `${articleTitle} - Edit History | WikiReplay`,
      description: `Visualize how "${articleTitle}" evolved on Wikipedia through its complete edit history.`,
      type: 'website',
      siteName: 'WikiReplay',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${articleTitle} - Edit History | WikiReplay`,
      description: `Watch the complete edit history of "${articleTitle}" on Wikipedia.`,
    },
    alternates: {
      canonical: `/${encodeURIComponent(articleTitle.replace(/ /g, '_'))}`,
    },
  };
}

// This catch-all route renders the same Home component
// The Home component reads the article from the URL pathname
export default function ArticlePage() {
  return <Home />;
}
