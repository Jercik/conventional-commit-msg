import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCommitlint } from "./run-commitlint.js";

describe("runCommitlint", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), "test-"));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("returns 0 for valid conventional commit message", async () => {
    const messageFile = path.join(temporaryDirectory, "COMMIT_EDITMSG");
    await writeFile(messageFile, "feat: add new feature\n");

    const exitCode = await runCommitlint({ edit: messageFile });

    expect(exitCode).toBe(0);
  });

  it("returns non-zero for invalid commit message", async () => {
    const messageFile = path.join(temporaryDirectory, "COMMIT_EDITMSG");
    await writeFile(messageFile, "invalid commit message\n");

    const exitCode = await runCommitlint({ edit: messageFile });

    expect(exitCode).not.toBe(0);
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

    const exitCode = await runCommitlint({ edit: messageFile });

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

    const exitCode = await runCommitlint({ edit: messageFile });

    expect(exitCode).toBe(0);
  });

  it("validates using --last flag", async () => {
    // The pre-commit hook runs tests in a snapshot repository whose only commit is not conventional, so build the repository this test reads.
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
    );
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
        { cwd: temporaryDirectory, env: environment, stdio: "ignore" },
      );
    git("init");
    git("commit", "--allow-empty", "-m", "feat: add new feature");

    const originalDirectory = process.cwd();
    process.chdir(temporaryDirectory);
    try {
      const exitCode = await runCommitlint({ last: true });

      expect(exitCode).toBe(0);
    } finally {
      process.chdir(originalDirectory);
    }
  });
});
