# conventional-commit-msg

Source: https://code.j4k.dev/j4k-oss/conventional-commit-msg. github.com/Jercik/conventional-commit-msg is a read-only mirror; open issues and pull requests on the Forge.

Zero-config commitlint frontend for conventional commits.

Validates commit messages against the [Conventional Commits](https://www.conventionalcommits.org/) specification using [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).

## Installation

The package is published only as `@j4k-oss/conventional-commit-msg` on the `code.j4k.dev` registry, which reads anonymously. The unscoped `conventional-commit-msg` on npmjs.org is deprecated and gets no updates.

Without a registry mapping, a bare `@j4k-oss/...` command looks on npmjs.org, finds nothing, and fails with a 404. Map the scope to `code.j4k.dev` once in `~/.npmrc`:

```ini
@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/
```

The commands below also pass the registry as a flag, which is enough for a single `npx` run. Keep the `~/.npmrc` line for global installs: `npm update -g` and `npm outdated -g` read the registry from the configuration, and without the line they look the scoped name up on npmjs.org.

If you installed the unscoped package globally, remove it first with `npm uninstall -g conventional-commit-msg`. Both packages provide the `conventional-commit-msg` command, and `npm install -g` stops with `EEXIST` while the old copy is there.

Install the command globally:

```bash
npm install -g --@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/ @j4k-oss/conventional-commit-msg
```

Or run it once without installing:

```bash
npx -y --@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/ @j4k-oss/conventional-commit-msg@latest --last
```

In a pnpm project, map the scope and exempt it from `minimumReleaseAge` in `pnpm-workspace.yaml`, then add the package:

```yaml
registries:
  "@j4k-oss": https://code.j4k.dev/api/packages/j4k-oss/npm/
minimumReleaseAgeExclude:
  - "@j4k-oss/*"
```

```bash
pnpm add -D @j4k-oss/conventional-commit-msg
```

The package installs the `conventional-commit-msg` command, which the examples below run. After a pnpm project install, run it as `pnpm exec conventional-commit-msg`.

## Quick Start: Git Hook

1. Create `.githooks/commit-msg`:

```bash
#!/bin/sh
npm exec --yes --@j4k-oss:registry=https://code.j4k.dev/api/packages/j4k-oss/npm/ --package=@j4k-oss/conventional-commit-msg@latest -- conventional-commit-msg "$1"
```

`npm exec --package=…@latest` (not `npx -y`) keeps the hook working when an
`npm_config_package` env var is inherited (some tool wrappers set it) and when
the hook runs inside this package's own repository, where the local package name
would otherwise shadow the published binary. The inline registry flag keeps the hook working for teammates who have not edited `~/.npmrc`.

2. Make it executable and enable the hooks directory:

```bash
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
```

Now every commit message will be validated automatically.

## Usage

```bash
# Validate last commit
conventional-commit-msg --last

# CI mode: validate PR commits
conventional-commit-msg --from origin/main --to HEAD

# Read commit message from stdin
echo "feat: add feature" | conventional-commit-msg

# Validate commit message file
conventional-commit-msg .git/COMMIT_EDITMSG

# Verbose mode: show output even on success
conventional-commit-msg --last --verbose
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
# Check if last commit is valid, exit 1 if not (for CI scripts)
conventional-commit-msg --last && echo "Valid" || { echo "Invalid"; exit 1; }

# Validate message from a file (silent on success, shows errors)
cat .git/COMMIT_EDITMSG | conventional-commit-msg

# Validate multiple messages from a file (one per line)
while IFS= read -r msg; do
  echo "$msg" | conventional-commit-msg || echo "Invalid: $msg"
done < messages.txt
```

## License

MIT
