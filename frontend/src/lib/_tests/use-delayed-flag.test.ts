import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDelayedFlag } from "../use-delayed-flag";

describe("useDelayedFlag", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays hidden for a response faster than the delay", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
      initialProps: { active: true },
    });

    // our real api returns in 13-28ms
    act(() => void vi.advanceTimersByTime(28));
    rerender({ active: false });
    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current).toBe(false);
  });

  it("shows once the delay elapses", () => {
    const { result } = renderHook(() => useDelayedFlag(true));

    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(250));
    expect(result.current).toBe(true);
  });

  it("holds for the minimum once shown", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
      initialProps: { active: true },
    });

    act(() => void vi.advanceTimersByTime(250));
    expect(result.current).toBe(true);

    // resolves immediately after appearing - must not blink straight off
    rerender({ active: false });
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe(false);
  });

  it("does not re-arm after hiding", () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
      initialProps: { active: true },
    });

    act(() => void vi.advanceTimersByTime(250));
    rerender({ active: false });
    act(() => void vi.advanceTimersByTime(400));
    expect(result.current).toBe(false);

    act(() => void vi.advanceTimersByTime(2000));
    expect(result.current).toBe(false);
  });
});
