import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaStore,
  FaTshirt,
  FaBook,
  FaPencilAlt,
  FaShoppingBag,
  FaClipboardList,
} from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";

const CommerceSuite = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const { t } = useLanguage();

  const cards = [
    {
      titleKey: "commerce.uniforms",
      descKey: "commerce.uniformsDesc",
      icon: <FaTshirt size={20} />,
      tone: "bg-sky-50 text-sky-600",
      path: "/school/commerce/uniforms",
    },
    {
      titleKey: "commerce.books",
      descKey: "commerce.booksDesc",
      icon: <FaBook size={20} />,
      tone: "bg-violet-50 text-violet-600",
      path: "/school/commerce/books",
    },
    {
      titleKey: "commerce.stationery",
      descKey: "commerce.stationeryDesc",
      icon: <FaPencilAlt size={20} />,
      tone: "bg-emerald-50 text-emerald-600",
      path: "/school/commerce/stationery",
    },
    {
      titleKey: "commerce.accessories",
      descKey: "commerce.accessoriesDesc",
      icon: <FaShoppingBag size={20} />,
      tone: "bg-amber-50 text-amber-600",
      path: "/school/commerce/accessories",
    },
    {
      titleKey: "commerce.store",
      descKey: "commerce.storeDesc",
      icon: <FaStore size={20} />,
      tone: "bg-indigo-50 text-indigo-600",
      path: "/school/commerce/store",
    },
    {
      titleKey: "commerce.orders",
      descKey: "commerce.ordersDesc",
      icon: <FaClipboardList size={20} />,
      tone: "bg-rose-50 text-rose-600",
      path: "/school/commerce/orders",
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
        <h1 className="text-2xl sm:text-3xl font-bold">{t("commerce.title")}</h1>
        <p className="text-sm mt-1 text-[rgb(var(--text-muted))]">
          {t("commerce.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <button
            key={card.titleKey}
            type="button"
            onClick={() => navigate(card.path)}
            className="text-left rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md cursor-pointer"
          >
            <div
              className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${card.tone}`}
            >
              {card.icon}
            </div>
            <h2 className="text-base font-semibold">{t(card.titleKey)}</h2>
            <p className="text-xs mt-1 text-[rgb(var(--text-muted))]">
              {t(card.descKey)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CommerceSuite;
