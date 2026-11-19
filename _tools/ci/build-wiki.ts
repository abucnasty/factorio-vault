// Build and validate the wiki index (wiki-index.ts) from one commit's wiki/
// folder, and pick the R2 objects a publish writes. Like build-blog.ts it
// reads the commit's git objects, not the files on disk: a file stored with
// Git LFS is seen as its pointer. Images are published compressed (see
// wiki-images.ts), so an LFS image's bytes are fetched when it is new or
// changed: from the local LFS store if it has the object, else from the
// public LFS server in .lfsconfig. The vault's files are never rewritten.
// The CLI is catalog.ts.
//
// Pages are every .md under wiki/ outside _attachments folders; a page's
// title is its file name. Drafts (`draft: true`) are not in the public
// index: they get their own, wiki-drafts/index.json, and their markdown is
// wiki-drafts/<slug>.md, a prefix the link Worker never serves (the site's
// Worker shows them to signed-in wiki editors). A page with problems (a
// duplicate title or address, an alias taken by another page, unreadable
// frontmatter) is left out, but a published one already in the live index
// keeps its last published entry, marked stale. Only the images published
// pages and drafts show (or link to) are published, all under wiki/files/
// and listed in the public index (the vault is public anyway), so a draft's
// images work and keep working when it is published.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  isWikiPagePath,
  isWikiPath,
  readWikiPage,
  resolveWikiFile,
  scanWikiMarkdown,
  stripWikiComments,
  titleKey,
  WIKI_RESERVED_SLUGS,
  WIKI_ROOT,
  wikiFolder,
  wikiRelative,
  wikiSlug,
  wikiTitle,
} from "../plugin/src/core/index.ts";
import { Git, LFS_POINTER, type Problem } from "./build-catalog.ts";
import { wikiFileType, type WikiFile, type WikiIndex, type WikiPage } from "./wiki-index.ts";

export const WIKI_INDEX_KEY = `${WIKI_ROOT}/index.json`;
export const WIKI_FILES = `${WIKI_ROOT}/files`;
/** The drafts' R2 prefix: never served by the link Worker. */
export const WIKI_DRAFTS = "wiki-drafts";
export const WIKI_DRAFTS_INDEX_KEY = `${WIKI_DRAFTS}/index.json`;
const MARKDOWN_TYPE = "text/markdown; charset=utf-8";
/** Images published as WebP (see wiki-images.ts). */
const CONVERTED = /\.(png|jpe?g|webp)$/i;
/** Images published as they are: animated GIFs, up to GIF_MAX_BYTES. */
const AS_IS = /\.gif$/i;
export const GIF_MAX_BYTES = 5 * 1024 * 1024;

/** A file published pages use, as found in the commit. */
export interface WikiSource {
  /** Relative to wiki/. */
  path: string;
  published: string;
  blob: string;
  /** Bytes in the vault (of the LFS object for an LFS file). */
  size: number;
  /** Set for a file stored with Git LFS. */
  oid?: string;
  /** Contents of a plain-git file. */
  data?: Buffer;
}

export interface Wiki {
  /** The index, without `files` until wikiObjects fills them in. */
  index: WikiIndex;
  /** Validation failures; `folder` is the page's or file's repo path. A page with any is left out. */
  problems: Problem[];
  /** Not failures: links to images that are not there, files of a type the wiki does not publish. */
  warnings: string[];
  /** Addresses (slugs) of pages left out for their problems, sorted. */
  invalid: string[];
  /** Titles of the valid drafts, sorted: not in the public index. */
  drafts: string[];
  /** The drafts' index (wiki-drafts/index.json), files filled in by wikiObjects. */
  draftIndex: WikiIndex;
  /** Each published page's markdown (frontmatter and comments removed), by slug. */
  bodies: Map<string, string>;
  /** Each draft's markdown, likewise, by slug. */
  draftBodies: Map<string, string>;
  /** The files published pages and drafts use, by path relative to wiki/. */
  sources: Map<string, WikiSource>;
}

/** One R2 object a publish writes. */
export interface WikiObject {
  key: string;
  contentType: string;
  body: Buffer | string;
}

const byKey = <T>(key: (x: T) => string) => (a: T, b: T) => {
  const [x, y] = [key(a), key(b)];
  return x < y ? -1 : x > y ? 1 : 0;
};

/** Where an image is published under wiki/files/: converted ones become .webp. */
export function publishedPath(path: string): string {
  return CONVERTED.test(path) ? path.replace(/\.[^./]+$/, ".webp") : path;
}

/** True for a file type the wiki publishes. */
export function isPublishable(path: string): boolean {
  return CONVERTED.test(path) || AS_IS.test(path);
}

/** Validate every page under wiki/ at `commit` and build the index of the published ones (files not yet filled in). */
export function buildWiki(repo: string, opts: { commit?: string; now?: Date } = {}): Wiki {
  const git = new Git(repo);
  const commit = git.resolve(opts.commit ?? "HEAD");
  const pagePaths: [string, string][] = [];
  const fileBlobs = new Map<string, string>();
  for (const [path, blob] of git.tree(commit, WIKI_ROOT)) {
    if (!isWikiPath(path)) continue;
    if (isWikiPagePath(path)) pagePaths.push([path, blob]);
    else fileBlobs.set(wikiRelative(path), blob);
  }
  pagePaths.sort(byKey(([p]) => p));
  const texts = git.readBlobs(pagePaths.map(([, b]) => b));

  const problems: Problem[] = [];
  const warnings: string[] = [];
  const problem = (folder: string, path: string, message: string) => problems.push({ folder, path, message });

  interface Candidate {
    path: string;
    blob: string;
    title: string;
    slug: string;
    folder: string;
    read: ReturnType<typeof readWikiPage>;
  }
  const all: Candidate[] = pagePaths.map(([path, blob]) => {
    const title = wikiTitle(path);
    return { path, blob, title, slug: wikiSlug(title), folder: wikiFolder(path), read: readWikiPage(texts.get(blob)!.toString("utf8")) };
  });

  // Titles and addresses are unique across every page, drafts included (links resolve by title).
  const byTitle = new Map<string, Candidate[]>();
  const bySlug = new Map<string, Candidate[]>();
  for (const c of all) {
    byTitle.set(titleKey(c.title), [...(byTitle.get(titleKey(c.title)) ?? []), c]);
    if (c.slug !== "") bySlug.set(c.slug, [...(bySlug.get(c.slug) ?? []), c]);
  }
  const bad = new Set<Candidate>();
  const fail = (c: Candidate, message: string) => {
    bad.add(c);
    problem(c.path, c.path, message);
  };
  for (const c of all) {
    for (const p of c.read.problems) fail(c, p);
    const others = (list: Candidate[] | undefined) => (list ?? []).filter((o) => o !== c).map((o) => o.path);
    const sameTitle = others(byTitle.get(titleKey(c.title)));
    if (sameTitle.length > 0) fail(c, `the title "${c.title}" is also the title of ${sameTitle.join(", ")}: page titles (file names) must be unique in the wiki, ignoring case`);
    else if (c.slug !== "" && others(bySlug.get(c.slug)).length > 0) {
      fail(c, `the address /wiki/${c.slug} is also that of ${others(bySlug.get(c.slug)).join(", ")}: rename one of them`);
    }
    if (c.slug === "") fail(c, "the title (file name) needs a letter or digit: the page's address is made from it");
    if (WIKI_RESERVED_SLUGS.includes(c.slug)) fail(c, `the address /wiki/${c.slug} is used by the site: choose another title`);
  }

  // Aliases of published pages: each redirects /wiki/<its slug>, so it may not be another page's address or title.
  const published = all.filter((c) => !c.read.draft && c.read.problems.length === 0);
  const aliasOwners = new Map<string, Candidate[]>();
  for (const c of published) {
    for (const a of c.read.aliases) {
      const s = wikiSlug(a);
      if (s === "" || s === c.slug) continue;
      aliasOwners.set(s, [...(aliasOwners.get(s) ?? []), c]);
    }
  }
  for (const c of published) {
    for (const a of c.read.aliases) {
      const s = wikiSlug(a);
      if (s === c.slug) continue;
      if (s === "") {
        fail(c, `the alias "${a}" needs a letter or digit`);
        continue;
      }
      const taken = [...(bySlug.get(s) ?? []), ...(byTitle.get(titleKey(a)) ?? [])].filter((o) => o !== c);
      if (taken.length > 0) fail(c, `the alias "${a}" (/wiki/${s}) is the title or address of ${[...new Set(taken.map((o) => o.path))].join(", ")}: remove the alias or rename that page`);
      else if (WIKI_RESERVED_SLUGS.includes(s)) fail(c, `the alias "${a}" (/wiki/${s}) is an address the site uses`);
      const shared = (aliasOwners.get(s) ?? []).filter((o) => o !== c);
      if (shared.length > 0) fail(c, `the alias "${a}" (/wiki/${s}) is also an alias of ${shared.map((o) => o.path).join(", ")}`);
    }
  }

  const draftPages = all.filter((c) => c.read.draft && !bad.has(c));
  const drafts = draftPages.map((c) => c.title).sort();
  const live = published.filter((c) => !bad.has(c));
  const invalid = [...new Set(all.filter((c) => bad.has(c) && !c.read.draft && c.slug !== "").map((c) => c.slug))].sort();

  // Links resolve to published pages by title, then by alias (a former
  // title: a renamed page's old [[links]] keep working), ignoring case; a
  // draft's links may also reach other drafts, by title, then by alias (a
  // renamed draft). The site (src/wikiCore.ts findWikiTarget) resolves the same way.
  const target = new Map<string, string>();
  for (const c of live) target.set(titleKey(c.title), c.slug);
  for (const c of live) for (const a of c.read.aliases) if (!target.has(titleKey(a))) target.set(titleKey(a), c.slug);
  const draftTarget = new Map(target);
  for (const c of draftPages) if (!draftTarget.has(titleKey(c.title))) draftTarget.set(titleKey(c.title), c.slug);
  for (const c of draftPages) for (const a of c.read.aliases) if (!draftTarget.has(titleKey(a))) draftTarget.set(titleKey(a), c.slug);

  const allFiles = [...fileBlobs.keys()];
  const publishable = allFiles.filter(isPublishable);
  const used = new Map<string, Set<string>>(); // file path -> pages (repo paths) using it
  const pages: WikiPage[] = [];
  const bodies = new Map<string, string>();
  const draftEntries: WikiPage[] = [];
  const draftBodies = new Map<string, string>();
  for (const c of [...live, ...draftPages]) {
    const isDraft = c.read.draft;
    const body = stripWikiComments(c.read.body);
    const scan = scanWikiMarkdown(body);
    const links = new Set<string>();
    for (const t of scan.pages) {
      const slug = (isDraft ? draftTarget : target).get(titleKey(t));
      if (slug !== undefined && slug !== c.slug) links.add(slug);
    }
    const files = new Set<string>();
    for (const t of scan.files) {
      const f = resolveWikiFile(t, c.folder, publishable);
      if (f !== undefined) {
        files.add(f);
        used.set(f, (used.get(f) ?? new Set()).add(c.path));
        continue;
      }
      const other = resolveWikiFile(t, c.folder, allFiles);
      if (other !== undefined) warnings.push(`${c.path}: "${t}" is not published: only PNG, JPEG, WebP and GIF images are`);
      else if (/\.[a-z0-9]{2,5}$/i.test(t)) warnings.push(`${c.path}: no file "${t}" in ${WIKI_ROOT}/ (shown as missing)`);
    }
    (isDraft ? draftEntries : pages).push({
      title: c.title,
      slug: c.slug,
      folder: c.folder,
      aliases: c.read.aliases.filter((a) => wikiSlug(a) !== c.slug),
      headings: scan.headings,
      excerpt: scan.excerpt,
      links: [...links].sort(),
      files: [...files].sort(),
      blob: c.blob,
    });
    (isDraft ? draftBodies : bodies).set(c.slug, body);
  }

  // The files those pages use: GIFs over the limit are not published; two images may not publish to one name.
  const blobs = git.readBlobs([...used.keys()].map((p) => fileBlobs.get(p)!));
  const sources = new Map<string, WikiSource>();
  const publishedBy = new Map<string, string>();
  for (const path of [...used.keys()].sort()) {
    const blob = fileBlobs.get(path)!;
    const data = blobs.get(blob)!;
    const pointer = LFS_POINTER.exec(data.toString("latin1"));
    const size = pointer ? Number(pointer[2]) : data.length;
    const repoPath = `${WIKI_ROOT}/${path}`;
    if (AS_IS.test(path) && size > GIF_MAX_BYTES) {
      problem(repoPath, repoPath, `is ${(size / 1048576).toFixed(1)} MB: a GIF may be at most ${GIF_MAX_BYTES / 1048576} MB (used by ${[...used.get(path)!].join(", ")})`);
      continue;
    }
    const pub = publishedPath(path);
    const clash = publishedBy.get(pub);
    if (clash !== undefined) {
      problem(repoPath, repoPath, `is published as ${pub}, like ${WIKI_ROOT}/${clash}: rename one of them`);
      continue;
    }
    publishedBy.set(pub, path);
    sources.set(path, { path, published: pub, blob, size, ...(pointer ? { oid: pointer[1]! } : { data }) });
  }
  for (const p of [...pages, ...draftEntries]) p.files = p.files.filter((f) => sources.has(f));

  pages.sort(byKey((p) => titleKey(p.title)));
  draftEntries.sort(byKey((p) => titleKey(p.title)));
  const generatedAt = (opts.now ?? new Date()).toISOString();
  return {
    index: { schema: 1, generatedAt, commit, pages, files: [] },
    problems,
    warnings,
    invalid,
    drafts,
    draftIndex: { schema: 1, generatedAt, commit, pages: draftEntries, files: [] },
    bodies,
    draftBodies,
    sources,
  };
}

/**
 * Keep the live entry (and its files' entries) of each page left out for
 * its problems, marked stale, unless a valid page or alias now has its
 * address. A draft or a deleted page is not kept: it goes offline.
 * Call after wikiObjects. Returns the slugs kept.
 */
export function carryOverPages(wiki: Wiki, live: WikiIndex | undefined): string[] {
  const kept: string[] = [];
  const taken = new Set(wiki.index.pages.flatMap((p) => [p.slug, ...p.aliases.map(wikiSlug)]));
  const liveFiles = new Map((live?.files ?? []).map((f) => [f.path, f]));
  const have = new Set(wiki.index.files.map((f) => f.path));
  for (const old of live?.pages ?? []) {
    if (taken.has(old.slug) || !wiki.invalid.includes(old.slug)) continue;
    wiki.index.pages.push({ ...old, stale: true });
    taken.add(old.slug);
    kept.push(old.slug);
    for (const path of old.files ?? []) {
      const f = liveFiles.get(path);
      if (f && !have.has(path)) {
        wiki.index.files.push(f);
        have.add(path);
      }
    }
  }
  wiki.index.pages.sort(byKey((p) => titleKey(p.title)));
  wiki.index.files.sort(byKey((f) => f.path));
  return kept;
}

export interface WikiFileHooks {
  /** The bytes of an LFS object (see lfsLoader). */
  loadLfs: (oid: string, size: number) => Promise<Buffer>;
  /** Compress an image (see wiki-images.ts). */
  convert: (data: Buffer) => Promise<Buffer>;
  /** Names the conversion; a file converted another way is converted again. */
  convertName: string;
}

const version = (data: Buffer) => createHash("sha256").update(data).digest("hex").slice(0, 16);

/**
 * Fill in the indexes' files and return the objects a publish writes, in
 * order: the files that are new or changed since `live` (all of them
 * without it; a GIF stored with LFS is never uploaded, it is served from
 * the LFS bucket), then the pages' markdown (new or changed), then the
 * drafts' markdown (new or changed since `liveDrafts`). The two indexes
 * (wikiIndexObject, then wikiDraftsIndexObject) are written after these,
 * so neither ever names an object that is not there. A file that cannot be
 * read or converted is a problem: it is left out (pages show it as
 * missing). Also reports each converted file's sizes through `log`.
 */
export async function wikiObjects(
  wiki: Wiki,
  live: WikiIndex | undefined,
  hooks: WikiFileHooks,
  log: (line: string) => void = () => {},
  liveDrafts?: WikiIndex,
): Promise<WikiObject[]> {
  const liveFiles = new Map((live?.files ?? []).map((f) => [f.path, f]));
  const files: WikiObject[] = [];
  const entries: WikiFile[] = [];
  for (const src of [...wiki.sources.values()].sort(byKey((s) => s.path))) {
    const repoPath = `${WIKI_ROOT}/${src.path}`;
    const type = wikiFileType(src.published);
    const base = { path: src.path, published: src.published, type, sourceSize: src.size, blob: src.blob };
    if (AS_IS.test(src.path)) {
      if (src.oid !== undefined) {
        entries.push({ ...base, size: src.size, v: src.oid.slice(0, 16), oid: src.oid });
        continue;
      }
      const old = liveFiles.get(src.path);
      entries.push({ ...base, size: src.size, v: version(src.data!) });
      if (old?.blob !== src.blob || old.convert !== undefined || old.oid !== undefined) {
        files.push({ key: `${WIKI_FILES}/${src.published}`, contentType: type, body: src.data! });
      }
      continue;
    }
    const old = liveFiles.get(src.path);
    if (old && old.blob === src.blob && old.convert === hooks.convertName && old.published === src.published) {
      entries.push(old);
      continue;
    }
    let out: Buffer;
    try {
      const data = src.data ?? (await hooks.loadLfs(src.oid!, src.size));
      out = await hooks.convert(data);
    } catch (e) {
      wiki.problems.push({ folder: repoPath, path: repoPath, message: `could not be published: ${e instanceof Error ? e.message : String(e)}` });
      for (const p of [...wiki.index.pages, ...wiki.draftIndex.pages]) p.files = p.files.filter((f) => f !== src.path);
      continue;
    }
    log(`  ${repoPath}: ${src.size} -> ${out.length} bytes (${src.published})`);
    entries.push({ ...base, size: out.length, v: version(out), convert: hooks.convertName });
    files.push({ key: `${WIKI_FILES}/${src.published}`, contentType: type, body: out });
  }
  wiki.index.files = entries;
  const draftFiles = new Set(wiki.draftIndex.pages.flatMap((p) => p.files));
  wiki.draftIndex.files = entries.filter((f) => draftFiles.has(f.path));

  const livePages = new Map((live?.pages ?? []).map((p) => [p.slug, p.blob]));
  const bodies: WikiObject[] = [];
  for (const page of wiki.index.pages) {
    if (page.stale || livePages.get(page.slug) === page.blob) continue;
    bodies.push({ key: `${WIKI_ROOT}/${page.slug}.md`, contentType: MARKDOWN_TYPE, body: wiki.bodies.get(page.slug)! });
  }
  const liveDraftPages = new Map((liveDrafts?.pages ?? []).map((p) => [p.slug, p.blob]));
  for (const page of wiki.draftIndex.pages) {
    if (liveDraftPages.get(page.slug) === page.blob) continue;
    bodies.push({ key: `${WIKI_DRAFTS}/${page.slug}.md`, contentType: MARKDOWN_TYPE, body: wiki.draftBodies.get(page.slug)! });
  }
  return [...files, ...bodies];
}

/** The public index object, written after every file and page it names. */
export function wikiIndexObject(wiki: Wiki): WikiObject {
  return { key: WIKI_INDEX_KEY, contentType: "application/json; charset=utf-8", body: JSON.stringify(wiki.index) };
}

/** The drafts' index object, written last (after the public index, which lists the drafts' files). */
export function wikiDraftsIndexObject(wiki: Wiki): WikiObject {
  return { key: WIKI_DRAFTS_INDEX_KEY, contentType: "application/json; charset=utf-8", body: JSON.stringify(wiki.draftIndex) };
}

/**
 * Reads LFS objects: from the repo's local LFS store when it has them,
 * else from the LFS server named in the commit's .lfsconfig (downloads are
 * public), checking the SHA-256 and size.
 */
export function lfsLoader(repo: string, commit: string): (oid: string, size: number) => Promise<Buffer> {
  const git = new Git(repo);
  const common = resolve(repo, git.run(["rev-parse", "--git-common-dir"]).toString().trim());
  let server: string | undefined;
  return async (oid, size) => {
    const local = join(common, "lfs", "objects", oid.slice(0, 2), oid.slice(2, 4), oid);
    let data: Buffer;
    if (existsSync(local)) data = readFileSync(local);
    else {
      server ??= lfsServer(git, commit);
      const res = await fetch(`${server.replace(/\/+$/, "")}/objects/${oid}`);
      if (!res.ok) throw new Error(`the LFS object ${oid} is not on the LFS server (HTTP ${res.status}); push it with git-lfs`);
      data = Buffer.from(await res.arrayBuffer());
    }
    if (data.length !== size || createHash("sha256").update(data).digest("hex") !== oid) {
      throw new Error(`the LFS object ${oid} does not match its pointer`);
    }
    return data;
  };
}

function lfsServer(git: Git, commit: string): string {
  let text = "";
  try {
    text = git.run(["show", `${commit}:.lfsconfig`]).toString();
  } catch {
    /* no .lfsconfig */
  }
  const url = /^\s*url\s*=\s*(\S+)/m.exec(text.slice(text.indexOf("[lfs]")))?.[1];
  if (!url) throw new Error("no LFS server: .lfsconfig has no [lfs] url");
  return url;
}
