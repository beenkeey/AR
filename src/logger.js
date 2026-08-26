export function arLog(message) {
  console.log(`[AR] ${message}`);
}

export function arWarn(message, extra) {
  if (extra !== undefined) console.warn(`[AR] ${message}`, extra);
  else console.warn(`[AR] ${message}`);
}

export function arError(message, extra) {
  if (extra !== undefined) console.error(`[AR] ${message}`, extra);
  else console.error(`[AR] ${message}`);
}

export function arDiag(scope, message, extra) {
  const prefix = `[AR][${scope}]`;
  if (extra !== undefined) console.log(prefix, message, extra);
  else console.log(`${prefix} ${message}`);
}
