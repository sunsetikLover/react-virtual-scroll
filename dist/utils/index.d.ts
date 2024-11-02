export declare function isNumber(value: unknown): value is number;
export declare function useLatest<T>(value: T): import("react").MutableRefObject<T>;
export declare function rafThrottle<Fn extends (...args: unknown[]) => unknown>(cb: Fn): (...args: Parameters<Fn>) => void;
export declare function useResizeObserver(cb: ResizeObserverCallback): ResizeObserver;
export declare function scheduleDOMUpdate(cb: () => void): void;
