import { describe, expect, it } from "vitest";

import { createProgram } from "./create-program.js";

describe("createProgram", () => {
  it("names the installed command in the usage line", () => {
    const usageLine = createProgram().helpInformation().split("\n")[0];

    expect(usageLine).toBe("Usage: conventional-commit-msg [options] [file]");
  });
});
