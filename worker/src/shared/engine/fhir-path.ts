
// NOT a full FHIRPath engine: only dotted segments with optional [n] indices
interface Step {
  key: string;
  index?: number;
}

function parsePath(path: string): Step[] {
  return path
    .split(".")
    .map((seg) => {
      const m = seg.match(/^([A-Za-z_][\w]*)(?:\[(\d+)\])?$/);
      if (!m) return null;
      const key = m[1] as string;
      return m[2] !== undefined ? { key, index: Number(m[2]) } : { key };
    })
    .filter((s): s is Step => s !== null);
}

export function resolveParent(
  resource: unknown,
  path: string,
): { parent: Record<string, unknown> | undefined; key: string; index?: number } {
  const steps = parsePath(path);
  if (steps.length === 0) return { parent: undefined, key: "" };
  // drop the leading resourceType step.
  const [, ...rest] = steps;
  if (rest.length === 0) return { parent: undefined, key: "" };

  let current: unknown = resource;
  for (let i = 0; i < rest.length - 1; i++) {
    const step = rest[i];
    if (step === undefined || current == null || typeof current !== "object") {
      return { parent: undefined, key: "" };
    }
    let next = (current as Record<string, unknown>)[step.key];
    if (step.index !== undefined) {
      if (!Array.isArray(next)) return { parent: undefined, key: "" };
      next = next[step.index];
    }
    current = next;
  }
  const last = rest[rest.length - 1];
  if (last === undefined || current == null || typeof current !== "object") {
    return { parent: undefined, key: "" };
  }
  return { parent: current as Record<string, unknown>, key: last.key, index: last.index };
}

export function getAtPath(resource: unknown, path: string): unknown {
  const { parent, key, index } = resolveParent(resource, path);
  if (!parent) return undefined;
  const value = parent[key];
  return index !== undefined && Array.isArray(value) ? value[index] : value;
}

export function setAtPath(resource: unknown, path: string, value: unknown): boolean {
  const { parent, key, index } = resolveParent(resource, path);
  if (!parent) return false;
  if (index !== undefined) {
    const arr = parent[key];
    if (!Array.isArray(arr)) return false;
    arr[index] = value;
  } else {
    parent[key] = value;
  }
  return true;
}
