
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

export async function fetchRevisionHistory(title: string, limit: number = 20): Promise<Revision[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'revisions',
    titles: title,
    rvprop: 'ids|timestamp|user|comment',
    rvlimit: limit.toString(),
    origin: '*',
  });

  const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
  const data = await response.json();
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];

  if (pageId === '-1') {
    throw new Error('Page not found');
  }

  return pages[pageId].revisions;
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
