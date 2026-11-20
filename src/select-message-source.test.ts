import { describe, expect, it } from "vitest";

import { selectMessageSource } from "./select-message-source.js";

const noOptions = { last: undefined, from: undefined, to: undefined };

describe("selectMessageSource", () => {
  it.each([
    {
      name: "a message file",
      file: "COMMIT_EDITMSG",
      options: noOptions,
      expected: { kind: "file", path: "COMMIT_EDITMSG" },
    },
    {
      name: "--last",
      file: undefined,
      options: { ...noOptions, last: true as const },
      expected: { kind: "last" },
    },
    {
      name: "--from with --to",
      file: undefined,
      options: { ...noOptions, from: "origin/main", to: "HEAD" },
      expected: { kind: "range", from: "origin/main", to: "HEAD" },
    },
    {
      name: "--from alone",
      file: undefined,
      options: { ...noOptions, from: "origin/main" },
      expected: { kind: "range", from: "origin/main", to: undefined },
    },
  ])("selects $name even when stdin is not a terminal", ({ file, options, expected }) => {
    expect(selectMessageSource(file, options, false)).toStrictEqual({ ok: true, value: expected });
  });

  it("reads stdin when no other source is given and stdin is not a terminal", () => {
    expect(selectMessageSource(undefined, noOptions, false)).toStrictEqual({
      ok: true,
      value: { kind: "stdin" },
    });
  });

  it.each([
    {
      name: "--last with --from and --to",
      file: undefined,
      options: { last: true as const, from: "origin/main", to: "HEAD" },
      error: "Give one message source, not --last and --from.",
    },
    {
      name: "a message file with --last",
      file: "COMMIT_EDITMSG",
      options: { ...noOptions, last: true as const },
      error: "Give one message source, not a message file and --last.",
    },
    {
      name: "a message file with --from",
      file: "COMMIT_EDITMSG",
      options: { ...noOptions, from: "origin/main" },
      error: "Give one message source, not a message file and --from.",
    },
    {
      name: "--to without --from",
      file: undefined,
      options: { ...noOptions, to: "HEAD" },
      error: "--to ends a range and needs --from to start it.",
    },
    {
      name: "--last with --to",
      file: undefined,
      options: { ...noOptions, last: true as const, to: "HEAD" },
      error: "--to ends a range and needs --from to start it.",
    },
  ])("rejects $name", ({ file, options, error }) => {
    expect(selectMessageSource(file, options, false)).toStrictEqual({ ok: false, error });
  });

  it("rejects no source when stdin is a terminal", () => {
    expect(selectMessageSource(undefined, noOptions, true)).toStrictEqual({
      ok: false,
      error: "Missing validation target. Provide a file, --last, --from, or pipe input.",
    });
  });
});
