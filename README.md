# conventional-commit-msg

Zero-config commitlint frontend for conventional commits.

Validates commit messages against the [Conventional Commits](https://www.conventionalcommits.org/) specification using [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).

## Quick Start: Git Hook

1. Create `.githooks/commit-msg`:

```bash
#!/bin/sh
npx -y conventional-commit-msg "$1"
```

2. Make it executable and enable the hooks directory:

```bash
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
```

Now every commit message will be validated automatically.

## Usage

```bash
# Validate last commit
npx -y conventional-commit-msg --last

# CI mode: validate PR commits
npx -y conventional-commit-msg --from origin/main --to HEAD

# Read commit message from stdin
echo "feat: add feature" | npx -y conventional-commit-msg

# Validate commit message file
npx -y conventional-commit-msg .git/COMMIT_EDITMSG

# Verbose mode: show output even on success
npx -y conventional-commit-msg --last --verbose
```

## Options

| Option          | Description                         |
| --------------- | ----------------------------------- |
| `<file>`        | Commit message file (git hook mode) |
| `--last`        | Validate the last commit            |
| `--from <sha>`  | Start of commit range (CI mode)     |
| `--to <sha>`    | End of commit range (CI mode)       |
| `-v, --verbose` | Show output on success              |
| `-V, --version` | Output the version number           |
| `-h, --help`    | Display help for command            |

## Pipeline Examples

```bash
# Check if last commit is valid (for CI scripts)
npx -y conventional-commit-msg --last && echo "Valid" || echo "Invalid"

# Validate message from a file (silent on success, shows errors)
cat .git/COMMIT_EDITMSG | npx -y conventional-commit-msg

# Validate multiple messages from a file (one per line)
while IFS= read -r msg; do
  echo "$msg" | npx -y conventional-commit-msg || echo "Invalid: $msg"
done < messages.txt
```

## License

MIT
