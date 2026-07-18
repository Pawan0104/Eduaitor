import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHotel,
  FaBed,
  FaUserFriends,
  FaIdCard,
  FaClipboardList,
} from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";

const HostelManagement = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const { t } = useLanguage();

  const cards = [
    {
      titleKey: "hostel.hostels",
      descKey: "hostel.hostelsDesc",
      icon: <FaHotel size={20} />,
      tone: "bg-indigo-50 text-indigo-600",
      path: "/school/hostel/buildings",
      ready: true,
    },
    {
      titleKey: "hostel.rooms",
      descKey: "hostel.roomsDesc",
      icon: <FaBed size={20} />,
      tone: "bg-emerald-50 text-emerald-600",
      path: "/school/hostel/rooms",
      ready: true,
    },
    {
      titleKey: "hostel.residents",
      descKey: "hostel.residentsDesc",
      icon: <FaUserFriends size={20} />,
      tone: "bg-amber-50 text-amber-600",
      path: "/school/hostel/residents",
      ready: true,
    },
    {
      titleKey: "hostel.visitors",
      descKey: "hostel.visitorsDesc",
      icon: <FaIdCard size={20} />,
      tone: "bg-violet-50 text-violet-600",
      path: "/school/hostel/visitors",
      ready: true,
    },
    {
      titleKey: "hostel.records",
      descKey: "hostel.recordsDesc",
      icon: <FaClipboardList size={20} />,
      tone: "bg-rose-50 text-rose-600",
      ready: false,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-xl bg-[rgb(var(--surface))] shadow-sm border border-slate-100 text-sm font-bold text-slate-600"
        >
          <FaArrowLeft size={14} /> {t("common.back")}
        </button>
      )}

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t("hostel.title")}</h1>
        <p className="text-sm mt-1 text-[rgb(var(--text-muted))]">
          {t("hostel.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <button
            key={card.titleKey}
            type="button"
            disabled={!card.ready}
            onClick={() => card.path && navigate(card.path)}
            className={`text-left rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm transition
              ${card.ready
                ? "hover:border-indigo-300 hover:shadow-md cursor-pointer"
                : "opacity-70 cursor-not-allowed"}`}
          >
            <div
              className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${card.tone}`}
            >
              {card.icon}
            </div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t(card.titleKey)}</h2>
              {!card.ready && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {t("common.soon")}
                </span>
              )}
            </div>
            <p className="text-xs mt-1 text-[rgb(var(--text-muted))]">
              {t(card.descKey)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HostelManagement;
