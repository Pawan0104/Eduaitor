import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { marketingApi, CHANNEL_LABELS, CHANNEL_COLORS, fmtDate } from "./marketingApi";
import { ActionButton } from "./components/bits";

const CHANNELS = ["facebook", "instagram"];

export default function MarketingAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [oauthInfo, setOauthInfo] = useState(null);
  const [channel, setChannel] = useState("facebook");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = async () => {
    try {
      const r = await marketingApi.accounts();
      setAccounts(r.data.accounts);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const callbackUrl = () => {
    const base = window.location.pathname.replace(/\/accounts$/, "");
    return `${window.location.origin}${base}/oauth/callback`;
  };

  /** Primary flow: Facebook Login in a new full-page redirect → auto token. */
  const startOAuth = async (channel) => {
    try {
      const r = await marketingApi.connectUrl(channel, callbackUrl());
      if (r.data?.needsConfig) {
        setOauthInfo(channel);
        return;
      }
      window.location.href = r.data.url;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not start Facebook Login");
    }
  };

  const connect = async () => {
    if (!token.trim()) return toast.error("Paste an access token first.");
    setSaving(true);
    try {
      await marketingApi.connect({
        channel,
        name: name.trim() || undefined,
        mode: "dev",
        token: token.trim(),
      });
      toast.success(`${CHANNEL_LABELS[channel]} connected`);
      setShowConnect(false);
      setOauthInfo(null);
      setToken("");
      setName("");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Connect failed");
    } finally {
      setSaving(false);
    }
  };

  const test = async (id) => {
    try {
      await marketingApi.testAccount(id);
      toast.success("Token works");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Token failed");
    }
  };

  const disconnect = async (a) => {
    if (!window.confirm(`Disconnect ${a.name || a.channel}?`)) return;
    try {
      await marketingApi.disconnect(a._id);
      toast.success("Disconnected");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to disconnect");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="rounded-3xl px-5 py-6" style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 10%)" }}>
        <h1 className="text-white text-xl font-extrabold">Connected Accounts</h1>
        <p className="text-white/80 text-[12.5px] font-semibold mt-1">
          Click a button, sign in on Facebook — we handle the rest. No tokens to copy.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => setShowConnect(true)}>+ Connect Account</ActionButton>
        {accounts.length === 0 && !loading && (
          <ActionButton tone="soft" onClick={() => setShowConnect(true)}>
            Need help connecting?
          </ActionButton>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm mt-8" style={{ color: "rgb(var(--text-muted))" }}>Loading…</p>
      ) : !accounts.length ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
          <p className="text-3xl mb-2">📣</p>
          <p className="text-sm font-extrabold" style={{ color: "rgb(var(--text))" }}>No accounts connected</p>
          <p className="text-[12.5px] mt-1" style={{ color: "rgb(var(--text-muted))" }}>
            Click “Connect Account”, sign in with Facebook, and approve posting — done in seconds.
          </p>
        </div>
      ) : (
        accounts.map((a) => {
          const col = CHANNEL_COLORS[a.channel] || {};
          return (
            <div key={a._id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shrink-0"
                style={{ background: col.icon || "#6B7280" }}
              >
                {a.channel === "whatsapp" ? "💬" : a.channel === "blog" ? "✍️" : "📣"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-extrabold truncate" style={{ color: "rgb(var(--text))" }}>
                  {a.accountMeta?.name || a.name || CHANNEL_LABELS[a.channel]}
                </p>
                <p className="text-[11px] font-semibold" style={{ color: "rgb(var(--text-muted))" }}>
                  {CHANNEL_LABELS[a.channel]} · {a.mode === "oauth" ? "Connected via Facebook Login" : "Developer token"} · {a.status}
                  {a.accountMeta?.pageId ? ` · Page ${a.accountMeta.pageId}` : ""}
                  {a.lastTestedAt ? ` · last tested ${fmtDate(a.lastTestedAt)}` : ""}
                </p>
                {a.lastError && (
                  <p className="text-[10.5px] font-bold text-rose-600">{a.lastError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <ActionButton tone="soft" onClick={() => test(a._id)}>Test</ActionButton>
                <ActionButton tone="danger" onClick={() => disconnect(a)}>Remove</ActionButton>
              </div>
            </div>
          );
        })
      )}

      {/* Connect modal */}
      {showConnect && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: "rgb(var(--bg))" }}>
            <h2 className="text-lg font-extrabold mb-1" style={{ color: "rgb(var(--text))" }}>Connect your social account</h2>
            <p className="text-[12px] mb-4" style={{ color: "rgb(var(--text-muted))" }}>
              One click sign-in — no tokens, no IDs. We auto-detect your Page and Instagram account.
            </p>

            {/* Primary OAuth buttons */}
            <div className="grid gap-2 mb-4">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  onClick={() => startOAuth(c)}
                  disabled={!!oauthInfo}
                  className="rounded-2xl py-3.5 px-4 text-sm font-extrabold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                  style={{
                    background:
                      c === "facebook"
                        ? "linear-gradient(135deg,#1877F2,#0A58CA)"
                        : "linear-gradient(135deg,#E1306C,#BC2A8D)",
                  }}
                >
                  {c === "facebook" ? "🅕 Connect Facebook" : "◉ Connect Instagram"}
                </button>
              ))}
            </div>

            {oauthInfo && (
              <div className="rounded-2xl border p-3 mb-4 text-[12px] leading-relaxed" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface))", color: "rgb(var(--text))" }}>
                <p className="font-extrabold mb-1">
                  {oauthInfo === "facebook" ? "Facebook Login" : "Instagram Login"} isn't switched on yet
                </p>
                <p style={{ color: "rgb(var(--text-muted))" }}>
                  Clicking the button opens Facebook's own login — which needs Eduaitor's Meta app ID to be
                  configured on the server (<span style={{ fontFamily: "monospace" }}>MARKETING_META_APP_ID</span>).
                  Until then, use the <b>Advanced</b> option below, or ask the Eduaitor team to enable it.
                </p>
              </div>
            )}

            {/* Advanced: paste token */}
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full rounded-2xl border px-3 py-2.5 text-[12.5px] font-extrabold text-left flex items-center justify-between"
              style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--text))", background: "rgb(var(--surface))" }}
            >
              <span>Advanced: paste an access token</span>
              <span className="text-[10px]">{showAdvanced ? "▲" : "▼"}</span>
            </button>
            {showAdvanced && (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {["facebook", "instagram", "linkedin", "whatsapp"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setChannel(c)}
                      className="rounded-xl px-3 py-1.5 text-[12px] font-extrabold active:scale-95 transition-transform"
                      style={{
                        background: channel === c ? (CHANNEL_COLORS[c]?.icon || "rgb(var(--primary))") : "rgb(var(--surface))",
                        color: channel === c ? "#fff" : "rgb(var(--text))",
                        border: channel === c ? "none" : "1px solid rgb(var(--border))",
                      }}
                    >
                      {CHANNEL_LABELS[c]}
                    </button>
                  ))}
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Account name (optional)"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm mb-3"
                  style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
                />
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  rows={3}
                  placeholder="Paste a Facebook / Instagram access token"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm mb-3"
                  style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
                />
                <p className="text-[10.5px] mb-3 leading-relaxed" style={{ color: "rgb(var(--text-muted))" }}>
                  Where to get one: developers.facebook.com → <b>Graph API Explorer</b> → pick your Page →
                  add permissions (<b>pages_show_list</b>, <b>pages_manage_posts</b>, and for Instagram also
                  <b> instagram_basic</b>, <b>instagram_content_publish</b>) → Generate Access Token. The token is
                  stored encrypted on our server.
                </p>
                <ActionButton tone="soft" disabled={saving} onClick={connect}>
                  {saving ? "Connecting…" : "Connect with token"}
                </ActionButton>
              </div>
            )}

            <button
              onClick={() => { setShowConnect(false); setOauthInfo(null); }}
              className="w-full mt-3 rounded-2xl border py-2.5 text-sm font-extrabold"
              style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--text))" }}
            >
              Close
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}