import React, { useState, useEffect, useCallback } from "react";
import { useParams,useNavigate  } from "react-router-dom";
import axios from "axios";
import UserAvatar from "../components/UserAvatar";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STATUS_STYLES = {
  Present: {
    badge: "bg-[#EAF3DE] text-[#3B6D11]",
    cell:  "bg-[#EAF3DE] text-[#3B6D11]",
    dot:   "bg-[#3B6D11]",
    icon:  "ti-circle-check",
  },
  Absent: {
    badge: "bg-[#FCEBEB] text-[#A32D2D]",
    cell:  "bg-[#FCEBEB] text-[#A32D2D]",
    dot:   "bg-[#A32D2D]",
    icon:  "ti-circle-x",
  },
  Late: {
    badge: "bg-[#FAEEDA] text-[#854F0B]",
    cell:  "bg-[#FAEEDA] text-[#854F0B]",
    dot:   "bg-[#854F0B]",
    icon:  "ti-clock",
  },
};

/* ── Calendar ─────────────────────────────────────────────────────────── */
function AttendanceCalendar({ records, month, year }) {
  const statusMap = {};
  records.forEach((r) => {
    const d = new Date(r.date);
    statusMap[`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`] = r.status;
  });

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today       = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ type: "empty" });
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month - 1, d);
    const status   = statusMap[`${year}-${month}-${d}`] || null;
    cells.push({
      type:    "day",
      day:     d,
      status,
      isToday: cellDate.toDateString() === today.toDateString(),
      isFuture: cellDate > today,
    });
  }

  return (
    <div
      className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl p-4 mb-4"
    >
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3">
        {["Present","Absent","Late"].map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{
                background: s === "Present" ? "#C0DD97" : s === "Absent" ? "#F7C1C1" : "#FAC775",
              }}
            />
            {s}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <div key={d} className="text-center text-[11px] text-[rgb(var(--text-muted))] pb-1 font-medium">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (cell.type === "empty") return <div key={i} />;
          const st = cell.status ? STATUS_STYLES[cell.status] : null;
          return (
            <div
              key={i}
              title={cell.status ? `${MONTHS[month-1]} ${cell.day}: ${cell.status}` : ""}
              className={[
                "aspect-square rounded-md flex flex-col items-center justify-center text-xs font-medium",
                st ? st.cell : cell.isFuture
                  ? "text-[rgb(var(--text-muted))] opacity-40"
                  : "text-[rgb(var(--text-muted))]",
                cell.isToday ? "ring-1 ring-[rgb(var(--border-strong))]" : "",
              ].join(" ")}
            >
              <span>{cell.day}</span>
              {st && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${st.dot}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────── */
function StudentAttendanceDetail({}) {
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
    const { studentId } = useParams();
    const navigate = useNavigate();
    // console.log("StudentAttendanceDetail mounted with studentId:", id);  
  const API_URL = `${import.meta.env.VITE_API_URL}`;

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    console.log("Fetching attendance data for studentId:", studentId, "month:", month, "year:", year);
    try {
      const res = await axios.get(
  `${API_URL}/class-attendance/student/${studentId}`,
  {
    params: { month, year },
    withCredentials: true,
  }
);
      console.log("Attendance data:", res.data);
      if (res.data.success) setData(res.data);
      else setError(res.data.message || "No records found");
      console.log("Fetched attendance data:", res.data.message, res.data);
    } catch (e) {
      console.error("Error fetching attendance data:", e);
        setError(e.response?.data?.message || "Failed to load attendance");

    } finally {
      setLoading(false);
    }
  }, [studentId, month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    const current = new Date();
    if (y > current.getFullYear() || (y === current.getFullYear() && m > current.getMonth() + 1)) return;
    setMonth(m);
    setYear(y);
  };

  const student  = data?.student;
  const summary  = data?.summary;
  const records  = data?.records || [];
  const isNextDisabled =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  const pctColor =
    summary?.percentage >= 75 ? "#0F6E56"
    : summary?.percentage >= 50 ? "#854F0B"
    : "#A32D2D";

  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  const onBack = () => {
    // console.log("Back button clicked");
    navigate(-1);
  }
  return (
    <div className="p-4 max-w-2xl mx-auto text-[rgb(var(--text))]">

      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[rgb(var(--text-muted))] border border-[rgb(var(--border))] rounded-lg px-3 py-1.5 hover:bg-[rgb(var(--surface))] transition-colors"
        >
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="text-sm text-[rgb(var(--text-muted))]">Class Attendance</span>
        <i className="ti ti-chevron-right text-xs text-[rgb(var(--text-muted))]" aria-hidden="true" />
        <span className="text-sm font-medium truncate">
          {student?.fullName || "Student Detail"}
        </span>
      </div>

      {/* Student card */}
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl p-4 flex items-center gap-4 mb-5">
        <UserAvatar
          name={student?.name}
          photoUrl={student?.photo_url}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-base mb-0.5 truncate">
            {student?.name || "—"}
          </p>
          <p className="text-sm text-[rgb(var(--text-muted))] flex flex-wrap gap-3">
            {student?.rollNumber && <span>Roll #{student.rollNumber}</span>}
            {student?.className  && <span>Class {student.className}</span>}
            {student?.sectionName && <span>Section {student.sectionName}</span>}
          </p>
        </div>
        {summary?.total > 0 && (
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-2xl font-medium" style={{ color: pctColor }}>
              {summary.percentage}%
            </span>
            <span className="text-xs text-[rgb(var(--text-muted))]">attendance</span>
          </div>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          className="border border-[rgb(var(--border))] rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface))] transition-colors"
        >
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        <span className="font-medium text-sm">{MONTHS[month - 1]} {year}</span>
        <button
          onClick={() => changeMonth(1)}
          disabled={isNextDisabled}
          className="border border-[rgb(var(--border))] rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {[
          { label: "Present", val: summary?.present, color: "#0F6E56" },
          { label: "Absent",  val: summary?.absent,  color: "#A32D2D" },
          { label: "Late",    val: summary?.late,    color: "#854F0B" },
          { label: "Total",   val: summary?.total,   color: "rgb(var(--text))" },
          { label: "Rate",    val: summary?.total ? `${summary.percentage}%` : "—", color: pctColor },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-[rgb(var(--surface))] rounded-lg p-3">
            <div className="text-xs text-[rgb(var(--text-muted))] mb-1">{label}</div>
            <div className="text-xl font-medium" style={{ color }}>
              {loading ? "—" : val ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      {!error && (
        <AttendanceCalendar records={records} month={month} year={year} />
      )}

      {/* Records list */}
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl overflow-hidden">
        {/* table header */}
        <div
          className="grid text-xs font-medium text-[rgb(var(--text-muted))] px-4 py-2.5 border-b border-[rgb(var(--border))]"
          style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
        >
          <span>Date</span>
          <span>Day</span>
          <span>Status</span>
        </div>

        {loading && (
          <div className="text-center py-10 text-sm text-[rgb(var(--text-muted))]">
            <i className="ti ti-loader animate-spin mr-2" aria-hidden="true" />
            Loading records...
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-10 text-sm text-[rgb(var(--text-muted))]">
            <i className="ti ti-calendar-off block text-2xl mb-2" aria-hidden="true" />
            {error}
          </div>
        )}

        {!loading && !error && sortedRecords.length === 0 && (
          <div className="text-center py-10 text-sm text-[rgb(var(--text-muted))]">
            <i className="ti ti-calendar-off block text-2xl mb-2" aria-hidden="true" />
            No attendance records for this month
          </div>
        )}

        {!loading && !error && sortedRecords.map((r) => {
          const d   = new Date(r.date);
          const st  = STATUS_STYLES[r.status] || STATUS_STYLES.Present;
          return (
            <div
              key={r._id}
              className="grid items-center px-4 py-2.5 text-sm border-b border-[rgb(var(--border))] last:border-b-0"
              style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
            >
              <span>{formatDate(r.date)}</span>
              <span className="text-[rgb(var(--text-muted))]">{DAYS[d.getDay()]}</span>
              <span>
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${st.badge}`}>
                  <i className={`ti ${st.icon} text-xs`} aria-hidden="true" />
                  {r.status}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StudentAttendanceDetail;