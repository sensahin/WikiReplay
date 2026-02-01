import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wikireplay.com'
  
  // Popular Wikipedia articles that users might search for
  const popularArticles = [
    'World_War_II',
    'United_States',
    'Wikipedia',
    'Albert_Einstein',
    'Climate_change',
    'COVID-19_pandemic',
    'Donald_Trump',
    'Elon_Musk',
    'Taylor_Swift',
    'The_Beatles',
    'Moon_landing',
    'Artificial_intelligence',
    'Internet',
    'History_of_the_Internet',
    'World_Wide_Web',
  ]

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...popularArticles.map((article) => ({
      url: `${baseUrl}/${article}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
