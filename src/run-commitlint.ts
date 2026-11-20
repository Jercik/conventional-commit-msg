import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
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

interface CommitlintOptions {
  messageFile?: string | undefined;
  last?: boolean | undefined;
  from?: string | undefined;
  to?: string | undefined;
  stdinMessage?: string | undefined;
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

  let filteredMessages: string[];

  if (options.stdinMessage !== undefined) {
    filteredMessages = [options.stdinMessage];
  } else if (options.messageFile === undefined) {
    const messages = await read({ last: options.last, from: options.from, to: options.to });
    filteredMessages = messages.filter((message) => message.trim() !== "");
  } else {
    // A commit-msg hook receives the message before git's cleanup and cannot see `--cleanup`, so apply git's default `strip` mode.
    const message = cleanUpCommitMessage(
      await readFile(options.messageFile, "utf8"),
      readGitCommentString(),
    );
    filteredMessages = message.trim() === "" ? [] : [message];
  }

  if (filteredMessages.length === 0) {
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
