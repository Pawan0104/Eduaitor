import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  marketingApi,
  CHANNEL_LABELS,
  CHANNEL_COLORS,
} from "./marketingApi";
import { ChannelBadge, StatusChip, ActionButton } from "./components/bits";

const fmtDate = (key) => {
  if (!key) return "Unscheduled";
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

export default function SuperAdminAutopilot() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [publishingId, setPublishingId] = useState(null);

  const load = async () => {
    const [s, list] = await Promise.all([
      marketingApi.autopilotStatus(),
      marketingApi.listPosts({ autopilot: 1 }),
    ]);
    setStatus(s.data);
    setPosts(list.data.posts);
  };

  useEffect(() => {
    load()
      .catch((err) => toast.error(err?.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => {
      const key = p.source?.entityId || p.createdAt?.slice(0, 10) || "unscheduled";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return [...map.entries()]
      .sort((a, b) => (a[0] === "unscheduled" ? 1 : b[0] === "unscheduled" ? -1 : a[0].localeCompare(b[0])));
  }, [posts]);

  const runPlan = async () => {
    setRunning(true);
    try {
      const r = await marketingApi.runAutopilot({});
      if (r.data?.message && !r.data?.generated) {
        toast.info(r.data.message);
        if (!status?.accounts?.length) navigate("/marketing/accounts");
      } else {
        toast.success(`Autopilot created ${r.data.generated} draft(s) for ${fmtDate(r.data.date)}`);
      }
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Autopilot run failed");
    } finally {
      setRunning(false);
    }
  };

  const approvePost = async (post) => {
    setPublishingId(post._id);
    try {
      const r = await marketingApi.approveAndPublish(post._id);
      toast.success(
        r.data?.alreadyPublished
          ? "Already published"
          : `Posted to ${CHANNEL_LABELS[post.channel]}`,
      );
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Posting failed");
      await load().catch(() => {});
    } finally {
      setPublishingId(null);
    }
  };

  const canApprove = (p) =>
    ["DRAFT", "PENDING", "REJECTED", "FAILED"].includes(p.status);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <div className="rounded-3xl px-5 py-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 10%)" }}>
        <h1 className="text-white text-xl font-extrabold">Eduaitor Marketing Autopilot</h1>
        <p className="text-white/80 text-[12.5px] font-semibold mt-1">
          Every day we draft fresh posts from our website — caption, hashtags and a
          designed image — ready for your approval.
        </p>
      </div>

      {/* Run plan */}
      <div className="rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
        <div>
          <p className="text-[13px] font-extrabold" style={{ color: "rgb(var(--text))" }}>
            Today's plan {
              status?.hasPlanForNextDate
                ? `ready for ${fmtDate(status.scheduledDate)}`
                : "not generated yet"
            }
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "rgb(var(--text-muted))" }}>
            {status?.pendingCount ?? 0} awaiting approval · {status?.publishedCount ?? 0} posted
          </p>
        </div>
        <div className="flex gap-2">
          <ActionButton tone="soft" onClick={() => navigate("/marketing/accounts")}>
            {status?.accounts?.length ? "Manage Accounts" : "🔗 Link Accounts"}
          </ActionButton>
          <ActionButton disabled={running} onClick={runPlan}>
            {running ? "Writing…" : "✨ Generate next day's posts"}
          </ActionButton>
        </div>
      </div>

      {/* Connected accounts */}
      {status?.accounts?.length ? (
        <div className="flex flex-wrap gap-2">
          {status.accounts.map((a) => (
            <span
              key={a._id}
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-[11.5px] font-extrabold"
              style={{ background: (CHANNEL_COLORS[a.channel] || {}).bg || "#F3F4F6", color: (CHANNEL_COLORS[a.channel] || {}).icon || "#6B7280" }}
            >
              {CHANNEL_LABELS[a.channel]} · {a.name || a.mode}
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </span>
          ))}
        </div>
      ) : (
        !loading && (
          <button
            onClick={() => navigate("/marketing/accounts")}
            className="rounded-2xl border px-4 py-3 text-left text-[12.5px] font-bold"
            style={{ borderColor: "rgb(var(--primary))", color: "rgb(var(--primary))" }}
          >
            ⚠️ No accounts linked yet — the autopilot can't post. Link Facebook / Instagram →
          </button>
        )
      )}

      {/* Day-wise queue */}
      {loading ? (
        <p className="text-center text-sm mt-10" style={{ color: "rgb(var(--text-muted))" }}>Loading…</p>
      ) : !groups.length ? (
        <p className="text-center text-sm mt-8" style={{ color: "rgb(var(--text-muted))" }}>
          No suggestions yet. Link an account and generate the next day's plan above.
        </p>
      ) : (
        groups.map(([day, dayPosts]) => (
          <section key={day} className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold px-1 pt-2" style={{ color: "rgb(var(--text))" }}>
              📅 {fmtDate(day)}
            </h2>
            {dayPosts.map((p) => (
              <div key={p._id} className="rounded-2xl p-4 flex gap-3" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
                {p.version?.media?.[0]?.url && (
                  <img
                    src={p.version.media[0].url}
                    alt="post"
                    className="w-24 h-24 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ChannelBadge channel={p.channel} />
                    <StatusChip status={p.status} />
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgb(var(--text))" }}>
                    {p.version?.text}
                  </p>
                  {p.version?.hashtags?.length > 0 && (
                    <p className="text-[11.5px] font-semibold" style={{ color: "rgb(var(--primary))" }}>
                      {p.version.hashtags.map((h) => `#${h}`).join("  ")}
                    </p>
                  )}
                  {p.version?.cta && (
                    <p className="text-[11px] font-bold" style={{ color: "rgb(var(--text-muted))" }}>
                      CTA: {p.version.cta}
                    </p>
                  )}
                  {p.publish?.lastError && (
                    <p className="text-[11px] font-semibold text-red-500">{p.publish.lastError}</p>
                  )}
                  {canApprove(p) && (
                    <div className="mt-1">
                      <ActionButton
                        disabled={publishingId === p._id}
                        onClick={() => approvePost(p)}
                      >
                        {publishingId === p._id ? "Posting…" : "✅ Approve & Post"}
                      </ActionButton>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}