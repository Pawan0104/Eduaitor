import { useState, useEffect } from "react";
import axios from "axios";
import CreateNotification from "../components/CreateNotification.jsx"; // Your existing component
import { useAuth } from "../context/AuthContext.jsx";

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const API = import.meta.env.VITE_API_URL;
  const { user } = useAuth();

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${API}/notifications`, {
        withCredentials: true,
      });

      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSelect = async (notif) => {
    setSelectedNotif(notif);
    // Automatically mark as read if not already read
    if (!notif.readBy.includes(user._id)) {
      await axios.patch(
        `${API}/notifications/${notif._id}/read`,
        {},
        { withCredentials: true },
      );
      fetchNotifications(); // Refresh list to update unread status
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-[80vh] w-full gap-4 p-4">
      {/* LEFT SIDE: THE LIST */}
      <div className="w-1/3 flex flex-col bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        <div className="p-4 border-b border-[rgb(var(--border))] flex justify-between items-center">
          <h2 className="font-bold">Notifications</h2>
          {user.role === "school_admin" && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="text-xs bg-[rgb(var(--primary))] text-white px-3 py-1 rounded-lg"
            >
              {showCreate ? "View List" : "Create +"}
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleSelect(n)}
              className={`p-4 border-b border-[rgb(var(--border))] cursor-pointer transition
                ${selectedNotif?._id === n._id ? "bg-[rgb(var(--primary))/10 border-r-4 border-r-[rgb(var(--primary))]" : ""}
                ${!n.readBy.includes(user._id) ? "bg-blue-50/10" : ""}`}
            >
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-[rgb(var(--primary))]">
                  {n.notificationType}
                </span>
                <span className="text-[10px] text-[rgb(var(--text-muted))]">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3
                className={`text-sm truncate ${!n.readBy.includes(user._id) ? "font-bold" : "font-medium"}`}
              >
                {n.title}
              </h3>
              <p className="text-xs text-[rgb(var(--text-muted))] truncate">
                {n.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: THE CONTENT */}
      <div className="flex-1 bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-y-auto p-8">
        {showCreate ? (
          <CreateNotification />
        ) : selectedNotif ? (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{selectedNotif.title}</h1>
              <div className="flex gap-4 text-sm text-[rgb(var(--text-muted))]">
                <span>
                  📅{formatDate(selectedNotif.startingDate)} to{" "}
                  {formatDate(selectedNotif.endingDate)}
                </span>
                <span>📌 Type: {selectedNotif.notificationType}</span>
              </div>
            </div>
            <hr className="mb-6 border-[rgb(var(--border))]" />
            {/* THIS IS WHERE LONG MESSAGES LIVE */}
            <div className="text-[rgb(var(--text))] leading-relaxed whitespace-pre-wrap">
              {selectedNotif.message}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[rgb(var(--text-muted))]">
            Select a notification to read details
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
