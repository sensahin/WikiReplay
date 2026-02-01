
export interface Revision {
  revid: number;
  parentid: number;
  user: string;
  timestamp: string;
  comment: string;
  content?: string;
}

export interface WikiPageInfo {
  pageid: number;
  title: string;
  revisions: Revision[];
}

const WIKI_API_URL = 'https://en.wikipedia.org/w/api.php';

export async function fetchRevisionHistory(title: string, limit: number = 500, fetchAll: boolean = true): Promise<Revision[]> {
  const allRevisions: Revision[] = [];
  let continueToken: string | undefined = undefined;
  
  do {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'revisions',
      titles: title,
      rvprop: 'ids|timestamp|user|comment',
      rvlimit: Math.min(limit, 500).toString(), // Wikipedia max is 500 per request
      origin: '*',
    });

    if (continueToken) {
      params.append('rvcontinue', continueToken);
    }

    const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1') {
      throw new Error('Page not found');
    }

    const revisions = pages[pageId].revisions || [];
    allRevisions.push(...revisions);

    // Check if there are more revisions to fetch
    continueToken = data.continue?.rvcontinue;
    
    // If we've reached the requested limit or don't want all, stop
    if (!fetchAll || allRevisions.length >= limit) {
      break;
    }
  } while (continueToken);

  return allRevisions.slice(0, limit);
}

export async function fetchRevisionContent(revid: number): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'revisions',
    revids: revid.toString(),
    rvprop: 'content',
    rvslots: 'main',
    origin: '*',
  });

  const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
  const data = await response.json();
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  const revision = pages[pageId].revisions[0];

  // Return wikitext as before, but we can also use action=parse for HTML
  return revision.slots.main['*'];
}

export async function fetchRevisionHtml(revid: number): Promise<string> {
  const params = new URLSearchParams({
    action: 'parse',
    format: 'json',
    oldid: revid.toString(),
    prop: 'text',
    disableeditsection: 'true',
    disabletoc: 'true',
    origin: '*',
  });

  const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
  const data = await response.json();
  return data.parse.text['*'];
}

export interface SearchSuggestion {
  title: string;
  description: string;
  thumbnail?: string;
}

export async function fetchSearchSuggestions(query: string, limit: number = 8): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'prefixsearch',
    gpssearch: query,
    gpslimit: limit.toString(),
    prop: 'pageprops|pageimages|description',
    ppprop: 'displaytitle',
    piprop: 'thumbnail',
    pithumbsize: '60',
    pilimit: limit.toString(),
    redirects: '',
    origin: '*',
  });

  try {
    const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
    const data = await response.json();

    if (!data.query?.pages) return [];

    const pages = Object.values(data.query.pages) as Array<{
      title: string;
      description?: string;
      thumbnail?: { source: string };
      index: number;
    }>;

    // Sort by index (search relevance)
    return pages
      .sort((a, b) => a.index - b.index)
      .map((page) => ({
        title: page.title,
        description: page.description || '',
        thumbnail: page.thumbnail?.source,
      }));
  } catch {
    return [];
  }
}
