import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { marketingApi, fmtDate } from "./marketingApi";
import { ChannelBadge } from "./components/bits";

const KPI = [
  { key: "DRAFT", label: "Drafts", to: "suggestions" },
  { key: "PENDING", label: "Pending Approval", to: "approvals" },
  { key: "APPROVED", label: "Approved", to: "suggestions" },
  { key: "SCHEDULED", label: "Scheduled", to: "suggestions" },
  { key: "PUBLISHED", label: "Published", to: "suggestions" },
  { key: "FAILED", label: "Needs Attention", to: "suggestions" },
];

const MARKETING_BASE = {
  super_admin: "/marketing",
  school_admin: "/school/marketing",
  teacher_admin: "/teacher/marketing",
  staff_admin: "/staff/marketing",
};

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = MARKETING_BASE[user?.role] || "/school/marketing";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const go = (to) => navigate(`${base}/${to}`);

  const load = async () => {
    try {
      const r = await marketingApi.dashboard();
      setData(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div className="rounded-3xl px-5 py-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 10%)" }}>
        <h1 className="text-white text-xl font-extrabold">Marketing AI</h1>
        <p className="text-white/80 text-[12.5px] font-semibold mt-1">
          Generate, approve and publish social content from your school's ERP data.
        </p>
      </div>

      {data && data.activeAccounts === 0 && (
        <button
          onClick={() => go("accounts")}
          className="rounded-2xl border px-4 py-3 text-left text-[12.5px] font-bold"
          style={{ borderColor: "rgb(var(--primary))", color: "rgb(var(--primary))" }}
        >
          ⚠️ No social accounts connected — publishing is disabled. Connect now →
        </button>
      )}

      {loading ? (
        <p className="text-center text-sm mt-10" style={{ color: "rgb(var(--text-muted))" }}>Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {KPI.map((k) => (
              <button
                key={k.key}
                onClick={() => go(k.to)}
                className="rounded-2xl p-4 text-left shadow-sm active:scale-95 transition-transform"
                style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}
              >
                <p className="text-2xl font-extrabold" style={{ color: "rgb(var(--text))" }}>
                  {data?.counts?.[k.key] ?? 0}
                </p>
                <p className="text-[11.5px] font-bold mt-1" style={{ color: "rgb(var(--text-muted))" }}>
                  {k.label}
                </p>
              </button>
            ))}
            <button
              onClick={() => go("accounts")}
              className="rounded-2xl p-4 text-left shadow-sm active:scale-95 transition-transform"
              style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}
            >
              <p className="text-2xl font-extrabold" style={{ color: "rgb(var(--text))" }}>
                {data?.activeAccounts ?? 0}
              </p>
              <p className="text-[11.5px] font-bold mt-1" style={{ color: "rgb(var(--text-muted))" }}>
                Connected Accounts
              </p>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
              <h2 className="text-sm font-extrabold mb-3" style={{ color: "rgb(var(--text))" }}>Upcoming scheduled</h2>
              {data?.upcoming?.length ? (
                data.upcoming.map((u) => (
                  <div key={u._id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: "rgb(var(--border))" }}>
                    <ChannelBadge channel={u.channel} />
                    <p className="flex-1 text-[12px] font-semibold truncate" style={{ color: "rgb(var(--text-muted))" }}>
                      {u.excerpt || "—"}
                    </p>
                    <span className="text-[10.5px] font-bold text-blue-600">{fmtDate(u.scheduledAt)}</span>
                  </div>
                ))
              ) : (
                <p className="text-[12.5px]" style={{ color: "rgb(var(--text-muted))" }}>Nothing scheduled.</p>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))" }}>
              <h2 className="text-sm font-extrabold mb-3" style={{ color: "rgb(var(--text))" }}>Recently published</h2>
              {data?.recent?.length ? (
                data.recent.map((r) => (
                  <div key={r._id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: "rgb(var(--border))" }}>
                    <ChannelBadge channel={r.channel} />
                    <p className="flex-1 text-[12px] font-semibold truncate" style={{ color: "rgb(var(--text-muted))" }}>
                      {r.excerpt || "—"}
                    </p>
                    <span className="text-[10.5px] font-bold text-green-600">{fmtDate(r.publishedAt)}</span>
                  </div>
                ))
              ) : (
                <p className="text-[12.5px]" style={{ color: "rgb(var(--text-muted))" }}>Nothing published yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}