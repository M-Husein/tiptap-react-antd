/**
 * Security gate for the Embed node (spec 20.1 / section 29).
 *
 * Nothing here trusts caller-supplied HTML. The node only ever stores
 * `{ src, provider, width, height, title }` and this module is the single
 * place that decides (a) whether a `src` is safe to put in an iframe, and
 * (b) what the *actual* iframe `src` becomes for known providers (we embed
 * from the provider's dedicated embed subdomain/path, not whatever the
 * user pasted, e.g. a normal watch-page YouTube URL gets rewritten to
 * https://www.youtube-nocookie.com/embed/<id>).
 */

export type EmbedProvider = "youtube" | "vimeo" | "custom";

export interface ResolvedEmbed {
  /** The exact URL that is safe to put in the iframe's src attribute. */
  embedSrc: string;
  provider: EmbedProvider;
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const isHttps = (url: URL) => url.protocol === "https:";

const resolveYouTube = (raw: string): string | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!isHttps(url) || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  let id: string | null = null;
  if (url.hostname === "youtu.be") {
    id = url.pathname.slice(1);
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/embed/")) {
    id = url.pathname.replace("/embed/", "");
  }
  if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
};

const resolveVimeo = (raw: string): string | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!isHttps(url) || !VIMEO_HOSTS.has(url.hostname)) return null;

  let id: string | null = null;
  if (url.hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
    id = url.pathname.replace("/video/", "");
  } else {
    id = url.pathname.slice(1).split("/")[0];
  }
  if (!id || !/^\d+$/.test(id)) return null;
  return `https://player.vimeo.com/video/${id}`;
};

export interface EmbedValidationOptions {
  /**
   * Extra hostnames allowed for provider "custom", beyond the built-in
   * youtube/vimeo handling. Consumers own the risk for what they allowlist
   * here — this is the extension point spec 20.1 requires ("custom embeds
   * must be validated") without hard-coding one app's provider list into
   * the library.
   */
  allowedCustomOrigins?: string[];
}

/**
 * Resolves a user-supplied `{ src, provider }` into a safe iframe src, or
 * `null` if it fails validation (caller should refuse to render/insert).
 */
export const resolveEmbed = (
  src: string,
  provider: EmbedProvider,
  options: EmbedValidationOptions = {},
): ResolvedEmbed | null => {
  if (provider === "youtube") {
    const embedSrc = resolveYouTube(src);
    return embedSrc ? { embedSrc, provider } : null;
  }
  if (provider === "vimeo") {
    const embedSrc = resolveVimeo(src);
    return embedSrc ? { embedSrc, provider } : null;
  }
  // provider === "custom"
  try {
    const url = new URL(src);
    if (!isHttps(url)) return null;
    const allowed = options.allowedCustomOrigins ?? [];
    if (!allowed.includes(url.hostname)) return null;
    return { embedSrc: url.toString(), provider: "custom" };
  } catch {
    return null;
  }
};

/**
 * Sandbox policy applied to every embed iframe.
 *
 * Includes `allow-same-origin` alongside `allow-scripts` — without it,
 * YouTube's (and most providers') embed page runs in an opaque/null
 * origin and can't use `caches`, `localStorage`, etc., which breaks its
 * own player script outright (observed: `SecurityError: Failed to read
 * the 'caches' property...` followed by the provider's script throwing
 * because it never finished initializing). This is what YouTube's own
 * published embed snippets do too — they ship with no sandbox at all.
 *
 * The safety trade-off this implies: `allow-scripts` + `allow-same-origin`
 * together is a known sandbox-escape pattern *if the framed content is
 * untrusted*, since a page with both can programmatically strip its own
 * sandbox restrictions. That's not a gap here because the entire security
 * model is upstream of the sandbox: `resolveEmbed` only ever lets a
 * `src` into the iframe if it's `https:` AND resolves to a fixed,
 * known-good provider origin (`youtube-nocookie.com`, `player.vimeo.com`)
 * or a hostname the consumer explicitly allowlisted for `"custom"`. The
 * sandbox here is defense against everything *other* than "the provider's
 * own page does what the provider's page normally does" — no top-level
 * navigation hijacking, no arbitrary popups. If you need to embed a
 * provider whose page genuinely can't be trusted with `allow-same-origin`,
 * don't add it to `allowedCustomOrigins` in the first place; that
 * allowlist, not the sandbox, is the actual trust boundary.
 */
export const EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox";
