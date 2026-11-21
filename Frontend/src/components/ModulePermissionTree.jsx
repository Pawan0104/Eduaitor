import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { SUBMODULES_BY_MODULE } from "../constants/submodules.js";

/**
 * Parent module → child sub-module permission tree.
 *
 * The module checkbox grants or revokes every child at once. The +/- button
 * only expands/collapses the tree so admins can fine-tune individual children.
 */
const ModulePermissionTree = ({
  modules = [],
  permissions = [],
  submodulePermissions = [],
  onToggleModule,
  onToggleSubmodule,
  emptyLabel = "No modules are available for this school.",
}) => {
  const [expanded, setExpanded] = useState(() => new Set());

  const submoduleMap = useMemo(() => {
    const map = {};
    for (const module of modules) {
      map[module.key] = SUBMODULES_BY_MODULE[module.key] || [];
    }
    return map;
  }, [modules]);

  const toggleExpanded = (key) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (modules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
      {modules.map((module) => {
        const children = submoduleMap[module.key] || [];
        const isOpen = expanded.has(module.key);
        const selectedChildren = children.filter((child) =>
          submodulePermissions.includes(child.id),
        ).length;

        return (
          <div key={module.key}>
            <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-50/80">
              <button
                type="button"
                onClick={() => toggleExpanded(module.key)}
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${module.label} sub-modules`}
                title={isOpen ? "Collapse sub-modules" : "Expand sub-modules"}
                className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:border-[#4834b8] hover:text-[#4834b8] cursor-pointer"
              >
                {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </button>

              <label className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.includes(module.key)}
                  onChange={() => onToggleModule(module.key)}
                  aria-label={`Grant all ${module.label} permissions`}
                  className="w-4 h-4 rounded border-slate-300 text-[#4834b8] focus:ring-[#4834b8] cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {module.label}
                </span>
              </label>

              {children.length > 0 && (
                <span className="shrink-0 text-[10.5px] font-mono tabular-nums text-slate-500">
                  {selectedChildren}/{children.length}
                </span>
              )}
            </div>

            {isOpen && (
              <div className="px-3 py-2 pl-11 space-y-1.5 bg-white">
                {children.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic">
                    No separate sub-modules configured for this module.
                  </div>
                ) : (
                  children.map((child) => (
                    <label
                      key={child.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={submodulePermissions.includes(child.id)}
                        onChange={() => onToggleSubmodule(child.id)}
                        aria-label={`${module.label} - ${child.label}`}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#4834b8] focus:ring-[#4834b8] cursor-pointer"
                      />
                      <span className="text-[11.5px] text-slate-600 group-hover:text-slate-900">
                        {child.label}
                      </span>
                      <span className="ml-auto text-[10px] font-mono text-slate-300">
                        {child.id}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ModulePermissionTree;
