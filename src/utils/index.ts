import { useEffect, useInsertionEffect, useMemo, useRef } from "react";

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function useLatest<T>(value: T) {
  const latestValue = useRef(value);

  useInsertionEffect(() => {
    latestValue.current = value;
  }, []);

  return latestValue;
}

export function rafThrottle<Fn extends (...args: unknown[]) => unknown>(cb: Fn) {
  let rafId: number | null = null;

  return function throttled(...args: Parameters<Fn>) {
    if (isNumber(rafId)) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      cb(...args);
      rafId = null;
    });
  };
}

export function useResizeObserver(cb: ResizeObserverCallback) {
  const latestCb = useLatest(cb);

  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries, observer) => {
        latestCb.current(entries, observer);
      }),
    [latestCb]
  );

  useEffect(() => () => resizeObserver.disconnect(), [resizeObserver]);

  return resizeObserver;
}

let rafScheduled = false;
const tasks: (() => void)[] = [];

export function scheduleDOMUpdate(cb: () => void) {
  tasks.push(cb);
  if (rafScheduled) {
    return;
  }
  rafScheduled = true;
  requestAnimationFrame(() => {
    const tasksToRun = [...tasks];
    tasks.length = 0;
    tasksToRun.forEach((task) => task());
    rafScheduled = false;
  });
}