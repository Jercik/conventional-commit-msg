import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };

export function createProgram() {
  return new Command()
    .name("conventional-commit-msg")
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
    );
}
