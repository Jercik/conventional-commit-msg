#!/usr/bin/env node
/**
 * conventional-commit-msg - Zero-config conventional commits linter.
 */

import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };

import { runCommitlint } from "./run-commitlint.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString().trim();
}

const program = new Command()
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .showHelpAfterError("(add --help for additional information)")
  .showSuggestionAfterError()
  .argument("[file]", "commit message file (git hook mode)")
  .option("--last", "validate the last commit")
  .option("--from <sha>", "start of commit range (CI mode)")
  .option("--to <sha>", "end of commit range (CI mode)")
  .option("-v, --verbose", "show output on success")
  .addHelpText(
    "after",
    `
Examples:
  # Git hook mode (in .git/hooks/commit-msg)
  conventional-commit-msg $1

  # Validate last commit
  conventional-commit-msg --last

  # CI mode: validate PR commits
  conventional-commit-msg --from origin/main --to HEAD

  # Read commit message from stdin
  echo "feat: add feature" | conventional-commit-msg

  # Validate commit message file
  conventional-commit-msg .git/COMMIT_EDITMSG
`,
  )
  .action(async (file, options) => {
    const hasPipedInput = !process.stdin.isTTY;
    const hasValidationTarget =
      file !== undefined || options.last === true || options.from !== undefined || hasPipedInput;

    if (!hasValidationTarget) {
      program.error("Missing validation target. Provide a file, --last, --from, or pipe input.");
    }

    // Read from stdin if piped and no other input source
    let stdinMessage: string | undefined;
    if (hasPipedInput && file === undefined && !options.last && !options.from) {
      stdinMessage = await readStdin();
      if (stdinMessage === "") {
        program.error("No commit message provided via stdin.");
      }
    }

    const exitCode = await runCommitlint({
      edit: file,
      last: options.last,
      from: options.from,
      to: options.to,
      stdinMessage,
      verbose: options.verbose,
    });

    process.exit(exitCode);
  });

await program.parseAsync(process.argv);
