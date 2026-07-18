import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaSyncAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;
const TODAY = new Date().toISOString().split("T")[0];
const STATUS_OPTIONS = ["Present", "Absent", "Leave", "Half Day"];

const statusStyles = {
  Present: "bg-emerald-500 text-white",
  Absent: "bg-red-500 text-white",
  Leave: "bg-amber-500 text-white",
  "Half Day": "bg-sky-500 text-white",
  "Not marked": "bg-slate-200 text-slate-700",
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

export default function StaffAttendance() {
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summary, setSummary] = useState({ Present: 0, Absent: 0, Leave: 0, "Half Day": 0 });
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [status, setStatus] = useState("Present");
  const [note, setNote] = useState("");
  const [attendanceId, setAttendanceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const monthOptions = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], []);

  const selectedStaff = useMemo(
    () => staffList.find((staff) => staff._id === selectedStaffId) || null,
    [staffList, selectedStaffId],
  );

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/staff-attendance/meta`, {
          withCredentials: true,
        });
        setStaffList(res.data.data.staffList || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load staff list");
      } finally {
        setLoading(false);
      }
    };

    fetchMeta();
  }, []);

  useEffect(() => {
    if (!selectedStaffId) {
      setAttendanceRecords([]);
      setSummary({ Present: 0, Absent: 0, Leave: 0, "Half Day": 0 });
      return;
    }

    const fetchRecords = async () => {
      try {
        setDetailLoading(true);
        const [recordsRes, summaryRes] = await Promise.all([
          axios.get(`${API}/staff-attendance/records`, {
            params: {
              staffId: selectedStaffId,
              month: selectedMonth,
              year: selectedYear,
            },
            withCredentials: true,
          }),
          axios.get(`${API}/staff-attendance/summary`, {
            params: {
              staffId: selectedStaffId,
              month: selectedMonth,
              year: selectedYear,
            },
            withCredentials: true,
          }),
        ]);

        const sorted = (recordsRes.data.data || []).sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );
        setAttendanceRecords(sorted);
        setSummary(summaryRes.data.data || { Present: 0, Absent: 0, Leave: 0, "Half Day": 0 });

        const match = sorted.find((record) => formatDate(record.date) === selectedDate);
        if (match) {
          setStatus(match.status);
          setNote(match.note || "");
          setAttendanceId(match._id);
        } else {
          setStatus("Present");
          setNote("");
          setAttendanceId("");
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load details");
        setAttendanceRecords([]);
        setSummary({ Present: 0, Absent: 0, Leave: 0, "Half Day": 0 });
      } finally {
        setDetailLoading(false);
      }
    };

    fetchRecords();
  }, [selectedStaffId, selectedMonth, selectedYear, selectedDate]);

  const handleSyncBiometric = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/staff-attendance/biometric-sync`, {}, { withCredentials: true });
      const res = await axios.get(`${API}/staff-attendance/meta`, { withCredentials: true });
      setStaffList(res.data.data.staffList || []);
      toast.success("Biometric data synced successfully.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to sync biometric data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStaffId) {
      toast.error("Select a staff member first.");
      return;
    }

    if (!selectedDate) {
      toast.error("Select a date.");
      return;
    }

    try {
      setSaving(true);
      if (attendanceId) {
        await axios.put(
          `${API}/staff-attendance/update`,
          { attendanceId, status, note },
          { withCredentials: true },
        );
        toast.success("Attendance updated successfully.");
      } else {
        await axios.post(
          `${API}/staff-attendance/save`,
          {
            staffId: selectedStaffId,
            date: selectedDate,
            status,
            note,
          },
          { withCredentials: true },
        );
        toast.success("Attendance recorded successfully.");
      }
      setSelectedDate(TODAY);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[rgb(var(--text))]">Staff Attendance</h1>
          <p className="text-sm text-[rgb(var(--text))]/70">
            Select a staff member to view today’s attendance and full monthly history.
          </p>
        </div>
        <button
          onClick={handleSyncBiometric}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white"
        >
          <FaSyncAlt /> {loading ? "Syncing..." : "Sync Biometric"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1.4fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[rgb(var(--text))]">Staff List</h2>
              <p className="text-sm text-[rgb(var(--text))]/70">Name, role, contact, today’s status, and quick actions.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {staffList.length} staff
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Today</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No staff available.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => {
                    const roleLabel = staff.staffRole === "other"
                      ? staff.staffRoleCustom || "Other"
                      : staff.staffRole?.charAt(0).toUpperCase() + staff.staffRole?.slice(1);
                    return (
                      <tr key={staff._id} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-3">{staff.fullName}</td>
                        <td className="px-4 py-3">{roleLabel}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">{staff.phone || staff.email}</div>
                          <div className="text-xs text-slate-400">{staff.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[staff.todayStatus]}`}>
                            {staff.todayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaffId(staff._id);
                              setSelectedDate(TODAY);
                              setSelectedMonth(new Date().getMonth() + 1);
                              setSelectedYear(new Date().getFullYear());
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[rgb(var(--text))]">Staff Detail</h2>
              <p className="text-sm text-[rgb(var(--text))]/70">
                {selectedStaff ? "Filter by month/year and record attendance." : "Select a staff member from the list."}
              </p>
            </div>
            {selectedStaff && (
              <button
                type="button"
                onClick={() => setSelectedStaffId("")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>

          {!selectedStaff ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Select a staff member to view the attendance detail page.
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">{selectedStaff.fullName}</div>
                <div className="text-xs text-slate-500">{selectedStaff.email} • {selectedStaff.phone || "No phone"}</div>
                <div className="text-xs text-slate-500">Role: {selectedStaff.staffRole === "other" ? selectedStaff.staffRoleCustom || "Other" : selectedStaff.staffRole}</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Month</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {monthOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Year</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {yearOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 mb-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Status</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Note</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
                    placeholder="Optional note for payroll or leave reason"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white"
              >
                {saving ? "Saving..." : attendanceId ? "Update Attendance" : "Record Attendance"}
              </button>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailLoading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          Loading records...
                        </td>
                      </tr>
                    ) : attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No attendance records available.
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((recordItem) => (
                        <tr key={recordItem._id} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3">{formatDate(recordItem.date)}</td>
                          <td className="px-4 py-3">{recordItem.status}</td>
                          <td className="px-4 py-3">{recordItem.note || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
