import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaArrowLeft, FaIdCard, FaPrint, FaDownload } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import {
  ID_CARD_FIELD_CONFIG,
  mergeCardFields,
  cardFieldLabel,
  cardFieldValue,
} from "../utils/idCardFields";

const API = import.meta.env.VITE_API_URL;

/**
 * ID Card page
 * Routes:
 *   /student/id-card          → own student card
 *   /staff/id-card            → own staff card
 *   /school/id-card/student/:id
 *   /school/id-card/staff/:id
 *   /parent/id-card           → child's card
 * Query: ?type=student|staff&id=xxx&model=staff|teacher|driver
 */
export default function IdCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const isMobile = window.innerWidth <= 768;

  const typeFromQuery = searchParams.get("type");
  const idFromQuery = searchParams.get("id");
  // Which collection the id belongs to (staff / teacher / driver).
  const modelFromQuery = searchParams.get("model");

  const role = user?.role;
  let cardType =
    typeFromQuery ||
    (role === "staff_admin"
      ? "staff"
      : role === "student_admin"
        ? "student"
        : paramId
          ? "student"
          : "student");

  // Path segments: /school/id-card/staff/:id
  const path = window.location.pathname;
  if (path.includes("/id-card/staff")) cardType = "staff";
  if (path.includes("/id-card/student")) cardType = "student";

  const personId = paramId || idFromQuery || null;

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let url = `${API}/id-card/me`;
        if (personId) {
          url =
            cardType === "staff"
              ? `${API}/id-card/staff/${personId}${
                  modelFromQuery
                    ? `?model=${encodeURIComponent(modelFromQuery)}`
                    : ""
                }`
              : `${API}/id-card/student/${personId}`;
        } else if (cardType === "staff" && role === "staff_admin") {
          url = `${API}/id-card/staff`;
        } else if (cardType === "student") {
          url = `${API}/id-card/student`;
        }

        const { data } = await axios.get(url, { withCredentials: true });
        setPayload(data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load ID card");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cardType, personId, role, modelFromQuery]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="p-10 text-center text-[rgb(var(--text-light))]">
        Loading ID card...
      </div>
    );
  }

  if (!payload?.person) {
    return (
      <div className="p-10 text-center">
        <p className="text-[rgb(var(--text-light))] mb-4">ID card not available.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg border text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const { school, person, type, design, personType } = payload;
  const canEditDesign = role === "school_admin";
  const personLabel =
    personType === "teacher"
      ? "Teacher"
      : personType === "driver"
        ? "Driver"
        : type === "staff"
          ? "Staff"
          : "Student";

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          {isMobile && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-xl bg-[rgb(var(--surface))] border text-sm font-bold"
            >
              <FaArrowLeft /> Back
            </button>
          )}
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaIdCard className="text-[rgb(var(--primary))]" />
            {personLabel} ID Card
          </h1>
          <p className="text-sm text-[rgb(var(--text-light))] mt-1">
            Issued on admission / registration — print or save as PDF
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditDesign && (
            <button
              onClick={() =>
                navigate("/school/certificates/settings?type=id_card")
              }
              className="px-4 py-2 rounded-lg border text-sm font-medium"
            >
              Customize design
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2"
          >
            <FaPrint /> Print / Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-sm font-medium flex items-center gap-2"
          >
            <FaDownload /> Save
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <IdCardVisual
          school={school}
          person={person}
          type={type}
          personType={personType}
          design={design}
        />
      </div>

      <p className="text-center text-xs text-[rgb(var(--text-light))] mt-4 print:hidden">
        Tip: In the print dialog, choose “Save as PDF” to download the ID card.
      </p>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #id-card-print, #id-card-print * { visibility: visible !important; }
          #id-card-print {
            position: absolute;
            left: 50%;
            top: 20mm;
            transform: translateX(-50%);
          }
          @page { size: auto; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}

export function IdCardVisual({ school, person, type, personType, design }) {
  const isStaff = type === "staff";
  const primary = design?.primaryColor || (isStaff ? "#0f766e" : "#4f46e5");
  const accent =
    design?.accentColor || (isStaff ? "#0f766e" : "#4f46e5");
  const headerColor = isStaff ? accent : primary;
  const bg = design?.backgroundColor || "#ffffff";
  const text = design?.textColor || "#0f172a";
  const borderCol = design?.borderColor || headerColor;
  const showBorder = design?.showBorder !== false;
  const logo =
    design?.showLogo === false
      ? ""
      : design?.logoUrl || school?.logo || "";
  const cardTitle = isStaff
    ? design?.subtitle ||
      (personType === "teacher"
        ? "Teacher Identity Card"
        : personType === "driver"
          ? "Driver Identity Card"
          : "Staff Identity Card")
    : design?.title || "Student Identity Card";

  const cardKey =
    personType === "teacher"
      ? "teacher"
      : personType === "driver"
        ? "driver"
        : isStaff
          ? "staff"
          : "student";
  const options = ID_CARD_FIELD_CONFIG[cardKey]?.options || [];
  const fields = mergeCardFields(design?.cardFields)[cardKey];
  const resolveField = (key, mono) => {
    const label = cardFieldLabel(cardKey, key);
    const value = cardFieldValue(person, cardKey, key);
    return { key, label, value, mono };
  };
  const headerFields = (fields.header || []).map((k) => resolveField(k));
  const bodyFields = (fields.body || []).map((k) =>
    resolveField(k, k === "idNumber"),
  );
  const footerFields = (fields.footer || []).map((k) => resolveField(k));
  const optionOf = (key) => options.find((o) => o.key === key);

  const photo =
    person.photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name || "U")}&background=e2e8f0&color=334155&size=128`;

  const borderWidth =
    !showBorder
      ? 0
      : design?.borderStyle === "classic"
        ? 4
        : design?.borderStyle === "minimal"
          ? 1
          : 3;

  return (
    <div
      id="id-card-print"
      className="w-[340px] rounded-2xl overflow-hidden shadow-xl"
      style={{
        fontFamily: "Segoe UI, system-ui, sans-serif",
        background: bg,
        color: text,
        border: showBorder ? `${borderWidth}px solid ${borderCol}` : "none",
      }}
    >
      <div
        className="px-4 py-3 text-white"
        style={{
          background: `linear-gradient(135deg, ${headerColor}, ${headerColor}cc)`,
        }}
      >
        <div className="flex items-center gap-3">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="w-11 h-11 rounded-lg object-contain bg-white/90 p-0.5"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-white/20 flex items-center justify-center text-lg font-black">
              {(school?.name || "S").charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black leading-tight truncate">
              {school?.name || "School"}
            </p>
            <p className="text-[10px] opacity-90 uppercase tracking-wider mt-0.5">
              {cardTitle}
            </p>
          </div>
        </div>
        {headerFields.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {headerFields.map((f) => {
              const opt = optionOf(f.key);
              const chipLabel = opt?.label || f.label;
              return (
                <span
                  key={f.key}
                  className="rounded bg-white/15 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide"
                >
                  {chipLabel}: {f.value}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 flex gap-3">
        <img
          src={photo}
          alt={person.name}
          className="w-24 h-28 rounded-xl object-cover border-2 shrink-0"
          style={{ borderColor: headerColor }}
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name || "U")}&background=e2e8f0&color=334155&size=128`;
          }}
        />
        <div className="min-w-0 flex-1 text-[11px] space-y-1">
          <p className="text-base font-bold leading-tight" style={{ color: text }}>
            {person.name}
          </p>
          {bodyFields.map((f) => (
            <Row key={f.key} label={f.label} value={f.value} mono={f.mono} />
          ))}
        </div>
      </div>

      {footerFields.length > 0 && (
        <div className="px-4 space-y-0.5">
          {footerFields.map((f) => (
            <Row
              key={f.key}
              label={f.label}
              value={f.value}
              muted
              small
            />
          ))}
        </div>
      )}

      <div className="px-4 mt-1 text-[10px] opacity-70 leading-snug">
        {school?.address || person.address || ""}
      </div>

      {design?.footerText ? (
        <div className="px-4 pb-1 text-[9px] opacity-60 italic">
          {design.footerText}
        </div>
      ) : null}

      <div
        className="mt-1 px-4 py-2 flex items-center justify-between text-[9px] text-white uppercase tracking-wide"
        style={{ background: headerColor }}
      >
        <span>
          Issued{" "}
          {person.issuedAt
            ? new Date(person.issuedAt).toLocaleDateString("en-IN")
            : "—"}
        </span>
        <span>Session {person.validSession || "—"}</span>
      </div>
    </div>
  );
}

const Row = ({ label, value, mono, muted, small }) => (
  <div className="flex gap-1.5 items-baseline">
    <span
      className={`shrink-0 ${muted ? "opacity-80" : "text-slate-400"}`}
    >
      {label}
    </span>
    <span
      className={`font-semibold text-slate-800 truncate ${mono ? "font-mono" : ""} ${small ? "text-[10px]" : ""}`}
    >
      {value || "—"}
    </span>
  </div>
);
