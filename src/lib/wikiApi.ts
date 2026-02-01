
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

export async function fetchRandomArticle(): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'random',
    rnnamespace: '0', // Main namespace (articles only)
    rnlimit: '1',
    origin: '*',
  });

  const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
  const data = await response.json();
  return data.query.random[0].title;
}

export interface RevisionProgress {
  loaded: number;
  total: number | null; // null if unknown
  batch?: Revision[];
  done?: boolean;
}

export async function fetchRevisionHistory(
  title: string,
  limit: number = 500,
  fetchAll: boolean = true,
  onProgress?: (progress: RevisionProgress) => void
): Promise<Revision[]> {
  const allRevisions: Revision[] = [];
  let continueToken: string | undefined = undefined;
  let totalRevisions: number | null = null;

  if (!fetchAll) {
    totalRevisions = limit;
  }
  
  // First, fetch the total revision count if we need all revisions
  if (fetchAll && onProgress) {
    try {
      // Use the page info to get revision count (this is an approximation)
      const infoParams = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: title,
        prop: 'info',
        origin: '*',
      });
      
      const infoResponse = await fetch(`${WIKI_API_URL}?${infoParams.toString()}`);
      const infoData = await infoResponse.json();
      const pages = infoData.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId !== '-1' && pages[pageId].length !== undefined) {
          // Note: 'length' is article length in bytes, not revision count
          // Wikipedia doesn't provide revision count directly, so we'll show just loaded count
        }
      }
    } catch {
      // Ignore errors in counting, proceed with fetching
    }
  }
  
  do {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'revisions',
      titles: title,
      rvprop: 'ids|timestamp|user|comment|tags|flags',
      rvdir: 'newer',
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

    // Report progress
    if (onProgress) {
      onProgress({ loaded: allRevisions.length, total: totalRevisions, batch: revisions, done: false });
    }

    // Check if there are more revisions to fetch
    continueToken = data.continue?.rvcontinue;
    
    // If we've reached the requested limit or don't want all, stop
    if (!fetchAll || allRevisions.length >= limit) {
      break;
    }
  } while (continueToken);

  const finalRevisions = allRevisions.slice(0, limit);
  if (onProgress) {
    const total = totalRevisions ?? finalRevisions.length;
    onProgress({ loaded: finalRevisions.length, total, done: true });
  }
  return finalRevisions;
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

export async function fetchRevisionExternalLinks(revid: number): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'parse',
    format: 'json',
    oldid: revid.toString(),
    prop: 'externallinks',
    origin: '*',
  });

  try {
    const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
    const data = await response.json();
    const links = data?.parse?.externallinks;
    return Array.isArray(links) ? links : [];
  } catch {
    return [];
  }
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

// User information types and functions
export interface UserInfo {
  name: string;
  editcount: number;
  registration: string | null;
  groups: string[];
  gender: 'male' | 'female' | 'unknown';
  blocked: boolean;
  blockReason?: string;
  blockExpiry?: string;
}

// Fetch information about a Wikipedia user
export async function fetchUserInfo(username: string): Promise<UserInfo | null> {
  if (!username || isIPAddress(username)) return null;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'users',
    ususers: username,
    usprop: 'editcount|registration|groups|gender|blockinfo',
    origin: '*',
  });

  try {
    const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
    const data = await response.json();

    const users = data.query?.users;
    if (!users || users.length === 0) return null;

    const user = users[0];
    
    // Check if user exists (missing property indicates non-existent user)
    if (user.missing !== undefined) return null;

    return {
      name: user.name,
      editcount: user.editcount ?? 0,
      registration: user.registration ?? null,
      groups: (user.groups ?? []).filter((g: string) => !['*', 'user', 'autoconfirmed'].includes(g)),
      gender: user.gender ?? 'unknown',
      blocked: user.blockid !== undefined,
      blockReason: user.blockreason,
      blockExpiry: user.blockexpiry,
    };
  } catch {
    return null;
  }
}
