
interface FieldSpec {
  min: number;
  max: number;
  names?: Record<string, number>;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function nameMap(names: string[], offset: number): Record<string, number> {
  return Object.fromEntries(names.map((n, i) => [n, i + offset]));
}

const FIELDS: FieldSpec[] = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12, names: nameMap(MONTHS, 1) },
  // 0 and 7 both mean sunday, which is why day-of-week maxes at 7 rather than 6.
  { min: 0, max: 7, names: nameMap(DAYS, 0) },
];

function parseValue(raw: string, field: FieldSpec): number | null {
  const key = raw.toLowerCase();
  if (field.names && key in field.names) return field.names[key] as number;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= field.min && n <= field.max ? n : null;
}

// one comma-separated term: *, a, a-b, and any of those with /step.
function isValidTerm(term: string, field: FieldSpec): boolean {
  if (term.length === 0) return false;

  const [range, step, ...extra] = term.split("/");
  if (extra.length > 0 || range === undefined) return false;

  if (step !== undefined) {
    if (!/^\d+$/.test(step) || Number(step) < 1) return false;
  }

  if (range === "*") return true;

  const bounds = range.split("-");
  if (bounds.length === 1) {
    return parseValue(bounds[0] as string, field) !== null;
  }
  if (bounds.length === 2) {
    const start = parseValue(bounds[0] as string, field);
    const end = parseValue(bounds[1] as string, field);
    return start !== null && end !== null && start <= end;
  }
  return false;
}

export function isValidCron(expression: string): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== FIELDS.length) return false;
  return fields.every((raw, i) =>
    raw.split(",").every((term) => isValidTerm(term, FIELDS[i] as FieldSpec)),
  );
}

export function describeCron(expression: string): string {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return expression;
  const [minute, hour, dom, month, dow] = fields as [string, string, string, string, string];

  const everyDate = dom === "*" && month === "*" && dow === "*";

  if (everyDate && minute === "0" && hour === "*") return "Every hour";
  if (everyDate && minute === "*" && hour === "*") return "Every minute";

  const stepHour = /^\*\/(\d+)$/.exec(hour);
  if (everyDate && minute === "0" && stepHour) return `Every ${stepHour[1]} hours`;

  const stepMinute = /^\*\/(\d+)$/.exec(minute);
  if (everyDate && hour === "*" && stepMinute) return `Every ${stepMinute[1]} minutes`;

  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    const at = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    if (everyDate) return `Daily at ${at}`;
    if (dom === "*" && month === "*" && /^\d$/.test(dow)) {
      const day = DAYS[Number(dow) % 7] as string;
      return `Weekly on ${day.charAt(0).toUpperCase()}${day.slice(1)} at ${at}`;
    }
    if (/^\d+$/.test(dom) && month === "*" && dow === "*") {
      return `Monthly on day ${dom} at ${at}`;
    }
  }

  return expression;
}
