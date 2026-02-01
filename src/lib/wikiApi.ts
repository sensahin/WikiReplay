
export interface Revision {
  revid: number;
  parentid: number;
  user: string;
  timestamp: string;
  comment: string;
  content?: string;
  tags?: string[];
  minor?: boolean;
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
      rvprop: 'ids|timestamp|user|comment|tags|flags',
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

// IP Geolocation types and functions
export interface GeoLocation {
  country: string;
  countryCode: string;
  city: string;
  region: string;
  isp: string;
}

// Check if a string is an IP address (anonymous Wikipedia editor)
export function isIPAddress(user: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
  
  return ipv4Pattern.test(user) || ipv6Pattern.test(user);
}

// Fetch geolocation for an IP address
export async function fetchIPGeolocation(ip: string): Promise<GeoLocation | null> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        region: data.regionName,
        isp: data.isp,
      };
    }
    return null;
  } catch {
    return null;
  }
}
