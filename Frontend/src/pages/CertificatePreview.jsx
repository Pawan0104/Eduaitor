/** Printable certificate layout driven by school template + generated body. */

export default function CertificatePreview({ certificate }) {
  if (!certificate) return null;

  const { template, school, bodyText, vars } = certificate;
  const color = template?.primaryColor || "#1e3a5f";
  const accent = template?.accentColor || "#c9a227";
  const borderStyle = template?.borderStyle || "classic";
  const bg = template?.backgroundColor || "#ffffff";
  const text = template?.textColor || "#0f172a";
  const borderColor = template?.borderColor || color;
  const logo = template?.logoUrl || school?.logo;

  const borderClass =
    borderStyle === "modern"
      ? "border-[3px]"
      : borderStyle === "minimal"
        ? "border"
        : "border-[6px] border-double";

  return (
    <div
      className={`certificate-sheet relative mx-auto ${borderClass} p-8 sm:p-10`}
      style={{
        background: bg,
        color: text,
        borderColor: template?.showBorder === false ? "transparent" : borderColor,
        maxWidth: "800px",
        minHeight: "1000px",
      }}
    >
      {template?.showBorder !== false && borderStyle === "classic" && (
        <div
          className="pointer-events-none absolute inset-3 border"
          style={{ borderColor: accent }}
        />
      )}

      <div className="relative text-center">
        {template?.showLogo !== false && logo ? (
          <img
            src={logo}
            alt=""
            className="mx-auto mb-3 h-16 w-16 rounded-full object-contain"
          />
        ) : null}

        <h1
          className="text-xl font-black tracking-wide sm:text-2xl"
          style={{ color }}
        >
          {school?.name || "School"}
        </h1>
        {school?.address ? (
          <p className="mt-1 text-xs opacity-70">{school.address}</p>
        ) : null}
        {(school?.phone || school?.email) && (
          <p className="mt-0.5 text-[11px] opacity-60">
            {[school.phone, school.email].filter(Boolean).join(" · ")}
          </p>
        )}

        <div
          className="mx-auto mt-5 mb-2 h-1 w-28 rounded-full"
          style={{ background: accent }}
        />

        <h2
          className="mt-4 text-lg font-extrabold uppercase tracking-[0.18em] sm:text-xl"
          style={{ color }}
        >
          {template?.title}
        </h2>
        {template?.subtitle ? (
          <p className="mt-1 text-sm italic opacity-75">
            {template.subtitle}
          </p>
        ) : null}

        <p className="mt-3 text-xs font-semibold opacity-60">
          Certificate No: {vars?.certificateNo}
        </p>
      </div>

      <div className="relative mt-8 whitespace-pre-wrap text-[14.5px] leading-7 sm:text-[15px]">
        {bodyText}
      </div>

      {template?.footerText ? (
        <p className="relative mt-8 text-center text-xs italic text-slate-500">
          {template.footerText}
        </p>
      ) : null}

      <div className="relative mt-14 flex flex-col items-end gap-1 pr-4">
        <div
          className="mb-8 h-px w-40"
          style={{ background: color }}
        />
        <p className="text-sm font-bold" style={{ color }}>
          {template?.signatoryName || "Principal"}
        </p>
        <p className="text-xs text-slate-600">
          {template?.signatoryDesignation || "Principal"}
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          Date: {vars?.issueDate}
        </p>
      </div>
    </div>
  );
}
