import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { marketingApi } from "./marketingApi";
import { ChannelBadge } from "./components/bits";
import ScheduleModal from "./components/ScheduleModal";

export default function MarketingApprovals() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null); // post under review
  const [text, setText] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const load = async () => {
    try {
      const r = await marketingApi.listPosts({ status: "PENDING" });
      setPosts(r.data.posts);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openReview = (p) => {
    setReview(p);
    const v = p.version || {};
    setText(v.text || "");
    setHashtags((v.hashtags || []).join(" "));
    setReason("");
    setRejecting(false);
  };

  const closeReview = () => {
    setReview(null);
    setScheduleOpen(false);
  };

  const approve = async (scheduledAt) => {
    try {
      let payload = scheduledAt ? { scheduledAt } : {};
      // Apply edits first (edit demotes to draft, then resubmit so it can approve).
      const changed = text !== review.version?.text ||
        (hashtags.trim() ? hashtags.split(/\s+/).join(" ") : "") !== (review.version?.hashtags || []).join(" ");
      if (changed) {
        await marketingApi.edit(review._id, {
          text,
          hashtags: hashtags.split(/\s+/).filter(Boolean),
          cta: review.version?.cta || "",
          reason: "Edited during review",
        });
        await marketingApi.submit(review._id);
      }
      await marketingApi.approve(review._id, payload);
      toast.success(scheduledAt ? "Approved & scheduled" : "Approved & queued for publish");
      closeReview();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Approval failed");
    }
  };

  const doReject = async () => {
    if (!reason.trim()) return toast.error("Please add a rejection reason");
    try {
      await marketingApi.reject(review._id, reason.trim());
      toast.success("Rejected");
      closeReview();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reject failed");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="rounded-3xl px-5 py-6" style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 10%)" }}>
        <h1 className="text-white text-xl font-extrabold">Approval Queue</h1>
        <p className="text-white/80 text-[12.5px] font-semibold mt-1">
          Review AI-generated content. Nothing publishes without your approval.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-sm mt-10" style={{ color: "rgb(var(--text-muted))" }}>Loading…</p>
      ) : !posts.length ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-extrabold" style={{ color: "rgb(var(--text))" }}>All caught up</p>
          <p className="text-[12.5px] mt-1" style={{ color: "rgb(var(--text-muted))" }}>
            No posts waiting for approval.
          </p>
        </div>
      ) : (
        posts.map((p) => (
          <div key={p._id} className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <ChannelBadge channel={p.channel} />
              <span className="text-[10px] font-bold opacity-60" style={{ color: "rgb(var(--text-muted))" }}>
                {p.source?.trigger?.replace(/\./g, " · ")} · by {p.workflow?.submittedBy || "—"}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgb(var(--text))" }}>
              {p.version?.text}
            </p>
            {p.version?.hashtags?.length > 0 && (
              <p className="text-[11.5px] font-semibold" style={{ color: "rgb(var(--primary))" }}>
                {p.version.hashtags.map((h) => `#${h}`).join("  ")}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => openReview(p)}
                className="rounded-xl px-3.5 py-2 text-[12.5px] font-extrabold text-white active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 100%)" }}
              >
                Review
              </button>
              <button
                onClick={() => marketingApi.discard(p._id).then(load).catch(() => {})}
                className="rounded-xl px-3.5 py-2 text-[12.5px] font-extrabold"
                style={{ background: "#FEE2E2", color: "#B91C1C" }}
              >
                Discard
              </button>
            </div>
          </div>
        ))
      )}

      {/* Review modal */}
      {review && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
            style={{ background: "rgb(var(--bg))" }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wide mb-2" style={{ color: "rgb(var(--text-muted))" }}>
              Reviewing {review.channel} post · {review.source?.trigger || "manual"}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="w-full rounded-2xl border px-3 py-2.5 text-[13.5px] leading-relaxed mb-3"
              style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
            />
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="Hashtags"
              className="w-full rounded-xl border px-3 py-2.5 text-sm mb-4"
              style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
            />

            {rejecting ? (
              <div className="flex flex-col gap-3 mb-4">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why are you rejecting this?"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm"
                  style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
                />
                <div className="flex gap-2">
                  <button onClick={doReject} className="flex-1 rounded-xl py-2.5 text-sm font-extrabold text-white" style={{ background: "#DC2626" }}>
                    Confirm Reject
                  </button>
                  <button onClick={() => setRejecting(false)} className="flex-1 rounded-xl py-2.5 text-sm font-extrabold" style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setScheduleOpen(true)}
                  className="flex-1 rounded-xl py-3 text-sm font-extrabold text-white active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 100%)" }}
                >
                  Approve ✓
                </button>
                <button
                  onClick={() => setRejecting(true)}
                  className="flex-1 rounded-xl py-3 text-sm font-extrabold"
                  style={{ background: "#FEE2E2", color: "#B91C1C" }}
                >
                  Reject ✕
                </button>
                <button
                  onClick={closeReview}
                  className="px-4 rounded-xl text-sm font-extrabold"
                  style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSubmit={(scheduledAt) => approve(scheduledAt)}
        title="Approve & publish"
      />
    </div>
  );
}