import { fileURLToPath } from "node:url";

import format from "@commitlint/format";
import lint from "@commitlint/lint";
import load from "@commitlint/load";
import read from "@commitlint/read";
import type { LintOptions, LintOutcome } from "@commitlint/types";

// Resolve config path absolutely to work regardless of cwd.
// This is necessary because @commitlint/load resolves extends relative to cwd,
// but when running via npx from a different directory, the config won't be found.
const configConventionalPath = fileURLToPath(
  import.meta.resolve("@commitlint/config-conventional"),
);

interface CommitlintOptions {
  edit?: string | undefined;
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
 * Returns exit code: 0 for success, 1 for validation errors.
 */
export async function runCommitlint(
  options: CommitlintOptions,
): Promise<number> {
  const loaded = await load({ extends: [configConventionalPath] });

  // Use stdin message if provided, otherwise read from other sources
  let filteredMessages: string[];

  if (options.stdinMessage === undefined) {
    const messages = await read({
      edit: options.edit,
      last: options.last,
      from: options.from,
      to: options.to,
    });

    filteredMessages = messages.filter(
      (message): message is string =>
        typeof message === "string" && message.trim() !== "",
    );
  } else {
    filteredMessages = [options.stdinMessage];
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
