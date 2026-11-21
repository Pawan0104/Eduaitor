import { SUGGESTED_STREAM_NAMES } from "../utils/streamNames";

/**
 * Common stream names shown as explicit quick-add actions. They are never
 * part of the live list until the user adds them, so a deleted stream does
 * not silently come back the next time the Add New Class modal is opened.
 */
export default function QuickAddStreams({ availableStreams = [], onAdd }) {
  const existing = new Set(
    availableStreams.map((name) => String(name || "").trim().toLowerCase()),
  );
  const suggestions = SUGGESTED_STREAM_NAMES.filter(
    (name) => !existing.has(name.toLowerCase()),
  );

  if (!suggestions.length) return null;

  return (
    <div className="pt-2 border-t border-slate-200">
      <p className="text-[10px] font-semibold text-slate-500 mb-1.5">
        Quick add common streams
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onAdd?.(name)}
            className="px-2 py-1 rounded-md border border-slate-300 bg-white text-[11px] text-slate-600 hover:border-[#4834b8] hover:text-[#4834b8] transition"
          >
            + {name}
          </button>
        ))}
      </div>
    </div>
  );
}
