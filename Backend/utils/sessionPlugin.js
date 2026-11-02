import { getSessionContext } from "./sessionContext.js";

/**
 * Mongoose plugin that makes a collection academic-session aware.
 *
 * Every read (`find`, `findOne`, counts, aggregates) is automatically limited
 * to the session resolved for the current request, and every write is stamped
 * with that session. Pass `{ skipSession: true }` in the query options to
 * deliberately bypass the filter (used by the session-management screen and
 * by migration scripts).
 *
 * Masters such as classes, sections, subjects, staff, transport, hostel and
 * library must NOT use this plugin - they are shared across sessions.
 */
export default function sessionScopedPlugin(schema, options = {}) {
  const field = options.field || "academicYear";

  const contextFor = (query) => {
    if (query?.getOptions?.().skipSession) return null;
    const ctx = getSessionContext();
    if (!ctx || ctx.all || !ctx.academicYear) return null;
    return ctx;
  };

  const scopeFilter = function () {
    const ctx = contextFor(this);
    if (!ctx) return;
    const filter = this.getFilter() || {};
    if (filter[field] !== undefined) return; // explicit filter wins
    this.where({ [field]: ctx.academicYear });
  };

  const scopeUpsert = function () {
    const ctx = contextFor(this);
    if (!ctx) return;
    if (!this.getOptions?.().upsert) return;
    const update = this.getUpdate() || {};
    if (update[field] !== undefined) return;
    update.$setOnInsert = update.$setOnInsert || {};
    if (update.$setOnInsert[field] === undefined) {
      update.$setOnInsert[field] = ctx.academicYear;
    }
    this.setUpdate(update);
  };

  const readHooks = [
    "find",
    "findOne",
    "findOneAndDelete",
    "findOneAndReplace",
    "countDocuments",
    "count",
    "distinct",
  ];
  readHooks.forEach((hook) => schema.pre(hook, scopeFilter));

  const writeHooks = [
    "updateOne",
    "updateMany",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndUpdate",
  ];
  writeHooks.forEach((hook) => {
    schema.pre(hook, scopeFilter);
    schema.pre(hook, scopeUpsert);
  });

  // Aggregations are limited by prepending a $match stage.
  schema.pre("aggregate", function () {
    if (this.options?.skipSession) return;
    const ctx = getSessionContext();
    if (!ctx || ctx.all || !ctx.academicYear) return;
    const pipeline = this.pipeline() || [];
    const first = pipeline[0];
    if (first && first[field] !== undefined) return;
    pipeline.unshift({ $match: { [field]: ctx.academicYear } });
    this.pipeline(pipeline);
  });

  // Stamp new documents with the active session when the caller did not.
  schema.pre("save", function () {
    if (!this[field]) {
      const ctx = getSessionContext();
      if (ctx && ctx.academicYear) this[field] = ctx.academicYear;
    }
  });

  schema.pre("insertMany", function (docs) {
    const ctx = getSessionContext();
    if (!ctx || !ctx.academicYear) return;
    const list = Array.isArray(docs) ? docs : [];
    list.forEach((doc) => {
      if (doc && !doc[field]) doc[field] = ctx.academicYear;
    });
  });
}
