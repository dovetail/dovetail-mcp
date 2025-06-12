export type PromiseRetryOptions = {
  maxRetries?: number;
  retryIf?: (err: unknown) => boolean;
  onRetry?: (attempt: number, totalAttempts: number) => void;
} & (
  | {
      delayType?: "exponential" | "constant";
      delayMs?: number;
    }
  | {
      delayType?: undefined;
      delayMs: (context: { attempt: number; err: unknown }) => number;
    }
);

export const retry = async <T>(fn: () => Promise<T>, opts: PromiseRetryOptions = {}): Promise<T> => {
  const { maxRetries = 3, retryIf = () => true, delayMs = 1000, onRetry } = opts;
  for (let i = 0; true; i++) {
    try {
      if (i > 0) {
        onRetry?.(i + 1, maxRetries);
      }
      return await fn();
    } catch (err) {
      if (i === maxRetries || !retryIf(err)) {
        throw err;
      } else if (typeof delayMs === "function") {
        await new Promise((resolve) => setTimeout(resolve, delayMs({ attempt: i, err })));
      } else {
        switch (opts.delayType) {
          case "constant": // good for polling low load services e.g. local development
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            break;
          case "exponential":
          case undefined:
            // Can't use timers/promises setTimeout here because toolbox is used by web-app
            await new Promise((resolve) => setTimeout(resolve, 2 ** i * delayMs));
            break;
        }
      }
    }
  }
};