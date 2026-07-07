type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function write(level: LogLevel, message: string, payload?: LogPayload) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  if (process.env.NODE_ENV === "production" && level === "debug") {
    return;
  }
  console.log(line);
}

export const logger = {
  debug: (message: string, payload?: LogPayload) => write("debug", message, payload),
  info: (message: string, payload?: LogPayload) => write("info", message, payload),
  warn: (message: string, payload?: LogPayload) => write("warn", message, payload),
  error: (message: string, payload?: LogPayload) => write("error", message, payload),
};

export function captureException(error: unknown, context?: LogPayload) {
  const normalized =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

  logger.error("Unhandled exception", { ...context, error: normalized });

  if (process.env.SENTRY_DSN) {
    logger.info("Sentry DSN configured — wire @sentry/nextjs to forward errors in production.");
  }
}
