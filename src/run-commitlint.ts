import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { text } from "node:stream/consumers";
import { fileURLToPath } from "node:url";

import format from "@commitlint/format";
import lint from "@commitlint/lint";
import load from "@commitlint/load";
import read from "@commitlint/read";
import type { LintOptions, LintOutcome } from "@commitlint/types";

import { cleanUpCommitMessage } from "./clean-up-commit-message.js";

// Loading this file by path keeps commitlint from searching cwd, its ancestors and the global config directory for a config to merge in.
const configConventionalPath = fileURLToPath(
  import.meta.resolve("@commitlint/config-conventional"),
);

export type MessageSource =
  | { kind: "file"; path: string }
  | { kind: "last" }
  | { kind: "range"; from: string; to: string | undefined }
  | { kind: "stdin" };

interface CommitlintOptions {
  source: MessageSource;
  verbose?: boolean | undefined;
}

interface LintReport {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  results: LintOutcome[];
}

/**
 * Validates commit messages using commitlint with config-conventional.
 */
export async function runCommitlint(options: CommitlintOptions): Promise<number> {
  try {
    return await lintCommitMessages(options);
  } catch (error) {
    console.error(
      `conventional-commit-msg: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 2;
  }
}

async function lintCommitMessages(options: CommitlintOptions): Promise<number> {
  const loaded = await load({}, { file: configConventionalPath });

  const messages = await readMessages(options.source);
  const filteredMessages = messages.filter((message) => message.trim() !== "");

  // A range can hold no commits, as on a branch with nothing beyond its base, and then nothing in it breaks the convention.
  if (filteredMessages.length === 0 && options.source.kind !== "range") {
    console.error("No commit messages found to validate");
    return 1;
  }

  const lintOptions: LintOptions = {
    parserOpts: loaded.parserPreset?.parserOpts as LintOptions["parserOpts"],
    plugins: loaded.plugins,
    ignores: loaded.ignores,
    defaultIgnores: loaded.defaultIgnores,
  };

  const results = await Promise.all(
    filteredMessages.map((message) => lint(message, loaded.rules, lintOptions)),
  );

  const report = buildReport(results);

  // Silent on success by default (Unix philosophy: rule of silence)
  // Show output on errors or when verbose mode is enabled
  if (!report.valid || options.verbose === true) {
    const output = format(report, { verbose: true });
    if (output !== "") {
      console.log(output);
    }
  }

  return report.valid ? 0 : 1;
}

async function readMessages(source: MessageSource): Promise<string[]> {
  switch (source.kind) {
    case "file": {
      // A commit-msg hook receives the message before git's cleanup and cannot see `--cleanup`, so apply git's default `strip` mode.
      return [cleanUpCommitMessage(await readFile(source.path, "utf8"), readGitCommentString())];
    }
    case "last": {
      return [readLastCommitMessage()];
    }
    case "range": {
      return read({ from: source.from, to: source.to });
    }
    case "stdin": {
      return [await text(process.stdin)];
    }
    default: {
      return source satisfies never;
    }
  }
}

// @commitlint/read ignores the exit status of `git log`, so a failed run, such as on a branch with no commits, would look like an empty message.
function readLastCommitMessage(): string {
  const result = spawnSync("git", ["log", "-1", "--format=%B"], { encoding: "utf8" });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`git log failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function readGitCommentString(): string {
  const result = spawnSync(
    "git",
    ["config", "--null", "--get-regexp", String.raw`^core\.comment(char|string)$`],
    { encoding: "utf8" },
  );
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status === 1) {
    return "#";
  }
  if (result.status !== 0) {
    throw new Error(`git config failed: ${result.stderr.trim()}`);
  }
  // core.commentChar and core.commentString name one setting, and the last entry wins.
  const lastEntry = result.stdout.split("\0").findLast((entry) => entry !== "") ?? "";
  const value = lastEntry.slice(lastEntry.indexOf("\n") + 1);
  if (value === "auto") {
    throw new Error(
      "core.commentChar=auto is not supported: set core.commentChar to the character git uses for comments",
    );
  }
  return value;
}

function buildReport(results: LintOutcome[]): LintReport {
  const report: LintReport = {
    valid: true,
    errorCount: 0,
    warningCount: 0,
    results: [],
  };

  for (const result of results) {
    if (!result.valid) {
      report.valid = false;
    }
    report.errorCount += result.errors.length;
    report.warningCount += result.warnings.length;
    report.results.push(result);
  }

  return report;
}
