import React from "react";
import axios from "axios";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext"; // ← adjust path if needed
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;
const TYPE_STYLES = {
  homework: {
    badge: "bg-amber-50 text-amber-700",
    border: "border-l-amber-400",
  },
  classwork: {
    badge: "bg-blue-50 text-blue-700",
    border: "border-l-blue-400",
  },
  remark: {
    badge: "bg-violet-50 text-violet-700",
    border: "border-l-violet-400",
  },
};

function DiaryParent() {
  const [entries, setEntries] = useState([]);
  const { user } = useAuth();
  const studentId = user?.student_id;

  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    axios
      .get(`${API}/diary/parent/${studentId}`, { withCredentials: true })
      .then((response) => {
        console.log(response.data);
        setEntries(response.data);
      })
      .catch((error) => {
        console.error("Error fetching parent diary:", error);
      });
  }, []);

  const grouped = entries.reduce((acc, entry) => {
    const key = new Date(entry.date).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  const fmtDay = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

  return (
    <div className="min-h-screen p-8 text-[rgb(var(--text))]">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
                 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <h1 className="text-lg font-semibold mb-4 text-[rgb(var(--text))]">
        📘 Student Diary
      </h1>

      {sortedDates.length === 0 ? (
        <div className="text-center text-[rgb(var(--text))] mt-20">
          No diary entries yet
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xs font-semibold text-[rgb(var(--text))] uppercase">
                  {fmtDay(dateKey)}
                </h2>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Entries */}
              <div className="space-y-3">
                {grouped[dateKey].map((entry) => {
                  const ts = TYPE_STYLES[entry.type] || TYPE_STYLES.remark;

                  return (
                    <div
                      key={entry._id}
                      className={`bg-[rgb(var(--surface))] p-4 rounded-xl border border-slate-200 border-l-4 ${ts.border}`}
                    >
                      {/* Top Row */}
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full capitalize ${ts.badge}`}
                        >
                          {entry.type}
                        </span>

                        <span className="text-xs text-[rgb(var(--text))]">
                          {fmtDate(entry.date)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {/* Class */}
                        {entry.classId?.name && (
                          <p className="text-xs text-[rgb(var(--text))] mb-1">
                            Class - {entry.classId.name}
                          </p>
                        )}

                        {/* Subject */}
                        {entry.subjectId?.name && (
                          <p className="text-xs text-[rgb(var(--text))] mb-1">
                            {entry.subjectId.name}
                          </p>
                        )}
                      </div>
                      {/* Content */}
                      <p className="text-sm text-[rgb(var(--text))]">{entry.content}</p>

                      {/* Due Date */}
                      {entry.type === "homework" && entry.dueDate && (
                        <p className="text-xs text-amber-600 mt-2">
                          Due: {fmtDate(entry.dueDate)}
                        </p>
                      )}

                      {/* Teacher */}
                      {entry.teacherId?.fullName && (
                        <p className="text-xs text-[rgb(var(--text))] mt-2">
                          👨‍🏫 {entry.teacherId?.fullName}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DiaryParent;
