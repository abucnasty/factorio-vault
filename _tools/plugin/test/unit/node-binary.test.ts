// The Node path setting: what `which node` prints may be a version
// manager's shim, which only works from the user's shell, so the plugin
// tells node itself from a shim.

import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";

import { isNodeItself } from "../../src/process/node-process.ts";

const root = mkdtempSync(join(tmpdir(), "fbp-node-binary-test-"));
after(() => rmSync(root, { recursive: true, force: true }));

describe("isNodeItself", () => {
  test("the running node is node itself", () => {
    assert.equal(isNodeItself(process.execPath), true);
  });

  test("a link to node is node itself", () => {
    const link = join(root, "linked-node");
    symlinkSync(process.execPath, link);
    assert.equal(isNodeItself(link), true);
  });

  test("an asdf shim (a script named node) is not", () => {
    mkdirSync(join(root, "shims"));
    const shim = join(root, "shims", "node");
    writeFileSync(shim, '#!/usr/bin/env bash\nexec asdf exec "node" "$@"\n');
    chmodSync(shim, 0o755);
    assert.equal(isNodeItself(shim), false);
  });

  test("a mise or Volta shim (a link to another binary) is not", () => {
    const binary = join(root, "mise");
    writeFileSync(binary, "\x7fELF");
    mkdirSync(join(root, "mise-shims"));
    symlinkSync(binary, join(root, "mise-shims", "node"));
    assert.equal(isNodeItself(join(root, "mise-shims", "node")), false);
  });

  test("a path that does not exist, or a bare name, is not", () => {
    assert.equal(isNodeItself(join(root, "nowhere", "node")), false);
    assert.equal(isNodeItself("node"), false);
  });
});
