import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLastPresent } from "../use-last-present";

describe("useLastPresent", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns a new value on the very first render, not one frame later", () => {
    const { result } = renderHook(({ v }) => useLastPresent(v), {
      initialProps: { v: null as { id: string } | null },
    });
    expect(result.current).toBeNull();

    const row = { id: "map_1" };
    const { result: opened } = renderHook(({ v }) => useLastPresent(v), {
      initialProps: { v: row as { id: string } | null },
    });
    expect(opened.current).toBe(row);
  });

  it("keeps the previous value while the exit animation runs", () => {
    const row = { id: "map_1" };
    const { result, rerender } = renderHook(({ v }) => useLastPresent(v, 200), {
      initialProps: { v: row as { id: string } | null },
    });
    expect(result.current).toBe(row);

    rerender({ v: null });
    expect(result.current).toBe(row); // still rendering during the exit

    act(() => void vi.advanceTimersByTime(199));
    expect(result.current).toBe(row);
  });

  it("releases the value once the exit window has passed", () => {
    const row = { id: "map_1" };
    const { result, rerender } = renderHook(({ v }) => useLastPresent(v, 200), {
      initialProps: { v: row as { id: string } | null },
    });

    rerender({ v: null });
    act(() => void vi.advanceTimersByTime(250));
    expect(result.current).toBeNull();
  });

  it("switches straight to another row without holding the old one", () => {
    const first = { id: "map_1" };
    const second = { id: "map_2" };
    const { result, rerender } = renderHook(({ v }) => useLastPresent(v), {
      initialProps: { v: first as { id: string } | null },
    });

    rerender({ v: second });
    expect(result.current).toBe(second);
  });

  it("cancels the release when the same target reopens mid-exit", () => {
    const row = { id: "map_1" };
    const { result, rerender } = renderHook(({ v }) => useLastPresent(v, 200), {
      initialProps: { v: row as { id: string } | null },
    });

    rerender({ v: null });
    act(() => void vi.advanceTimersByTime(100));
    rerender({ v: row });
    act(() => void vi.advanceTimersByTime(300));

    expect(result.current).toBe(row);
  });
});
