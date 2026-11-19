// Wiki pages, per _tools/docs/conventions.md ("Wiki"): every markdown file
// under wiki/ is a page, except inside folders named _attachments and
// anything whose name starts with ".". A page's title is its file name
// without ".md" (unique across the wiki, ignoring case), and its address on
// the site is /wiki/<slug>. Folders only organise the vault. Links between
// pages and to images follow Obsidian: by file name, anywhere in wiki/.
//
// Shared by CI (_tools/ci/build-wiki.ts) and, later, the plugin. The site
// (abucnasty.dev, src/wikiCore.ts) repeats the addressing and resolution
// rules below; keep the two in step.

import { FrontmatterError, readFrontmatter, splitFrontmatter } from "./frontmatter.ts";

/** The vault folder that holds the wiki. */
export const WIKI_ROOT = "wiki";
/** Folders with this name hold a page's images (Obsidian's attachment folder); never pages. */
export const WIKI_ATTACHMENTS = "_attachments";
/** The front page, wiki/Home.md, shown at /wiki. */
export const WIKI_HOME_TITLE = "Home";
/** Slugs the site uses for its own wiki pages (/wiki/all lists every page; /wiki/deleted, recently deleted ones). */
export const WIKI_RESERVED_SLUGS: readonly string[] = ["all", "deleted"];

/** True for a path under wiki/ with no segment starting with "." (wiki/ itself excluded). */
export function isWikiPath(path: string): boolean {
  const segs = path.split("/");
  return segs.length > 1 && segs[0] === WIKI_ROOT && segs.every((s) => s !== "" && !s.startsWith("."));
}

/** A wiki page: a .md file under wiki/, not inside an _attachments folder. */
export function isWikiPagePath(path: string): boolean {
  if (!isWikiPath(path) || !path.endsWith(".md")) return false;
  return !path.split("/").slice(1, -1).includes(WIKI_ATTACHMENTS);
}

/** The part of a wiki path after "wiki/". */
export function wikiRelative(path: string): string {
  return path.startsWith(WIKI_ROOT + "/") ? path.slice(WIKI_ROOT.length + 1) : path;
}

/** A page's title: its file name without ".md" (Unicode NFC). */
export function wikiTitle(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return (name.endsWith(".md") ? name.slice(0, -3) : name).normalize("NFC");
}

/** The folder of a wiki path relative to wiki/: "" for a page at the top. */
export function wikiFolder(path: string): string {
  const rel = wikiRelative(path);
  const slash = rel.lastIndexOf("/");
  return slash === -1 ? "" : rel.slice(0, slash);
}

/** A title's address: lowercased, every run of other than letters and digits one "-", trimmed. */
export function wikiSlug(title: string): string {
  return title
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Title comparison key: titles are unique ignoring case. */
export function titleKey(title: string): string {
  return title.normalize("NFC").toLowerCase();
}

export interface WikiPageRead {
  /** `draft: true` keeps the page off the site. */
  draft: boolean;
  /** Former titles (Obsidian's `aliases`), as written. */
  aliases: string[];
  /** The markdown after the frontmatter, leading blank lines removed. */
  body: string;
  /** What is wrong, one sentence each. */
  problems: string[];
}

/** Read a page's frontmatter: only `draft` and `aliases` mean something; everything else is ignored. */
export function readWikiPage(text: string): WikiPageRead {
  const body = splitFrontmatter(text).body.replace(/^(?:[ \t]*\r?\n)+/, "");
  let fm: Record<string, unknown>;
  try {
    fm = readFrontmatter(text);
  } catch (e) {
    if (!(e instanceof FrontmatterError)) throw e;
    return { draft: false, aliases: [], body, problems: [e.message] };
  }
  const problems: string[] = [];
  const rawDraft = fm["draft"];
  if (rawDraft != null && typeof rawDraft !== "boolean") problems.push("draft must be true or false");
  const rawAliases = fm["aliases"];
  let aliases: string[] = [];
  if (typeof rawAliases === "string") aliases = [rawAliases];
  else if (Array.isArray(rawAliases)) aliases = rawAliases.filter((a): a is string => typeof a === "string");
  if (rawAliases != null && (aliases.length !== (Array.isArray(rawAliases) ? rawAliases.length : 1))) {
    problems.push("aliases must be a list of former titles, e.g. aliases: [Old Title]");
  }
  aliases = [...new Set(aliases.map((a) => a.trim().normalize("NFC")).filter((a) => a !== ""))];
  return { draft: rawDraft === true, aliases, body, problems };
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Split markdown into lines, marking those inside fenced code blocks (the
 * fence lines included). Comments and links are only looked for outside.
 */
function fencedLines(markdown: string): { text: string; code: boolean }[] {
  const out: { text: string; code: boolean }[] = [];
  let fence: string | undefined;
  for (const text of markdown.split("\n")) {
    const m = FENCE.exec(text);
    if (fence === undefined) {
      if (m && !(m[1]![0] === "`" && text.slice(m[0].length).includes("`"))) fence = m[1]!;
      out.push({ text, code: fence !== undefined });
    } else {
      out.push({ text, code: true });
      if (m && m[1]![0] === fence[0] && m[1]!.length >= fence.length && text.slice(m[0].length).trim() === "") fence = undefined;
    }
  }
  return out;
}

/**
 * Remove Obsidian comments (`%%...%%`, inline or over several lines)
 * outside fenced code and inline code. An unclosed `%%` hides the rest of
 * the page, as in Obsidian.
 */
export function stripWikiComments(markdown: string): string {
  let open = false;
  const out: string[] = [];
  for (const { text, code } of fencedLines(markdown)) {
    if (code && !open) {
      out.push(text);
      continue;
    }
    let kept = "";
    let i = 0;
    while (i < text.length) {
      if (!open && text[i] === "`") {
        const run = /^`+/.exec(text.slice(i))![0];
        const end = text.indexOf(run, i + run.length);
        if (end !== -1) {
          kept += text.slice(i, end + run.length);
          i = end + run.length;
          continue;
        }
        kept += run;
        i += run.length;
        continue;
      }
      if (text.startsWith("%%", i)) {
        open = !open;
        i += 2;
        continue;
      }
      if (!open) kept += text[i];
      i++;
    }
    // A line that held only a comment goes away entirely.
    if (kept.trim() === "" && text.trim() !== "") continue;
    out.push(kept);
  }
  return out.join("\n");
}

/**
 * A heading's id as the site gives it (rehype-slug, i.e. github-slugger):
 * lowercased, characters other than letters, marks, digits, "_", "-" and
 * spaces removed, spaces turned into "-". Not made unique.
 */
export function headingId(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{Nd}\p{Nl}\p{Pc} -]/gu, "").replace(/ /g, "-");
}

/** Unique heading ids in page order, as github-slugger makes them ("a", "a-1", ...). */
export class HeadingIds {
  private seen = new Map<string, number>();
  next(text: string): string {
    const base = headingId(text);
    let id = base;
    while (this.seen.has(id)) {
      const n = this.seen.get(base)! + 1;
      this.seen.set(base, n);
      id = `${base}-${n}`;
    }
    this.seen.set(id, 0);
    return id;
  }
}

/** The parts of the inside of `[[...]]`: page (may be empty: this page), heading, label. */
export function parseWikiLink(inner: string): { page: string; heading?: string; label?: string } {
  const bar = inner.indexOf("|");
  const target = (bar === -1 ? inner : inner.slice(0, bar)).trim();
  const label = bar === -1 ? undefined : inner.slice(bar + 1).trim();
  const hash = target.indexOf("#");
  const page = (hash === -1 ? target : target.slice(0, hash)).trim();
  const heading = hash === -1 ? undefined : target.slice(hash + 1).replace(/^#+/, "").trim();
  return { page, ...(heading ? { heading } : {}), ...(label ? { label } : {}) };
}

/** The page title a link target names: its last path segment, without ".md". */
export function linkTitle(target: string): string {
  const name = target.slice(target.lastIndexOf("/") + 1);
  return (name.toLowerCase().endsWith(".md") ? name.slice(0, -3) : name).normalize("NFC");
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** A markdown link destination that stays in the vault (no scheme, not `//...`, not `/...`), decoded. */
export function vaultTarget(url: string): string | undefined {
  let u = url.trim();
  if (u.startsWith("<") && u.endsWith(">")) u = u.slice(1, -1);
  if (u === "" || u.startsWith("#") || u.startsWith("/") || SCHEME.test(u)) return undefined;
  try {
    return decodeURIComponent(u);
  } catch {
    return u;
  }
}

/** Split "path#heading" (a decoded markdown link destination). */
export function splitHash(target: string): { path: string; heading?: string } {
  const hash = target.indexOf("#");
  if (hash === -1) return { path: target };
  const heading = target.slice(hash + 1).trim();
  return { path: target.slice(0, hash), ...(heading ? { heading } : {}) };
}

function normalizePath(parts: string[]): string | undefined {
  const out: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") {
      if (out.length === 0) return undefined;
      out.pop();
    } else out.push(p);
  }
  return out.join("/");
}

/**
 * The file (a path relative to wiki/, from `files`) an image or file link
 * on a page in `fromFolder` means, Obsidian style: a path relative to the
 * page, or to the vault; else by file name, preferring the page's own
 * _attachments folder, then its folder, then the shortest path anywhere in
 * wiki/. Undefined when nothing matches.
 */
export function resolveWikiFile(target: string, fromFolder: string, files: readonly string[]): string | undefined {
  const t = target.normalize("NFC").replace(/^\.\//, "");
  if (t === "") return undefined;
  const have = new Set(files);
  if (t.includes("/")) {
    const rel = normalizePath([...fromFolder.split("/"), ...t.split("/")]);
    if (rel !== undefined && have.has(rel)) return rel;
    const fromRoot = normalizePath(t.split("/"));
    if (fromRoot !== undefined) {
      if (have.has(fromRoot)) return fromRoot;
      if (fromRoot.startsWith(WIKI_ROOT + "/") && have.has(fromRoot.slice(WIKI_ROOT.length + 1))) return fromRoot.slice(WIKI_ROOT.length + 1);
    }
  }
  const name = t.slice(t.lastIndexOf("/") + 1);
  const join = (folder: string, n: string) => (folder === "" ? n : `${folder}/${n}`);
  for (const p of [join(join(fromFolder, WIKI_ATTACHMENTS), name), join(fromFolder, name)]) if (have.has(p)) return p;
  const byName = files.filter((f) => f.slice(f.lastIndexOf("/") + 1) === name);
  byName.sort((a, b) => a.split("/").length - b.split("/").length || (a < b ? -1 : a > b ? 1 : 0));
  return byName[0];
}

/** Markdown inline syntax reduced to the text a reader sees (approximately, for headings and excerpts). */
export function plainInline(text: string): string {
  return text
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/\[\[([^\]]*)\]\]/g, (_, inner: string) => {
      const l = parseWikiLink(inner);
      return l.label ?? (l.page && l.heading ? `${linkTitle(l.page)} > ${l.heading}` : l.page ? linkTitle(l.page) : (l.heading ?? ""));
    })
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<((?:https?|mailto):[^>\s]+)>/g, "$1")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/`+([^`]*)`+/g, "$1")
    .replace(/(\*\*|__|~~)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/(^|[^\p{L}\p{N}*])\*(?=\S)([^*]*?\S)\*/gu, "$1$2")
    .replace(/(^|[^\p{L}\p{N}_])_(?=\S)([^_]*?\S)_(?![\p{L}\p{N}])/gu, "$1$2")
    .replace(/\\([!-/:-@[-`{-~])/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export interface WikiHeading {
  depth: number;
  /** As the reader sees it. */
  text: string;
  /** The element id on the page, so `/wiki/<slug>#<id>` scrolls to it. */
  id: string;
}

export interface WikiScan {
  headings: WikiHeading[];
  /** Page link targets, in order: titles from [[...]] (not embeds) and from relative links to .md files. */
  pages: string[];
  /** File targets, in order: ![[...]] embeds that are not pages, ![...](...) images, and relative links to other files. */
  files: string[];
  /** Up to EXCERPT_MAX characters of the first paragraph, as plain text. */
  excerpt: string;
}

export const EXCERPT_MAX = 200;
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const BLOCK_START = /^ {0,3}(?:[-+*][ \t]|\d+[.)][ \t]|>|\||#|<|[-*_](?:[ \t]*[-*_]){2,}[ \t]*$|!\[\[|\$\$)/;
const MD_LINK = /(!?)\[((?:[^\[\]]|\[[^\]]*\])*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const WIKI_LINK = /(!?)\[\[([^\]\n]+)\]\]/g;
const ONLY_URL = /^<?https?:\/\/\S+>?$/;
/** Image types an `![[name]]` embed shows; any other embed is a page embed. */
const IMAGE_EMBED = /\.(png|jpe?g|webp|gif|avif|svg|bmp)$/i;

/** True when an `![[...]]` target names an image rather than a page. */
export function isImageEmbed(target: string): boolean {
  return IMAGE_EMBED.test(target);
}

/** Cut text at a word to at most `max` characters, with an ellipsis when cut. */
export function clipText(text: string, max = EXCERPT_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/**
 * Headings, links and an excerpt of a page body (frontmatter removed). A
 * line scanner, not a full markdown parser: fenced code is skipped, inline
 * code ignored, and headings are ATX (`## x`) or setext (underlined).
 */
export function scanWikiMarkdown(markdown: string): WikiScan {
  const headings: WikiHeading[] = [];
  const pages: string[] = [];
  const files: string[] = [];
  const ids = new HeadingIds();
  let excerpt = "";
  let para: string[] = [];
  const heading = (depth: number, raw: string) => {
    const text = plainInline(raw);
    headings.push({ depth, text, id: ids.next(text) });
  };
  const endPara = () => {
    if (excerpt === "" && para.length > 0) {
      const text = plainInline(para.join(" "));
      if (text !== "" && !ONLY_URL.test(para.join(" ").trim())) excerpt = clipText(text);
    }
    para = [];
  };
  for (const { text, code } of fencedLines(stripWikiComments(markdown))) {
    if (code) {
      endPara();
      continue;
    }
    const line = text.replace(/`+[^`]*`+/g, (m) => " ".repeat(m.length));
    for (const m of line.matchAll(WIKI_LINK)) {
      const l = parseWikiLink(m[2]!);
      if (m[1] && isImageEmbed(l.page)) files.push(l.page);
      else if (!m[1] && l.page) pages.push(linkTitle(l.page));
    }
    for (const m of line.matchAll(MD_LINK)) {
      const target = vaultTarget(m[3]!);
      if (target === undefined) continue;
      const { path } = splitHash(target);
      if (path === "") continue;
      if (!m[1] && path.toLowerCase().endsWith(".md")) pages.push(linkTitle(path));
      else files.push(path);
    }
    const atx = ATX.exec(text);
    if (atx) {
      endPara();
      heading(atx[1]!.length, atx[2] ?? "");
      continue;
    }
    const setext = SETEXT.exec(text);
    if (setext && para.length > 0) {
      const raw = para.join(" ");
      para = [];
      heading(setext[1]![0] === "=" ? 1 : 2, raw);
      continue;
    }
    if (text.trim() === "" || BLOCK_START.test(text) || /^(?: {4}|\t)/.test(text) && para.length === 0) {
      endPara();
      continue;
    }
    para.push(text.trim());
  }
  endPara();
  return { headings, pages, files, excerpt };
}
