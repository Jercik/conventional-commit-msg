import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runCommitlint } from "./run-commitlint.js";

describe("runCommitlint", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), "test-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("returns 0 for valid conventional commit message", async () => {
    const messageFile = path.join(temporaryDirectory, "COMMIT_EDITMSG");
    await writeFile(messageFile, "feat: add new feature\n");

    const exitCode = await runCommitlint({ source: { kind: "file", path: messageFile } });

    expect(exitCode).toBe(0);
  });

  it("returns 1 for invalid commit message", async () => {
    const messageFile = path.join(temporaryDirectory, "COMMIT_EDITMSG");
    await writeFile(messageFile, "invalid commit message\n");

    const exitCode = await runCommitlint({ source: { kind: "file", path: messageFile } });

    expect(exitCode).toBe(1);
  });

  it("returns 2 when the message file is missing", async () => {
    const exitCode = await runCommitlint({
      source: { kind: "file", path: path.join(temporaryDirectory, "COMMIT_EDITMSG") },
    });

    expect(exitCode).toBe(2);
  });

  it("reads a relative message file from the current directory, not the repository root", async () => {
    execFileSync("git", ["init", "-q"], { cwd: temporaryDirectory, env: environmentWithoutGit() });
    await writeFile(path.join(temporaryDirectory, "COMMIT_EDITMSG"), "invalid commit message\n");
    const subdirectory = path.join(temporaryDirectory, "packages", "app");
    await mkdir(subdirectory, { recursive: true });
    await writeFile(path.join(subdirectory, "COMMIT_EDITMSG"), "feat: add new feature\n");

    const exitCode = await runInDirectory(subdirectory, () =>
      runCommitlint({ source: { kind: "file", path: "COMMIT_EDITMSG" } }),
    );

    expect(exitCode).toBe(0);
  });

  it("reads a message file outside any git repository", async () => {
    await writeFile(path.join(temporaryDirectory, "COMMIT_EDITMSG"), "feat: add new feature\n");

    const exitCode = await runInDirectory(temporaryDirectory, () =>
      runCommitlint({ source: { kind: "file", path: "COMMIT_EDITMSG" } }),
    );

    expect(exitCode).toBe(0);
  });

  it("ignores a commitlint config in the current directory", async () => {
    await writeFile(
      path.join(temporaryDirectory, ".commitlintrc.json"),
      JSON.stringify({ rules: { "type-enum": [0], "type-empty": [0], "subject-empty": [0] } }),
    );
    await writeFile(path.join(temporaryDirectory, "COMMIT_EDITMSG"), "invalid commit message\n");

    const exitCode = await runInDirectory(temporaryDirectory, () =>
      runCommitlint({ source: { kind: "file", path: "COMMIT_EDITMSG" } }),
    );

    expect(exitCode).toBe(1);
  });

  it("ignores the comment lines of a squash template", async () => {
    const messageFile = path.join(temporaryDirectory, "COMMIT_EDITMSG");
    await writeFile(
      messageFile,
      [
        "# This is a combination of 2 commits.",
        "# This is the 1st commit message:",
        "",
        "feat: add login form",
        "",
        "# This is the commit message #2:",
        "",
        "fix: correct label typo",
        "",
      ].join("\n"),
    );

    const exitCode = await runCommitlint({ source: { kind: "file", path: messageFile } });

    expect(exitCode).toBe(0);
  });

  it("ignores everything below the scissors line of a verbose commit", async () => {
    const messageFile = path.join(temporaryDirectory, "COMMIT_EDITMSG");
    await writeFile(
      messageFile,
      [
        "feat: add login form",
        "",
        "# ------------------------ >8 ------------------------",
        "# Do not modify or remove the line above.",
        "# Everything below it will be ignored.",
        "diff --git a/login.html b/login.html",
        '+<form class="login-form login-form--wide login-form--bordered" method="post" action="/session/new" autocomplete="on">',
        "",
      ].join("\n"),
    );

    const exitCode = await runCommitlint({ source: { kind: "file", path: messageFile } });

    expect(exitCode).toBe(0);
  });

  it.each([
    { message: "feat: add new feature\n", expected: 0 },
    { message: "  feat: add new feature\n", expected: 1 },
  ])("lints piped message $message as given", async ({ message, expected }) => {
    vi.spyOn(process, "stdin", "get").mockReturnValue(
      Readable.from([message]) as typeof process.stdin,
    );

    const exitCode = await runCommitlint({ source: { kind: "stdin" } });

    expect(exitCode).toBe(expected);
  });

  it("validates using --last flag", async () => {
    // The pre-commit hook runs tests in a snapshot repository whose only commit is not conventional, so build the repository this test reads.
    const git = (...args: string[]) =>
      execFileSync(
        "git",
        [
          "-c",
          "commit.gpgsign=false",
          "-c",
          "user.name=Test",
          "-c",
          "user.email=test@example.com",
          ...args,
        ],
        { cwd: temporaryDirectory, env: environmentWithoutGit(), stdio: "ignore" },
      );
    git("init");
    git("commit", "--allow-empty", "-m", "feat: add new feature");

    const exitCode = await runInDirectory(temporaryDirectory, () =>
      runCommitlint({ source: { kind: "last" } }),
    );

    expect(exitCode).toBe(0);
  });
});

function environmentWithoutGit(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
  );
}

async function runInDirectory<T>(directory: string, run: () => Promise<T>): Promise<T> {
  const originalDirectory = process.cwd();
  process.chdir(directory);
  try {
    return await run();
  } finally {
    process.chdir(originalDirectory);
  }
}
