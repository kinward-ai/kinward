// Kinward Logger — configurable debug output
// Set DEBUG=true in environment to see request-level logging.
// Errors and startup messages always show regardless of DEBUG.

const DEBUG = process.env.DEBUG === "true" || process.env.DEBUG === "1";

/** Debug log — only prints when DEBUG=true */
function debug(...args) {
  if (DEBUG) console.log(...args);
}

/** Always prints — for startup, boot, important state changes */
function info(...args) {
  console.log(...args);
}

/** Always prints — for warnings */
function warn(...args) {
  console.warn(...args);
}

/** Always prints — for errors */
function error(...args) {
  console.error(...args);
}

module.exports = { debug, info, warn, error, DEBUG };
