import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaExternalLinkAlt,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

/**
 * In-chapter PDF viewer with module (topic) page jumps.
 * Loads PDF via backend stream (avoids NCERT X-Frame-Options block),
 * then shows it as a blob URL in an iframe.
 *
 * @param {"catalog"|"school"} source - which API stream endpoint to use
 */
export default function ChapterPdfViewer({
  chapter,
  topics = [],
  source = "catalog",
  className = "",
}) {
  const directUrl = useMemo(
    () => chapter?.pdf?.url || chapter?.ncertPdfUrl || "",
    [chapter],
  );
  const isUploaded = Boolean(chapter?.pdf?.url);
  const portalUrl = chapter?.ncertPortalUrl || "";
  const chapterId = chapter?._id;

  const [page, setPage] = useState(1);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
    setActiveTopicId(null);
  }, [chapterId, directUrl]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    const load = async () => {
      setError("");
      setBlobUrl("");

      if (!directUrl && !chapterId) {
        setError("No PDF linked to this chapter.");
        return;
      }

      // Prefer authenticated stream so NCERT PDFs render in-app
      if (chapterId) {
        setLoading(true);
        try {
          const path =
            source === "school"
              ? `${API}/syllabus/chapters/${chapterId}/pdf-view`
              : `${API}/syllabus-catalog/chapters/${chapterId}/pdf-view`;
          const res = await axios.get(path, {
            withCredentials: true,
            responseType: "blob",
            timeout: 120000,
          });
          if (cancelled) return;
          const type = res.data?.type || "application/pdf";
          if (type.includes("json")) {
            const text = await res.data.text();
            let msg = "Failed to load PDF";
            try {
              msg = JSON.parse(text)?.message || msg;
            } catch {
              /* ignore */
            }
            setError(msg);
            return;
          }
          objectUrl = URL.createObjectURL(res.data);
          setBlobUrl(objectUrl);
        } catch (err) {
          if (cancelled) return;
          const msg =
            err.response?.data?.message ||
            err.message ||
            "Failed to load PDF";
          // If response is blob JSON error
          if (err.response?.data instanceof Blob) {
            try {
              const text = await err.response.data.text();
              const parsed = JSON.parse(text);
              setError(parsed.message || msg);
            } catch {
              setError(msg);
            }
          } else {
            setError(typeof msg === "string" ? msg : "Failed to load PDF");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      // Fallback: direct URL (uploaded only usually)
      setBlobUrl(directUrl);
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [chapterId, directUrl, source]);

  const viewerSrc = useMemo(() => {
    if (!blobUrl) return "";
    const base = blobUrl.split("#")[0];
    return `${base}#page=${page}`;
  }, [blobUrl, page]);

  const openExternal = (url) => {
    if (!url) return;
    const base = url.split("#")[0];
    window.open(`${base}#page=${page}`, "_blank", "noopener,noreferrer");
  };

  const jumpToTopic = (topic) => {
    const from = Number(topic.pageFrom);
    if (Number.isFinite(from) && from >= 1) {
      setPage(from);
      setActiveTopicId(topic._id || topic.name);
    }
  };

  if (!directUrl && !chapterId) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center ${className}`}
      >
        <p className="text-sm text-slate-500">
          No chapter PDF linked yet. Upload a PDF or set an NCERT PDF URL.
        </p>
        {portalUrl ? (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-800"
          >
            <FaExternalLinkAlt size={10} /> Open on NCERT
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5">
            <FaFilePdf /> Chapter PDF {isUploaded ? "(uploaded)" : "(NCERT)"}
          </p>
          <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
            {chapter?.pdf?.name || chapter?.name || "Textbook chapter"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-lg border border-slate-200 text-slate-600"
            title="Previous page"
          >
            <FaChevronLeft size={12} />
          </button>
          <span className="text-xs font-semibold text-slate-700 min-w-[4.5rem] text-center">
            Page {page}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600"
            title="Next page"
          >
            <FaChevronRight size={12} />
          </button>
          <button
            type="button"
            onClick={() => openExternal(directUrl || viewerSrc)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-300 text-emerald-900 bg-white"
          >
            <FaExternalLinkAlt size={10} /> Open
          </button>
        </div>
      </div>

      {topics.some((t) => t.pageFrom) ? (
        <div className="flex flex-wrap gap-1.5">
          {topics.map((t, idx) => {
            if (!t.pageFrom) return null;
            const id = t._id || t.name || idx;
            const active = activeTopicId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => jumpToTopic(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                  active
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                }`}
                title={
                  t.pageTo
                    ? `Pages ${t.pageFrom}–${t.pageTo}`
                    : `Page ${t.pageFrom}`
                }
              >
                {idx + 1}. {t.name}
                <span className="opacity-70 ml-1">
                  p.{t.pageFrom}
                  {t.pageTo ? `–${t.pageTo}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-16 text-center">
          <p className="text-sm text-slate-600">Loading chapter PDF…</p>
          <p className="text-[11px] text-slate-400 mt-1">
            First open may take a few seconds
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center space-y-3">
          <p className="text-sm text-slate-700">{error}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {directUrl ? (
              <a
                href={`${directUrl.split("#")[0]}#page=${page}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white"
              >
                <FaExternalLinkAlt size={10} /> Open PDF in new tab
              </a>
            ) : null}
            {portalUrl ? (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-300 bg-white text-emerald-900"
              >
                Open NCERT page
              </a>
            ) : null}
          </div>
          {!isUploaded ? (
            <p className="text-[11px] text-slate-500">
              Tip: Super Admin can upload the chapter PDF for a more reliable
              in-app view.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
          <iframe
            key={viewerSrc}
            title={`PDF — ${chapter?.name || "chapter"}`}
            src={viewerSrc}
            className="w-full h-[55vh] min-h-[320px] bg-white"
          />
        </div>
      )}
    </div>
  );
}
