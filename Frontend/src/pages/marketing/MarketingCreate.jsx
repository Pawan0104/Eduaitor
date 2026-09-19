import { useState } from "react";
import { toast } from "react-toastify";
import { marketingApi, CHANNEL_LABELS, CHANNEL_COLORS } from "./marketingApi";
import { StatusChip, ActionButton } from "./components/bits";
import WorkflowActions from "./components/WorkflowActions";

const CHANNELS = Object.keys(CHANNEL_LABELS);

export default function MarketingCreate() {
  const [channel, setChannel] = useState("facebook");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [cta, setCta] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastPost, setLastPost] = useState(null);

  const save = async () => {
    if (!text.trim()) return toast.error("Write some text first");
    setSaving(true);
    try {
      const payload = {
        channel,
        title: title.trim(),
        text: text.trim(),
        hashtags: hashtags.split(/[\s,]+/).filter(Boolean),
        cta: cta.trim(),
        media: mediaUrl.trim() ? [{ url: mediaUrl.trim() }] : [],
      };
      const r = await marketingApi.createManual(payload);
      setLastPost(r.data.post);
      toast.success("Draft saved");
      setTitle("");
      setText("");
      setHashtags("");
      setCta("");
      setMediaUrl("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save draft");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="rounded-3xl px-5 py-6" style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 10%)" }}>
        <h1 className="text-white text-xl font-extrabold">Create Post</h1>
        <p className="text-white/80 text-[12.5px] font-semibold mt-1">Write manually and send for approval.</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
        <div className="flex flex-wrap gap-2 mb-4">
          {CHANNELS.map((c) => {
            const col = CHANNEL_COLORS[c] || {};
            const active = channel === c;
            return (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className="rounded-xl px-3.5 py-2 text-[12.5px] font-extrabold active:scale-95 transition-transform"
                style={{
                  background: active ? col.icon || "rgb(var(--primary))" : "rgb(var(--bg))",
                  color: active ? "#fff" : "rgb(var(--text))",
                  border: active ? "none" : "1px solid rgb(var(--border))",
                }}
              >
                {CHANNEL_LABELS[c]}
              </button>
            );
          })}
        </div>

        {channel === "blog" && (
          <label className="block mb-3">
            <span className="text-[11.5px] font-bold block mb-1" style={{ color: "rgb(var(--text-muted))" }}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog post title"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
            />
          </label>
        )}

        <label className="block mb-3">
          <span className="text-[11.5px] font-bold block mb-1" style={{ color: "rgb(var(--text-muted))" }}>Post text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={channel === "blog" ? "Write your blog draft…" : "What do you want to share?"}
            className="w-full rounded-xl border px-3 py-2.5 text-sm leading-relaxed"
            style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-[11.5px] font-bold block mb-1" style={{ color: "rgb(var(--text-muted))" }}>Hashtags (comma / space)</span>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="SchoolEvents AdmissionsOpen"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-bold block mb-1" style={{ color: "rgb(var(--text-muted))" }}>Call to action</span>
            <input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Apply Now / Register / …"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
            />
          </label>
        </div>

        <label className="block mb-4">
          <span className="text-[11.5px] font-bold block mb-1" style={{ color: "rgb(var(--text-muted))" }}>Image URL (Instagram requires one)</span>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://…/poster.jpg"
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
          />
        </label>

        <ActionButton onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Draft"}
        </ActionButton>
      </div>

      {lastPost && (
        <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold" style={{ color: "rgb(var(--text-muted))" }}>Last draft</span>
            <StatusChip status={lastPost.status} />
          </div>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgb(var(--text))" }}>
            {lastPost.versions?.[lastPost.currentVersion]?.text}
          </p>
          <WorkflowActions
            post={lastPost}
            onChanged={async (action) => {
              if (action === "schedule") return;
              try {
                const r = await marketingApi.getPost(lastPost._id);
                setLastPost(r.data.post);
              } catch {
                setLastPost(null);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}