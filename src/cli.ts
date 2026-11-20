#!/usr/bin/env node
/**
 * conventional-commit-msg - Zero-config conventional commits linter.
 */

import { createProgram } from "./create-program.js";
import { runCommitlint } from "./run-commitlint.js";
import { selectMessageSource } from "./select-message-source.js";

const program = createProgram().action(async (file, options) => {
  const selection = selectMessageSource(
    file,
    { last: options.last, from: options.from, to: options.to },
    process.stdin.isTTY,
  );
  if (!selection.ok) {
    program.error(selection.error);
    return;
  }

  const exitCode = await runCommitlint({ source: selection.value, verbose: options.verbose });

  process.exit(exitCode);
});

await program.parseAsync(process.argv);
