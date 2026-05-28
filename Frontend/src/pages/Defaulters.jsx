import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Defaulters = () => {
  const [defaulters, setDefaulters] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [classes, setClasses] = useState([]);
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const loadClasses = async () => {
    try {
      const { data } = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(data.classes || []);
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // 1. Fetch Logic
  const fetchDefaulters = useCallback(async () => {
    setLoading(true);
    try {
      // Adjust the URL to your actual backend endpoint
      const response = await axios.get(`${API}/fees/defaulters`, {
        params: {
          classId: selectedClass,
          search: searchTerm,
          page: page,
          limit: 10,
        },
        withCredentials: true,
      });

      setDefaulters(response.data.defaulters || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching defaulters:", error);
      setDefaulters([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, page, searchTerm]);

  useEffect(() => {
    fetchDefaulters();
  }, [fetchDefaulters]);

  return (
    <div className="p-4 md:p-8 text-[rgb(var(--text))]  min-h-screen font-sans">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
          <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-[rgb(var(--primary))] shadow-sm border border-slate-100
                 text-sm font-bold  active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black  tracking-tight">
            Fee Defaulters
          </h1>
          <p className="text-[rgb(var(--primary))] font-medium mt-1">
            list of students with 2+ months unpaid fees
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search name or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="p-3  border-2 bg-[rgb(var(--surface))] border-slate-200 rounded-2xl text-sm font-bold shadow-sm outline-none transition-all"
          />
          <select
            value={selectedClass}
            className="..."
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPage(1);
            }}
          >
            <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">All Classes</option>
            {classes.map((c) => (
              /* Use c._id as the value, c.name as the label */
              <option key={c._id} value={c._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                Class {c.name}
              </option>
            ))}
          </select>

          <button className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-6 py-3 rounded-2xl text-sm font-bold  active:scale-95 transition-all flex items-center gap-2">
            <span>🔔 Notify All</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 "></div>
          <p className="mt-4  font-bold italic">
            Scanning database...
          </p>
        </div>
      ) : defaulters.length > 0 ? (
        <>
          {/* Table Container */}
          <div className="bg-[rgb(var(--surface))]  rounded-4xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className=" text-[11px] uppercase tracking-[0.2em] font-black">
                  <tr>
                    <th className="p-6">Student Info</th>
                    <th className="p-6">Financial Standing</th>
                    <th className="p-6">Last Payment</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {defaulters.map((s, i) => (
                    <tr
                      key={s._id}
                      className="group"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10  bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-full flex items-center justify-center font-bold ">
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-bold  text-base text-[rgb(var(--primary))]">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs  font-semibold uppercase">
                              Class {s.className}-{s.section}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-red-600 font-black text-m leading-none">
                            Total Due ₹{(s.calculatedDue || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold  mt-1 italic">
                            Total Payable: ₹
                            {(s.finalFee || 0).toLocaleString()}{" "}
                          </span>
                        </div>
                      </td>
                      <td className="p-6  font-medium">
                        {s.lastPayment ? (
                          <div className="text-sm">
                            {new Date(
                              s.lastPayment.paidDate,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                            <p className="text-[10px] ">
                              via {s.lastPayment.paymentMode}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-bold italic">
                            No Record
                          </span>
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setViewData(s)}
                            className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-xl text-xs font-bold  transition-all"
                          >
                            Details
                          </button>
                          <button className="px-4 py-2 bg-[rgb(var(--primary))] rounded-xl text-xs font-bold transition-all">
                            Notify
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination - Only shown if defaulters exist */}
          <div className="mt-8 flex items-center justify-between px-4">
            <p className="text-xs font-bold italic">
              Showing page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-6 py-2 bg-[rgb(var(--surface))] border border-slate-200 rounded-xl font-bold  disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2 bg-[rgb(var(--surface))] border border-slate-200 rounded-xl font-bold  disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="bg-[rgb(var(--surface))] rounded-4xl p-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
          {searchTerm ? (
            /* Scenario A: Search result is empty */
            <>
              <div className="bg-[rgb(var(--bg))] h-20 w-20 rounded-full flex items-center justify-center text-3xl mb-4">
                🔍
              </div>
              <h2 className="text-xl font-black ">
                No Match Found
              </h2>
              <p className=" font-medium text-center">
                We couldn't find any defaulter matching{" "}
                <span className="text-[rgb(var(--primary))]">"{searchTerm}"</span>
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 bg-[rgb(var(--primary))]  px-6 py-2 rounded-xl font-bold text-sm hover:bg-[rgb(var(--primary-hover))] transition-all"
              >
                Clear Search
              </button>
            </>
          ) : (
            /* Scenario B: Truly no defaulters in the database/class */
            <>
              <div className="bg-[rgb(var(--bg))] h-20 w-20 rounded-full flex items-center justify-center text-3xl mb-4">
                ✅
              </div>
              <h2 className="text-xl font-black ">
                Excellent! No Defaulters Found
              </h2>
              <p className=" font-medium">
                Everyone in {selectedClass ? `this class` : "all classes"} is up
                to date.
              </p>
              {selectedClass && (
                <button
                  onClick={() => setSelectedClass("")}
                  className="mt-4 text-[rgb(var(--primary))] font-bold underline text-sm"
                >
                  Check Other Classes
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* View Modal */}
      {viewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-[rgb(var(--primary))]  rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 font-black italic">
                i
              </div>
              <h3 className="text-2xl font-black  leading-tight">
                Dues for {viewData.firstName}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className=" font-bold uppercase text-[10px]">
                  Monthly Commitment
                </span>
                <span className="font-bold ">
                  ₹{Math.round(viewData.totalFees / 12).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-y border-slate-50">
                <span className=" font-bold uppercase text-[10px]">
                  Defaulter Duration
                </span>
                <span className="font-bold text-red-600">2+ Months</span>
              </div>
              <div className="p-4 bg-red-50 rounded-2xl flex justify-between items-center">
                <span className="font-black text-red-800 uppercase text-xs">
                  Total Outstanding
                </span>
                <span className="text-2xl font-black text-red-600">
                  ₹{viewData.totalDue.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setViewData(null)}
              className="w-full mt-8 py-4 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-2xl font-black transition-all"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Defaulters;
