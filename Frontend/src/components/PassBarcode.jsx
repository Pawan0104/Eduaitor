import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { toast } from "react-toastify";
import { FaBarcode, FaCopy, FaDownload, FaShareAlt } from "react-icons/fa";

export default function PassBarcode({
  code,
  studentName = "",
  pickupName = "",
  compact = false,
  showActions = true,
  title = "Pickup Barcode & Code",
}) {
  const svgRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: "CODE128",
        lineColor: "#0f172a",
        background: "#ffffff",
        width: compact ? 1.4 : 2,
        height: compact ? 42 : 64,
        displayValue: false,
        margin: 0,
      });
    } catch (err) {
      console.error("Barcode render failed:", err);
    }
  }, [code, compact]);

  if (!code) return null;

  const shareText = [
    "School Gate Pass pickup code",
    `Code: ${code}`,
    studentName ? `Student: ${studentName}` : "",
    pickupName ? `Pickup person: ${pickupName}` : "",
    "Show this barcode/code at the school gate for verification.",
  ]
    .filter(Boolean)
    .join("\n");

  const copyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const temp = document.createElement("textarea");
        temp.value = code;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopied(true);
      toast.success("Pickup code copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the pickup code");
    }
  };

  const downloadBarcode = () => {
    if (!svgRef.current) return;
    try {
      const clone = svgRef.current.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const source = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gate-pass-${code}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Barcode downloaded");
    } catch {
      toast.error("Could not download the barcode");
    }
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgba(var(--primary),0.04)] p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-[rgb(var(--text))]">
          {title}
        </p>
        <span className="flex items-center gap-1 text-[10px] text-[rgb(var(--text-muted))]">
          <FaBarcode size={10} /> Code 128
        </span>
      </div>

      <div className="bg-white rounded-lg px-3 py-2 flex justify-center overflow-x-auto">
        <svg ref={svgRef} className="max-w-full" aria-label={`Barcode for ${code}`} />
      </div>

      <div className="mt-2 flex flex-col items-center gap-2">
        <p className="font-mono text-sm md:text-base font-bold tracking-wide text-[rgb(var(--text))] break-all text-center">
          {code}
        </p>

        {showActions && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgb(var(--primary))] text-white hover:opacity-90 transition"
            >
              <FaCopy size={11} /> {copied ? "Copied" : "Copy Code"}
            </button>
            <button
              type="button"
              onClick={downloadBarcode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgba(var(--primary),0.08)] transition"
            >
              <FaDownload size={11} /> Download
            </button>
            <button
              type="button"
              onClick={shareOnWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition"
            >
              <FaShareAlt size={11} /> Share
            </button>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-center text-[rgb(var(--text-muted))]">
        Share this barcode/code with the pickup person. The school will scan or
        enter it to verify before approval.
      </p>
    </div>
  );
}
