export function parseNamedArgs(argv: string[]): Record<string, string> {
  const parsedArgs: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsedArgs[key] = "true";
      continue;
    }

    parsedArgs[key] = next;
    index += 1;
  }

  return parsedArgs;
}
