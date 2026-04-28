export function printBanner(title: string): void {
  const line = "=".repeat(72);
  console.log(line);
  console.log(title);
  console.log(line);
}

export function printSection(title: string): void {
  console.log(`\n[${title}]`);
}

export function printField(
  label: string,
  value: string | number | bigint | boolean,
): void {
  console.log(`${label.padEnd(18, " ")}: ${value}`);
}

export function printStatus(
  status: "SUCCESS" | "ERROR" | "INFO" | "WARN",
  message: string,
): void {
  console.log(`[${status}] ${message}`);
}

export function printHint(message: string): void {
  console.log(`提示               : ${message}`);
}

export function formatTimestamp(timestamp: bigint | number): string {
  const timestampNumber =
    typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(timestampNumber * 1000).toLocaleString("zh-CN", {
    hour12: false,
  });
}

export function formatLocalDate(dateLike: string): string {
  return new Date(dateLike).toLocaleString("zh-CN", {
    hour12: false,
  });
}

export function formatAssetStatus(status: bigint | number): string {
  return Number(status) === 1 ? "Revoked" : "Active";
}

export function formatErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const maybeShortMessage = Reflect.get(error, "shortMessage");
    if (typeof maybeShortMessage === "string" && maybeShortMessage.length > 0) {
      return maybeShortMessage;
    }

    const maybeMessage = Reflect.get(error, "message");
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
