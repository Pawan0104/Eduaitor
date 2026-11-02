import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request academic-session context.
 *
 * The HTTP middleware stores the resolved session here, and the Mongoose
 * plugin (`utils/sessionPlugin.js`) reads it inside query/save hooks. This
 * keeps the whole ERP session-aware without threading the request object
 * through every helper and aggregation.
 */
const storage = new AsyncLocalStorage();

export const runWithSession = (context, fn) => storage.run(context, fn);

export const getSessionContext = () => storage.getStore() || null;

/** True when the caller explicitly asked for every session (`?academicYear=all`). */
export const isAllSessions = () => Boolean(getSessionContext()?.all);

export default storage;
