import type { MessageSource } from "./run-commitlint.js";

type SelectionResult = { ok: true; value: MessageSource } | { ok: false; error: string };

interface SourceOptions {
  last: true | undefined;
  from: string | undefined;
  to: string | undefined;
}

export function selectMessageSource(
  file: string | undefined,
  options: SourceOptions,
  stdinIsTerminal: boolean,
): SelectionResult {
  if (file === "") {
    return { ok: false, error: "The message file path is empty." };
  }
  if (options.from === "") {
    return { ok: false, error: "--from needs a commit, not an empty value." };
  }
  if (options.to === "") {
    return { ok: false, error: "--to needs a commit, not an empty value." };
  }

  const chosen: string[] = [];
  if (file !== undefined) {
    chosen.push("a message file");
  }
  if (options.last === true) {
    chosen.push("--last");
  }
  if (options.from !== undefined) {
    chosen.push("--from");
  }
  if (chosen.length > 1) {
    return { ok: false, error: `Give one message source, not ${chosen.join(" and ")}.` };
  }
  if (options.to !== undefined && options.from === undefined) {
    return { ok: false, error: "--to ends a range and needs --from to start it." };
  }

  if (file !== undefined) {
    return { ok: true, value: { kind: "file", path: file } };
  }
  if (options.last === true) {
    return { ok: true, value: { kind: "last" } };
  }
  if (options.from !== undefined) {
    return { ok: true, value: { kind: "range", from: options.from, to: options.to } };
  }
  if (!stdinIsTerminal) {
    return { ok: true, value: { kind: "stdin" } };
  }
  return {
    ok: false,
    error: "Missing validation target. Provide a file, --last, --from, or pipe input.",
  };
}
