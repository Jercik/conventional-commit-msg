const scissors = "------------------------ >8 ------------------------";

export function cleanUpCommitMessage(message: string, commentString: string): string {
  const lines = message.split("\n");
  const scissorsIndex = lines.indexOf(`${commentString} ${scissors}`);
  return (scissorsIndex === -1 ? lines : lines.slice(0, scissorsIndex))
    .filter((line) => !line.startsWith(commentString))
    .map((line) => line.trimEnd())
    .join("\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .replace(/^\n+/u, "")
    .replace(/\n+$/u, "");
}
