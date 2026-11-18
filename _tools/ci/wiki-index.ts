// The wiki index: wiki/index.json in the factorio-blueprints-catalog R2
// bucket, served at https://vault.abucnasty.dev/wiki/index.json. Built by
// build-wiki.ts from the vault's wiki/ folder, read by the link Worker and
// the owner's website. Self-contained (no imports), so the Worker can
// import it without pulling in the core.
//
// R2 keys in factorio-blueprints-catalog:
//   wiki/index.json             this file
//   wiki/<slug>.md              a page's markdown: frontmatter and %% comments removed
//   wiki/files/<published>      an image a page or a draft shows, as published
//                               (PNG, JPEG and WebP converted to WebP; a GIF as
//                               it is, unless it is stored with Git LFS: then it
//                               is served from factorio-blueprints-lfs by its oid)
//   wiki-drafts/index.json      the drafts, in this same shape (their `files`
//                               are the entries of this index they use)
//   wiki-drafts/<slug>.md       a draft's markdown
// Only pages and files in this index are served: objects of a page that left
// it (a draft again, renamed or deleted) stay in the bucket but are not
// reachable.
//
// Drafts are absent from wiki/index.json; their images are listed in it (so
// the link Worker serves them, and they keep working once the draft is
// published). The link Worker never serves anything under wiki-drafts/:
// the site's Worker reads it from R2 for signed-in wiki editors.

export interface WikiIndex {
  /** Bumped on any change a reader must know about. */
  schema: 1;
  /** When the index was built, ISO 8601. */
  generatedAt: string;
  /** The repo commit it was built from (full SHA). */
  commit: string;
  /** Published pages (not drafts), by title ignoring case; in the drafts' index, the drafts. */
  pages: WikiPage[];
  /** Every file a published page or a draft shows or links to, by path; in the drafts' index, the drafts' files. */
  files: WikiFile[];
}

export interface WikiPage {
  /** The file name without ".md"; unique ignoring case. */
  title: string;
  /** Its address on the site: /wiki/<slug> (/wiki for the slug "home"). */
  slug: string;
  /** Its folder under wiki/, "/"-separated; "" at the top. Only for grouping. */
  folder: string;
  /** Former titles (frontmatter `aliases`): /wiki/<slug of an alias> redirects here. */
  aliases: string[];
  /** In page order; `id` is the element id the site gives the heading. */
  headings: { depth: number; text: string; id: string }[];
  /** Plain text from the start of the page, at most 200 characters, for search and link previews. */
  excerpt: string;
  /** Slugs of the published pages it links to (itself excluded), sorted; a draft's may name other drafts. */
  links: string[];
  /** Paths (as in `files`) of the files it shows or links to, sorted. */
  files: string[];
  /** Git blob id of the page's file. */
  blob: string;
  /**
   * Present (true) when the page's current file is invalid: this is the
   * last entry published, carried over unchanged, until it is fixed.
   */
  stale?: true;
}

export interface WikiFile {
  /** Its vault path relative to wiki/, e.g. "Guides/_attachments/logo.png": what links resolve against. */
  path: string;
  /** Where it is served, under /wiki/files/: `path`, with ".webp" for a converted image. */
  published: string;
  /** Content-Type it is served with. */
  type: string;
  /** Bytes served. */
  size: number;
  /** Bytes in the vault (of the LFS object, for an LFS file). */
  sourceSize: number;
  /** Git blob id of the vault file (of its LFS pointer, for an LFS file). */
  blob: string;
  /** Content version (SHA-256 prefix of what is served): readers add ?v=<v> to cache it for good. */
  v: string;
  /** How it was converted, e.g. "webp-1600-q85"; absent when served as it is. */
  convert?: string;
  /** Git LFS object id when served from factorio-blueprints-lfs as it is (a GIF stored with LFS). */
  oid?: string;
}

/** The content types the wiki serves files with. */
export const WIKI_FILE_TYPES: Record<string, string> = {
  gif: "image/gif",
  webp: "image/webp",
};

export function wikiFileType(path: string): string {
  const dot = path.lastIndexOf(".");
  return (dot === -1 ? undefined : WIKI_FILE_TYPES[path.slice(dot + 1).toLowerCase()]) ?? "application/octet-stream";
}
