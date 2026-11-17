// Edits a DTCG token file as text (design#151): the live editor changes one $value, or adds or
// drops one leaf, and leaves every other byte as the author laid it out, so a write-back PR shows
// only what was edited. Biome formats an inserted leaf afterwards (scripts/edit.ts).

type Member = { key: string; keyStart: number; valueStart: number; valueEnd: number };
type Obj = { start: number; end: number; members: Member[] };

const skip = (text: string, i: number) => {
  while (i < text.length && /\s/.test(text[i] ?? "")) i++;
  return i;
};

function expect(text: string, i: number, ch: string) {
  if (text[i] !== ch)
    throw new Error(`json: expected ${ch} at ${i}, found ${text[i] ?? "the end"}`);
}

function stringEnd(text: string, i: number): number {
  expect(text, i, '"');
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === "\\") j++;
    else if (text[j] === '"') return j + 1;
  }
  throw new Error("json: unterminated string");
}

function valueEnd(text: string, i: number): number {
  const c = text[i];
  if (c === '"') return stringEnd(text, i);
  if (c === "{") return objectAt(text, i).end;
  if (c === "[") {
    let j = skip(text, i + 1);
    if (text[j] === "]") return j + 1;
    for (;;) {
      j = skip(text, valueEnd(text, skip(text, j)));
      if (text[j] === "]") return j + 1;
      expect(text, j, ",");
      j++;
    }
  }
  let j = i;
  while (j < text.length && !/[\s,\]}]/.test(text[j] ?? "")) j++;
  if (j === i) throw new Error(`json: no value at ${i}`);
  return j;
}

function objectAt(text: string, start: number): Obj {
  expect(text, start, "{");
  const members: Member[] = [];
  let i = skip(text, start + 1);
  if (text[i] === "}") return { start, end: i + 1, members };
  for (;;) {
    const keyStart = i;
    const keyEnd = stringEnd(text, i);
    i = skip(text, keyEnd);
    expect(text, i, ":");
    const valueStart = skip(text, i + 1);
    const end = valueEnd(text, valueStart);
    members.push({
      key: JSON.parse(text.slice(keyStart, keyEnd)),
      keyStart,
      valueStart,
      valueEnd: end,
    });
    i = skip(text, end);
    if (text[i] === "}") return { start, end: i + 1, members };
    expect(text, i, ",");
    i = skip(text, i + 1);
  }
}

/** The objects along `keys`: as deep as the text goes, with the member that led to each. */
function walk(text: string, keys: string[]) {
  let obj = objectAt(text, skip(text, 0));
  const trail: { obj: Obj; member: Member }[] = [];
  for (const key of keys) {
    const member = obj.members.find((m) => m.key === key);
    if (!member || text[member.valueStart] !== "{") break;
    trail.push({ obj, member });
    obj = objectAt(text, member.valueStart);
  }
  return { obj, trail };
}

/**
 * Sets the leaf at `path` to `value`: its $value replaced in place, or, where the file lacks the
 * leaf, `{ "$type", "$value" }` appended to the deepest group it has.
 */
export function setLeafText(text: string, path: string, value: unknown, type: string): string {
  const keys = path.split(".");
  const { obj, trail } = walk(text, keys);
  if (trail.length === keys.length) {
    const v = obj.members.find((m) => m.key === "$value");
    if (!v) throw new Error(`json: ${path} is a group, not a token`);
    return text.slice(0, v.valueStart) + JSON.stringify(value) + text.slice(v.valueEnd);
  }
  const rest = keys.slice(trail.length);
  const [first, ...inner] = rest;
  if (!first) return text;
  if (obj.members.some((m) => m.key === first)) {
    throw new Error(`json: ${keys.slice(0, trail.length + 1).join(".")} is not a group`);
  }
  let node: unknown = { $type: type, $value: value };
  for (const k of inner.reverse()) node = { [k]: node };
  const member = `${JSON.stringify(first)}: ${JSON.stringify(node)}`;
  const last = obj.members[obj.members.length - 1];
  return last
    ? `${text.slice(0, last.valueEnd)}, ${member}${text.slice(last.valueEnd)}`
    : `${text.slice(0, obj.start + 1)}${member}${text.slice(obj.start + 1)}`;
}

/** Removes the leaf at `path`, and any group it leaves with only $ keys. */
export function dropLeafText(text: string, path: string): string {
  const keys = path.split(".");
  const { trail } = walk(text, keys);
  const step = trail.length === keys.length ? trail[trail.length - 1] : undefined;
  if (!step) return text;
  const { obj, member } = step;
  const i = obj.members.indexOf(member);
  const prev = obj.members[i - 1];
  const next = obj.members[i + 1];
  const out = prev
    ? text.slice(0, prev.valueEnd) + text.slice(member.valueEnd)
    : next
      ? text.slice(0, member.keyStart) + text.slice(next.keyStart)
      : text.slice(0, obj.start + 1) + text.slice(obj.end - 1);
  const parent = keys.slice(0, -1);
  if (!parent.length) return out;
  const left = walk(out, parent);
  return left.trail.length === parent.length && left.obj.members.every((m) => m.key.startsWith("$"))
    ? dropLeafText(out, parent.join("."))
    : out;
}
