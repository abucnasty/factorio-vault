// Runs a program through Node's child_process with an argument array
// (never a shell), for the render command. Desktop Obsidian and Node only.

import { spawn, spawnSync } from "child_process";
import { closeSync, existsSync, openSync, readSync, realpathSync } from "fs";
import { basename } from "path";

import type { ProcessResult, ProcessRunner } from "../commands/host.ts";

export const nodeProcessRunner: ProcessRunner = {
  run(program, args, { cwd, signal, onStderrLine }) {
    return new Promise<ProcessResult>((done) => {
      let stdout = "";
      let stderr = "";
      let partial = "";
      let settled = false;
      const finish = (r: ProcessResult) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        done(r);
      };
      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(program, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      } catch (e) {
        finish({ code: -1, stdout, stderr, error: e instanceof Error ? e.message : String(e) });
        return;
      }
      // SIGINT lets the render tool stop Factorio and clean up.
      const onAbort = () => child.kill("SIGINT");
      if (signal?.aborted) onAbort();
      else signal?.addEventListener("abort", onAbort);
      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", (d: string) => (stdout += d));
      child.stderr?.on("data", (d: string) => {
        stderr += d;
        partial += d;
        const lines = partial.split(/\r?\n/);
        partial = lines.pop() ?? "";
        for (const line of lines) onStderrLine?.(line);
      });
      child.on("error", (e) => finish({ code: -1, stdout, stderr, error: e.message }));
      child.on("close", (code) => {
        if (partial !== "") onStderrLine?.(partial);
        finish({ code, stdout, stderr });
      });
    });
  },
};

/** Node binaries found through the login shell this session, by what was asked for ("" for plain node). */
const fromShell = new Map<string, string | null>();

/**
 * The Node binary to run the render tool with, from the Node path setting
 * ("" when not set). Obsidian started from the macOS Dock does not see the
 * shell PATH, so with no setting look where Homebrew puts node, then ask
 * the user's login shell. A version manager's shim (what `which node`
 * prints with asdf, mise or Volta) only works with that shell's PATH, so a
 * setting that is not node itself is run in that shell too, which reports
 * the real executable.
 */
export function nodeBinary(configured: string): string {
  if (process.platform !== "darwin") return configured || "node";
  if (configured === "") {
    for (const p of ["/opt/homebrew/bin/node", "/usr/local/bin/node"]) if (existsSync(p)) return p;
  } else if (isNodeItself(configured)) {
    return configured;
  }
  if (!fromShell.has(configured)) fromShell.set(configured, nodeFromLoginShell(configured));
  return fromShell.get(configured) ?? (configured || "node");
}

/** A node executable, not a shim: asdf's is a script, mise's and Volta's link to their own binary. */
export function isNodeItself(path: string): boolean {
  try {
    const real = realpathSync(path);
    if (basename(real) !== "node") return false;
    const head = Buffer.alloc(2);
    const fd = openSync(real, "r");
    try {
      readSync(fd, head, 0, 2, 0);
    } finally {
      closeSync(fd);
    }
    return head.toString("latin1") !== "#!";
  } catch {
    return false;
  }
}

/** Run node (or the given path) in an interactive login shell, so .zshrc runs too (asdf and nvm are set up there). */
function nodeFromLoginShell(configured: string): string | null {
  const shell = process.env["SHELL"] || "/bin/zsh";
  const program = configured === "" ? "node" : `'${configured.replace(/'/g, `'\\''`)}'`;
  const r = spawnSync(shell, ["-ilc", `${program} -p process.execPath`], {
    encoding: "utf8",
    timeout: 10_000,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const path = (r.stdout ?? "").trim().split(/\r?\n/).at(-1)?.trim() ?? "";
  return path.startsWith("/") && existsSync(path) ? path : null;
}
