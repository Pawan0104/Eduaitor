/**
 * Backward-compatible re-export of all transport models.
 *
 * Actual schemas now live under ./transport/ — import from there in new code.
 * This file exists so existing imports:
 *   import { Driver, Bus, TransportRoute, Activity } from "../models/transport.js"
 * continue to work unchanged.
 */

export { Driver } from "./transport/driver.js";
export { Bus, Vehicle } from "./transport/vehicle.js";
export { TransportRoute } from "./transport/route.js";
export { TransportStop } from "./transport/stop.js";
export { Attendant } from "./transport/attendant.js";
export { Vendor } from "./transport/vendor.js";
export { Activity } from "./transport/activity.js";