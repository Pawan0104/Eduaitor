import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const getUrgency = (n) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const relevantDate = n.startingDate || n.endingDate;
  if (!relevantDate) return null;

  const start = new Date(relevantDate);
  start.setHours(0, 0, 0, 0);

  if (n.endingDate) {
    const end = new Date(n.endingDate);
    end.setHours(0, 0, 0, 0);
    if (end < today) return null;
  }

  const diffDays = Math.floor((start - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0 && n.endingDate && new Date(n.endingDate) >= today) return "today";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";

  return null;
};

const summarize = (list) => {
  if (list.length === 1) return list[0].title;
  if (list.length === 2) return `${list[0].title} & ${list[1].title}`;
  return `${list[0].title} & ${list.length - 1} more`;
};

const UpComingNotifications = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(`${API}/notifications`, {
          withCredentials: true,
        });
        const filtered = data
          .map((n) => ({ ...n, _urgency: getUrgency(n) }))
          .filter((n) => n._urgency !== null)
          .sort((a, b) => (a._urgency === "today" ? -1 : 1));
        setItems(filtered);
      } catch (err) {
        console.error("UpcomingNotifications fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || items.length === 0) return null;

  const todayItems    = items.filter((n) => n._urgency === "today");
  const tomorrowItems = items.filter((n) => n._urgency === "tomorrow");

  return (
    <div className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2.5 flex flex-col gap-2">
      {todayItems.length > 0 && (
        <div
          className="flex items-center gap-2 cursor-pointer group min-h-[28px]"
        >
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide
            px-2.5 py-0.5 rounded-full bg-rose-500 text-white">
            Today
          </span>
          <p className="text-xs sm:text-sm font-medium text-[rgb(var(--text))]
            truncate group-hover:text-[rgb(var(--primary))] transition-colors">
            {summarize(todayItems)}
          </p>
        </div>
      )}

      {todayItems.length > 0 && tomorrowItems.length > 0 && (
        <div className="border-t border-[rgb(var(--border))]" />
      )}

      {tomorrowItems.length > 0 && (
        <div
          className="flex items-center gap-2 cursor-pointer group min-h-[28px]"
        >
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide
            px-2.5 py-0.5 rounded-full bg-amber-500 text-white">
            Tomorrow
          </span>
          <p className="text-xs sm:text-sm font-medium text-[rgb(var(--text))]
            truncate group-hover:text-[rgb(var(--primary))] transition-colors">
            {summarize(tomorrowItems)}
          </p>
        </div>
      )}
    </div>
  );
};

export default UpComingNotifications;