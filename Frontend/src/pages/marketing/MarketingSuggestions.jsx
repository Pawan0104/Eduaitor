import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { marketingApi, CHANNEL_LABELS } from "./marketingApi";
import { ChannelBadge, StatusChip, ActionButton } from "./components/bits";
import WorkflowActions from "./components/WorkflowActions";
import ScheduleModal from "./components/ScheduleModal";

export default function MarketingSuggestions() {
  const [catalog, setCatalog] = useState({ triggers: [], channels: [] });
  const [posts, setPosts] = useState([]);
  const [selectedTrigger, setSelectedTrigger] = useState("");
  const [generating, setGenerating] = useState(null);
  const [busyIds, setBusyIds] = useState({});
  const [scheduleTarget, setScheduleTarget] = useState(null);

  const reload = async () => {
    const list = await marketingApi.listPosts({ suggestion: 1 });
    setPosts(list.data.posts);
  };

  const load = async () => {
    const [cat, list] = await Promise.all([
      marketingApi.catalog(),
      marketingApi.listPosts({ suggestion: 1 }),
    ]);
    setCatalog(cat.data);
    setPosts(list.data.posts);
  };

  useEffect(() => {
    load().catch((err) => toast.error(err?.response?.data?.message || "Failed to load"));
  }, []);

  const generate = async (channel) => {
    if (!selectedTrigger) return toast.error("Pick a trigger first");
    setGenerating(channel);
    try {
      const r = await marketingApi.generate({ trigger: selectedTrigger, channel });
      toast.success(`Draft created for ${CHANNEL_LABELS[channel]}`);
      await load();
      return r;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async () => {
    if (!selectedTrigger) return toast.error("Pick a trigger first");
    setGenerating("all");
    try {
      await Promise.all(
        catalog.channels.map((c) =>
          marketingApi.generate({ trigger: selectedTrigger, channel: c }),
        ),
      );
      toast.success("Drafts created for all channels");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(null);
    }
  };

  const busy = (id, fn) => {
    setBusyIds((b) => ({ ...b, [id]: true }));
    fn?.().finally(() => setBusyIds((b) => ({ ...b, [id]: false })));
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="rounded-3xl px-5 py-6" style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 10%)" }}>
        <h1 className="text-white text-xl font-extrabold">Content Suggestions</h1>
        <p className="text-white/80 text-[12.5px] font-semibold mt-1">
          Ask AI to draft posts for any trigger, then send them for approval.
        </p>
      </div>

      {/* Trigger picker + generate */}
      <div className="rounded-2xl p-4" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
        <p className="text-[12.5px] font-extrabold mb-2" style={{ color: "rgb(var(--text))" }}>Generate from a trigger</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {catalog.triggers.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTrigger(t.key)}
              className="rounded-xl border px-3 py-2.5 text-left text-[11.5px] font-bold active:scale-95 transition-transform"
              style={{
                background: selectedTrigger === t.key ? "rgb(var(--primary))" : "rgb(var(--bg))",
                color: selectedTrigger === t.key ? "#fff" : "rgb(var(--text))",
                borderColor: selectedTrigger === t.key ? "rgb(var(--primary))" : "rgb(var(--border))",
              }}
            >
              {t.label}
              <span className="block text-[9.5px] opacity-70 font-semibold mt-0.5">{t.hint}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton tone="primary" disabled={!selectedTrigger || generating === "all"} onClick={generateAll}>
            {generating === "all" ? "Generating…" : "✨ Generate all channels"}
          </ActionButton>
          {catalog.channels.map((c) => (
            <ActionButton
              key={c}
              tone="soft"
              disabled={!selectedTrigger || generating === c || generating === "all"}
              onClick={() => generate(c)}
            >
              {generating === c ? "…" : CHANNEL_LABELS[c]}
            </ActionButton>
          ))}
        </div>
        <p className="text-[10.5px] mt-2" style={{ color: "rgb(var(--text-muted))" }}>
          Tip: creating an Event or Holiday Notice in the ERP can auto-suggest content when auto-suggest is enabled.
        </p>
      </div>

      {/* Drafts */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-extrabold px-1" style={{ color: "rgb(var(--text))" }}>Drafts & suggestions</h2>
        {!posts.length && <p className="text-[12.5px] px-1" style={{ color: "rgb(var(--text-muted))" }}>No drafts yet — generate above.</p>}
        {posts.map((p) => (
          <div key={p._id} className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <ChannelBadge channel={p.channel} />
              <StatusChip status={p.status} />
              {p.source?.trigger && (
                <span className="text-[10px] font-bold opacity-60" style={{ color: "rgb(var(--text-muted))" }}>
                  {p.source.trigger.replace(/\./g, " · ")}
                </span>
              )}
            </div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgb(var(--text))" }}>
              {p.version?.text}
            </p>
            {p.version?.hashtags?.length > 0 && (
              <p className="text-[11.5px] font-semibold" style={{ color: "rgb(var(--primary))" }}>
                {p.version.hashtags.map((h) => `#${h}`).join("  ")}
              </p>
            )}
            <WorkflowActions
              post={p}
              onChanged={(action, post) => {
                if (action === "schedule") setScheduleTarget(post);
                else busy(p._id, () => load().catch(() => {}));
              }}
            />
          </div>
        ))}
      </div>

      <ScheduleModal
        open={!!scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        onSubmit={async (scheduledAt) => {
          try {
            await marketingApi.schedule(scheduleTarget._id, scheduledAt || undefined);
            toast.success(scheduledAt ? "Scheduled" : "Queued for immediate publish");
          } catch (err) {
            toast.error(err?.response?.data?.message || "Schedule failed");
          } finally {
            setScheduleTarget(null);
            await load().catch(() => {});
          }
        }}
        title="Publish post"
      />
    </div>
  );
}