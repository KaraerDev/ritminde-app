export type ParsedPlannerTask = { title: string; timeConstraint?: string };
type TimeMatch = { start: number; end: number; timeConstraint: string };

const CLOCK_PATTERNS = [
  /\b(?:saat\s*)?(2[0-3]|1\d|0?\d)\s*[:.]\s*([0-5]\d)(?:\s*['’]?\s*(?:de|da|te|ta))?\b/giu,
  /\b(?:saat\s*)?(2[0-3]|1\d|0?\d)\s*['’]?\s*(?:de|da|te|ta)\b/giu,
  /\bsaat\s+(2[0-3]|1\d|0?\d)\b/giu,
  /\b(2[0-3]|1\d|0?\d)\s+buçuk(?:ta|te|da|de)?\b/giu,
];

function clockMatches(text: string): TimeMatch[] {
  const found: TimeMatch[] = [];
  for (const pattern of CLOCK_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const hour = Number(match[1]);
      const minutes = pattern === CLOCK_PATTERNS[0] ? Number(match[2]) : pattern === CLOCK_PATTERNS[3] ? 30 : 0;
      if (hour > 23 || minutes > 59) continue;
      found.push({ start: match.index, end: match.index + match[0].length, timeConstraint: `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` });
    }
  }
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  return found.filter((match, index) => index === 0 || match.start >= found[index - 1].end);
}

function cleanTitle(value: string, times: TimeMatch[]): string {
  let title = value;
  for (const match of [...times].sort((a, b) => b.start - a.start)) {
    title = title.slice(0, match.start) + " " + title.slice(match.end);
  }
  return title
    .replace(/\b(?:bugün|bugünün|bugun)\b/giu, " ")
    .replace(/\b(?:saat)\b/giu, " ")
    .replace(/^\s*(?:(?:ve\s+)?(?:daha\s+)?(?:sonra(?:sında)?|ardından|akabinde)\s*)+/iu, "")
    .replace(/(?:\s+)(?:ve|and|daha|sonra|sonrasında|ardından|akabinde)\s*$/iu, "")
    .replace(/\b(?:var|olacak)\s*$/iu, "")
    .replace(/^[\s\d•*\-–—,;:]+|[\s.!?,;:]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitClauses(input: string): string[] {
  return input
    .replace(/[!?]+/gu, "\n")
    .split(/[\n;,]+|\.(?!\d)|\b(?:ve\s+)?(?:daha\s+sonrasında|daha\s+sonra|sonrasında|sonra|ardından|akabinde)\b/giu)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parsePlannerInput(input: string, limit = 8): ParsedPlannerTask[] {
  const parsed: ParsedPlannerTask[] = [];
  for (const clause of splitClauses(input)) {
    const matches = clockMatches(clause);
    if (!matches.length) {
      const title = cleanTitle(clause, []);
      if (title) parsed.push({ title });
      continue;
    }

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const start = index === 0 ? 0 : match.start;
      const end = matches[index + 1]?.start ?? clause.length;
      const segment = clause.slice(start, end);
      const localTime = [{ ...match, start: match.start - start, end: match.end - start }];
      const title = cleanTitle(segment, localTime);
      if (title) parsed.push({ title, timeConstraint: match.timeConstraint });
    }
  }
  return parsed.slice(0, Math.max(0, limit));
}

export function splitVoiceTasks(text: string): string[] {
  return parsePlannerInput(text).map((task) => task.title);
}
