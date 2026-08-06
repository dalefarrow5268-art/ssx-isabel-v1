export type IsabelViseme = "rest" | "closed" | "open" | "wide" | "round";

export type IsabelVisemeCue = {
  viseme: IsabelViseme;
  startMs: number;
  durationMs: number;
  strength: number;
};

const ROUND = /[ouqw]/i;
const WIDE = /[eiy]/i;
const OPEN = /[a]/i;
const CLOSED = /[bmpfvw]/i;
const PAUSE = /[,.!?;:]/;

function classify(character: string): IsabelViseme {
  if (PAUSE.test(character)) return "rest";
  if (CLOSED.test(character)) return "closed";
  if (ROUND.test(character)) return "round";
  if (WIDE.test(character)) return "wide";
  if (OPEN.test(character)) return "open";
  if (/[a-z]/i.test(character)) return "open";
  return "rest";
}

export function buildVisemeTimeline(text: string, rate = 1): IsabelVisemeCue[] {
  const normalizedRate = Math.max(0.6, Math.min(1.4, rate));
  const baseMs = 88 / normalizedRate;
  const cues: IsabelVisemeCue[] = [];
  let cursor = 0;
  let previous: IsabelViseme = "rest";

  for (const character of text) {
    if (/\s/.test(character)) {
      cursor += baseMs * 0.55;
      previous = "rest";
      continue;
    }

    const viseme = classify(character);
    const punctuation = PAUSE.test(character);
    const durationMs = punctuation ? baseMs * 2.1 : baseMs;
    const strength = viseme === "rest" ? 0 : viseme === "closed" ? 0.28 : viseme === "round" ? 0.72 : viseme === "wide" ? 0.78 : 0.92;

    if (viseme !== previous || punctuation) {
      cues.push({ viseme, startMs: cursor, durationMs, strength });
      previous = viseme;
    } else {
      const last = cues[cues.length - 1];
      if (last) last.durationMs += durationMs;
    }

    cursor += durationMs;
  }

  cues.push({ viseme: "rest", startMs: cursor, durationMs: 120, strength: 0 });
  return cues;
}

export function cueAt(timeline: IsabelVisemeCue[], elapsedMs: number): IsabelVisemeCue {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    if (elapsedMs >= timeline[index].startMs) return timeline[index];
  }
  return { viseme: "rest", startMs: 0, durationMs: 120, strength: 0 };
}
