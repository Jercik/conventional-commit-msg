import { describe, expect, it } from "vitest";

import { cleanUpCommitMessage } from "./clean-up-commit-message.js";

describe("cleanUpCommitMessage", () => {
  it.each([
    {
      case: "drops comment lines and the blank lines they leave",
      message:
        "# This is a combination of 2 commits.\n# This is the 1st commit message:\n\nfeat: add login form\n\n# This is the commit message #2:\n\nfix: correct label typo\n",
      commentString: "#",
      expected: "feat: add login form\n\nfix: correct label typo",
    },
    {
      case: "drops everything from the scissors line on",
      message:
        "feat: add login form\n\n# ------------------------ >8 ------------------------\ndiff --git a/login.html b/login.html\n+<form>\n",
      commentString: "#",
      expected: "feat: add login form",
    },
    {
      case: "uses the configured comment string",
      message:
        "feat: add login form\n\n#1 keeps the issue reference\n; Please enter the commit message.\n; ------------------------ >8 ------------------------\n+<form>\n",
      commentString: ";",
      expected: "feat: add login form\n\n#1 keeps the issue reference",
    },
    {
      case: "strips trailing whitespace and keeps indentation",
      message: "feat: add login form  \n\n  - one\t\n",
      commentString: "#",
      expected: "feat: add login form\n\n  - one",
    },
  ])("$case", ({ message, commentString, expected }) => {
    expect(cleanUpCommitMessage(message, commentString)).toBe(expected);
  });
});
