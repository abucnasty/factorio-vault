// The wiki index builder against temporary git repositories.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import sharp from "sharp";

import { buildWiki, carryOverPages, GIF_MAX_BYTES, wikiIndexObject, wikiObjects, type WikiFileHooks } from "../build-wiki.ts";
import { CONVERT_NAME, MAX_SIDE, toWebp } from "../wiki-images.ts";

process.env["GIT_CONFIG_GLOBAL"] = "/dev/null";
process.env["GIT_CONFIG_NOSYSTEM"] = "1";

const root = mkdtempSync(join(tmpdir(), "fbp-wiki-test-"));
after(() => rmSync(root, { recursive: true, force: true }));
let n = 0;

function repo() {
  const dir = join(root, `repo-${++n}`);
  execFileSync("git", ["init", "-q", "-b", "main", dir]);
  const git = (...args: string[]) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  git("config", "commit.gpgsign", "false");
  const write = (path: string, data: string | Buffer) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), data);
  };
  const commit = () => {
    git("add", "-A");
    git("commit", "-q", "--allow-empty", "-m", "x");
    return git("rev-parse", "HEAD");
  };
  return { dir, write, commit };
}

const pointer = (data: Buffer) => {
  const oid = createHash("sha256").update(data).digest("hex");
  return { oid, text: `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${data.length}\n` };
};
const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** Hooks with real conversion; LFS objects from `lfs`, and every converted size recorded. */
function hooks(lfs: Map<string, Buffer> = new Map()): WikiFileHooks & { converted: number[] } {
  const converted: number[] = [];
  return {
    converted,
    loadLfs: async (oid) => {
      const data = lfs.get(oid);
      if (!data) throw new Error(`no LFS object ${oid}`);
      return data;
    },
    convert: async (data) => {
      converted.push(data.length);
      return toWebp(data);
    },
    convertName: CONVERT_NAME,
  };
}

test("pages: titles, addresses, folders, headings, excerpt and links; drafts and attachments are left out", () => {
  const r = repo();
  r.write("wiki/Home.md", "Welcome to the wiki. See [[How to Benchmark]] and [setup](Guides/Linux%20Setup.md#Huge%20pages).\n");
  r.write(
    "wiki/Guides/How to Benchmark.md",
    "---\naliases: [Benchmarking 101]\nauthor: ignored\n---\n\n%% a private note %%\n# Ignored? no: a heading\n\n" +
      "This guide shows **how** to run `belt`.\n\n## Step 1: Install `belt`\n\n```sh\n# not a heading [[Nope]]\n```\n\n## Step 1: Install `belt`\n\nSee [[Linux Setup#Huge pages|pages]], [[Draft Page]] and [[Missing]].\n",
  );
  r.write("wiki/Guides/Linux Setup.md", "Setup\n=====\n\n## Huge pages\n\nBack to [[home]].\n");
  r.write("wiki/Guides/Draft Page.md", "---\ndraft: true\n---\nNot yet.\n");
  r.write("wiki/Guides/_attachments/notes.md", "not a page");
  r.write("wiki/.hidden/Secret.md", "not a page");
  r.write("wiki/.Dot.md", "not a page");
  r.write("blog/x/README.md", "not the wiki");
  const commit = r.commit();

  const wiki = buildWiki(r.dir, { now: new Date("2026-11-18T00:00:00Z") });
  assert.deepEqual(wiki.problems, []);
  assert.deepEqual(wiki.drafts, ["Draft Page"]);
  assert.equal(wiki.index.schema, 1);
  assert.equal(wiki.index.commit, commit);
  assert.deepEqual(
    wiki.index.pages.map((p) => [p.title, p.slug, p.folder, p.links]),
    [
      ["Home", "home", "", ["how-to-benchmark", "linux-setup"]],
      ["How to Benchmark", "how-to-benchmark", "Guides", ["linux-setup"]],
      ["Linux Setup", "linux-setup", "Guides", ["home"]],
    ],
  );
  const guide = wiki.index.pages[1]!;
  assert.deepEqual(guide.aliases, ["Benchmarking 101"]);
  assert.deepEqual(guide.headings, [
    { depth: 1, text: "Ignored? no: a heading", id: "ignored-no-a-heading" },
    { depth: 2, text: "Step 1: Install belt", id: "step-1-install-belt" },
    { depth: 2, text: "Step 1: Install belt", id: "step-1-install-belt-1" },
  ]);
  assert.equal(guide.excerpt, "This guide shows how to run belt.");
  assert.deepEqual(wiki.index.pages[2]!.headings.map((h) => [h.depth, h.id]), [[1, "setup"], [2, "huge-pages"]]);
  // The published markdown has no frontmatter and no comments.
  assert.match(wiki.bodies.get("how-to-benchmark")!, /^# Ignored\?/);
  assert.doesNotMatch(wiki.bodies.get("how-to-benchmark")!, /private|author/);
});

test("duplicate titles (ignoring case), duplicate addresses, reserved addresses and taken aliases are problems naming the files", () => {
  const r = repo();
  r.write("wiki/Guides/Setup.md", "One.\n");
  r.write("wiki/Other/setup.md", "Two.\n");
  r.write("wiki/C++ Tips.md", "Three.\n");
  r.write("wiki/C Tips.md", "Four.\n");
  r.write("wiki/All.md", "Five.\n");
  r.write("wiki/Fine.md", "---\naliases: [C Tips, Old Name]\n---\nSix.\n");
  r.write("wiki/Also Fine.md", "---\naliases: [old name]\n---\nSeven.\n");
  r.write("wiki/Broken.md", "---\naliases: [unclosed\n---\nEight.\n");
  r.commit();
  const wiki = buildWiki(r.dir);
  const by = (path: string) => wiki.problems.filter((p) => p.path === path).map((p) => p.message);
  assert.match(by("wiki/Guides/Setup.md").join(), /also the title of wiki\/Other\/setup\.md/);
  assert.match(by("wiki/Other/setup.md").join(), /also the title of wiki\/Guides\/Setup\.md/);
  assert.match(by("wiki/C++ Tips.md").join(), /\/wiki\/c-tips is also that of wiki\/C Tips\.md/);
  assert.match(by("wiki/All.md").join(), /used by the site/);
  assert.match(by("wiki/Fine.md").join(), /alias "C Tips" .* is the title or address of wiki\/C Tips\.md, wiki\/C\+\+ Tips\.md/);
  assert.match(by("wiki/Fine.md").join(), /alias "Old Name" .* also an alias of wiki\/Also Fine\.md/);
  assert.match(by("wiki/Also Fine.md").join(), /alias "old name" .* also an alias of wiki\/Fine\.md/);
  assert.equal(by("wiki/Broken.md").length, 1);
  assert.equal(wiki.index.pages.length, 0);
  assert.deepEqual(wiki.invalid, ["all", "also-fine", "broken", "c-tips", "fine", "setup"]);

  // A page already live keeps its last entry (and its files), marked stale.
  const live = {
    schema: 1 as const,
    generatedAt: "",
    commit: "",
    pages: [{ title: "Setup", slug: "setup", folder: "Guides", aliases: [], headings: [], excerpt: "", links: [], files: ["a.webp"], blob: "b" }],
    files: [{ path: "a.webp", published: "a.webp", type: "image/webp", size: 1, sourceSize: 1, blob: "f", v: "v", convert: CONVERT_NAME }],
  };
  assert.deepEqual(carryOverPages(wiki, live), ["setup"]);
  assert.equal(wiki.index.pages[0]!.stale, true);
  assert.deepEqual(wiki.index.files.map((f) => f.path), ["a.webp"]);
});

test("images: resolved Obsidian style, converted to WebP (LFS or plain git), GIFs as they are up to 5 MB; only changed objects are written, index last", async () => {
  const r = repo();
  const big = await png(3000, 1200);
  const lfsBig = pointer(big);
  const small = await png(64, 64);
  const gifLfs = pointer(GIF);
  const hugeGif = `version https://git-lfs.github.com/spec/v1\noid sha256:${"e".repeat(64)}\nsize ${GIF_MAX_BYTES + 1}\n`;
  r.write("wiki/Guides/Page.md", "![[shot.png]]\n\n![[logo.png|64]]\n\n![anim](_attachments/anim.gif)\n\n![[huge.gif]]\n\n![[nowhere.png]]\n\n![[Other Page]]\n");
  r.write("wiki/Guides/_attachments/shot.png", lfsBig.text);
  r.write("wiki/Guides/_attachments/anim.gif", gifLfs.text);
  r.write("wiki/Guides/_attachments/huge.gif", hugeGif);
  r.write("wiki/Guides/logo.png", small); // plain git, beside the page
  r.write("wiki/Elsewhere/_attachments/logo.png", small); // same name, further away: not chosen
  r.write("wiki/Elsewhere/_attachments/unused.png", small); // no published page uses it
  r.write("wiki/Draft.md", "---\ndraft: true\n---\n![[unused.png]]\n");
  r.write("wiki/Plain.md", "A [[Page]] link and a ![gif](Guides/plain.gif).\n");
  r.write("wiki/Guides/plain.gif", GIF);
  r.commit();

  const wiki = buildWiki(r.dir);
  assert.deepEqual(wiki.problems.map((p) => p.path), ["wiki/Guides/_attachments/huge.gif"]);
  assert.match(wiki.problems[0]!.message, /at most 5 MB/);
  assert.deepEqual(wiki.warnings, ['wiki/Guides/Page.md: no file "nowhere.png" in wiki/ (shown as missing)']);
  assert.deepEqual([...wiki.sources.keys()], ["Guides/_attachments/anim.gif", "Guides/_attachments/shot.png", "Guides/logo.png", "Guides/plain.gif"]);

  const h = hooks(new Map([[lfsBig.oid, big]]));
  const objects = [...(await wikiObjects(wiki, undefined, h)), wikiIndexObject(wiki)];
  assert.deepEqual(
    objects.map((o) => [o.key, o.contentType]),
    [
      ["wiki/files/Guides/_attachments/shot.webp", "image/webp"],
      ["wiki/files/Guides/logo.webp", "image/webp"],
      ["wiki/files/Guides/plain.gif", "image/gif"],
      ["wiki/page.md", "text/markdown; charset=utf-8"],
      ["wiki/plain.md", "text/markdown; charset=utf-8"],
      ["wiki/index.json", "application/json; charset=utf-8"],
    ],
  );
  const files = new Map(wiki.index.files.map((f) => [f.path, f]));
  const shot = files.get("Guides/_attachments/shot.png")!;
  assert.equal(shot.published, "Guides/_attachments/shot.webp");
  assert.equal(shot.sourceSize, big.length);
  assert.ok(shot.size < big.length);
  assert.equal(shot.convert, CONVERT_NAME);
  const meta = await sharp(objects[0]!.body as Buffer).metadata();
  assert.deepEqual([meta.format, meta.width, meta.height], ["webp", MAX_SIDE, 640]);
  const logoMeta = await sharp(objects[1]!.body as Buffer).metadata();
  assert.deepEqual([logoMeta.width, logoMeta.height], [64, 64]); // never enlarged
  // An LFS GIF is served from the LFS bucket as it is; a plain one is uploaded as it is.
  assert.deepEqual(files.get("Guides/_attachments/anim.gif"), {
    path: "Guides/_attachments/anim.gif",
    published: "Guides/_attachments/anim.gif",
    type: "image/gif",
    size: GIF.length,
    sourceSize: GIF.length,
    blob: wiki.sources.get("Guides/_attachments/anim.gif")!.blob,
    v: gifLfs.oid.slice(0, 16),
    oid: gifLfs.oid,
  });
  assert.deepEqual(objects[2]!.body, GIF);
  assert.deepEqual(wiki.index.pages.find((p) => p.slug === "page")!.files, [
    "Guides/_attachments/anim.gif",
    "Guides/_attachments/shot.png",
    "Guides/logo.png",
  ]);

  // Against that index as live: nothing changed, so only the index is written and nothing is converted.
  const live = JSON.parse(objects.at(-1)!.body as string);
  const again = buildWiki(r.dir);
  const h2 = hooks(new Map([[lfsBig.oid, big]]));
  assert.deepEqual(await wikiObjects(again, live, h2), []);
  assert.deepEqual(h2.converted, []);
  assert.deepEqual(again.index.files, wiki.index.files);

  // An LFS object that cannot be fetched is a problem; the page shows that image as missing.
  const third = buildWiki(r.dir);
  await wikiObjects(third, undefined, hooks());
  assert.match(third.problems.map((p) => `${p.path}: ${p.message}`).join("\n"), /shot\.png: could not be published: no LFS object/);
  assert.ok(!third.index.pages.find((p) => p.slug === "page")!.files.includes("Guides/_attachments/shot.png"));
});
