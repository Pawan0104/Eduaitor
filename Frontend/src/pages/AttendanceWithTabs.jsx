/**
 * AttendanceWithTabs.jsx
 * ─────────────────────
 * Drop-in replacement for Attendance.jsx.
 * Wraps the existing subject-wise marking UI (SubjectAttendance)
 * and the new ClassAttendanceMarking under a shared tab bar.
 *
 * Tab preference is persisted in localStorage under: attendance_tab_preference
 */

import React, { useState, useEffect, lazy, Suspense } from "react";
import SubjectAttendance from "./Attendance";           // your existing file renamed
import { FaClipboardList, FaUserCheck } from "react-icons/fa";

const ClassAttendanceMarking = lazy(() => import("./ClassAttendanceMarking"));

const TAB_KEY   = "attendance_tab_preference";
const TABS = [
  { id: "subject", label: "Subject-wise",     icon: FaClipboardList },
  { id: "class",   label: "Class Attendance", icon: FaUserCheck     },
];

function TabBar({ active, onChange }) {
  return (
    <div className="bg-[rgb(var(--surface))] border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex gap-0">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`
                  flex items-center gap-2 px-4 sm:px-6 py-3.5 text-sm font-semibold
                  border-b-2 transition-all duration-150 whitespace-nowrap
                  ${isActive
                    ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))]"
                    : "border-transparent text-[rgb(var(--text))] hover:text-[rgb(var(--primary))] hover:border-slate-300"
                  }
                `}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{id === "subject" ? "Subject" : "Class"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabFallback() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-6 h-6 text-[rgb(var(--primary))]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm text-[rgb(var(--text))]">Loading…</p>
      </div>
    </div>
  );
}

export default function AttendanceWithTabs() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem(TAB_KEY) ?? "subject"
  );

  const handleTabChange = (id) => {
    setActiveTab(id);
    localStorage.setItem(TAB_KEY, id);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <TabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === "subject" && <SubjectAttendance />}

      {activeTab === "class" && (
        <Suspense fallback={<TabFallback />}>
          <ClassAttendanceMarking />
        </Suspense>
      )}
    </div>
  );
}