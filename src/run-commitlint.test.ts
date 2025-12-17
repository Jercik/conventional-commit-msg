import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

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

  it("validates using --last flag", async () => {
    // This test validates the last commit in this repo (which should be valid)
    const exitCode = await runCommitlint({ last: true });

    expect(exitCode).toBe(0);
  });
});
