import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  X,
  Copy,
  Check,
  EyeOff,
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL}/blogs`;

// ─── Share Bottom Sheet ───────────────────────────────────────
function ShareSheet({ shareUrl, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURI(shareUrl)}`, "_blank");
    onClose();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl p-5 pb-8 max-h-[min(92vh,880px)] overflow-y-auto"
        style={{ background: "rgb(var(--bg))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4"
          style={{ background: "rgb(var(--border))" }}
        />

        <div className="flex items-center justify-between mb-5">
          <p
            className="font-bold text-sm"
            style={{ color: "rgb(var(--text))" }}
          >
            Share
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition"
            style={{ background: "rgb(var(--surface))" }}
          >
            <X
              className="w-4 h-4"
              style={{ color: "rgb(var(--text-muted))" }}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl transition text-left"
            style={{ background: "rgb(var(--surface))" }}
          >
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p
                className="font-semibold text-sm"
                style={{ color: "rgb(var(--text))" }}
              >
                WhatsApp
              </p>
              <p
                className="text-xs"
                style={{ color: "rgb(var(--text-muted))" }}
              >
                Send as clickable link
              </p>
            </div>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl transition text-left"
            style={{ background: "rgb(var(--surface))" }}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${copied ? "bg-green-500" : ""}`}
              style={!copied ? { background: "rgb(var(--border))" } : {}}
            >
              {copied ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Copy
                  className="w-5 h-5"
                  style={{ color: "rgb(var(--text-muted))" }}
                />
              )}
            </div>
            <div>
              <p
                className="font-semibold text-sm"
                style={{ color: "rgb(var(--text))" }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </p>
              <p
                className="text-xs truncate max-w-55"
                style={{ color: "rgb(var(--text-muted))" }}
              >
                {shareUrl}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Image Slider ─────────────────────────────────────────────
function ImageSlider({ images }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(
      () => setCurrent((p) => (p + 1) % images.length),
      3000,
    );
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  const go = (dir) => {
    clearInterval(timerRef.current);
    setCurrent((p) => (p + dir + images.length) % images.length);
  };

  if (!images.length)
    return (
      <div
        className="w-full h-48 flex items-center justify-center rounded-t-2xl"
        style={{ background: "rgb(var(--surface))" }}
      >
        <ImageIcon
          className="w-10 h-10"
          style={{ color: "rgb(var(--border-strong))" }}
        />
      </div>
    );

  return (
    <div
      className="relative w-full rounded-t-2xl overflow-hidden group"
      style={{ background: "rgb(var(--surface))" }}
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={() => {
        if (images.length > 1)
          timerRef.current = setInterval(
            () => setCurrent((p) => (p + 1) % images.length),
            3000,
          );
      }}
    >
      <img
        src={images[current].url}
        alt=""
        className="w-full h-auto block"
        style={{ maxHeight: "480px", objectFit: "contain" }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-white w-4" : "bg-white/60 w-1.5"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Blog Card ────────────────────────────────────────────────
function BlogCard({ blog, onLikeUpdate }) {
  const [liked, setLiked] = useState(blog.hasLiked ?? false);
  const [likesCount, setLikesCount] = useState(blog.likes ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const shareUrl = `${import.meta.env.VITE_APP_URL}/blogs/${blog._id}`;

  useEffect(() => {
    setLiked(blog.hasLiked ?? false);
    setLikesCount(blog.likes ?? 0);
  }, [blog.hasLiked, blog.likes]);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      const { data } = await axios.patch(
        `${API}/${blog._id}/like`,
        {},
        { withCredentials: true },
      );
      setLiked(data.hasLiked);
      setLikesCount(data.likes);
      onLikeUpdate?.(blog._id, data.likes, data.hasLiked);
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setLikeLoading(false);
    }
  };

  const isLong = blog.content.length > 150;

  return (
    <>
      <div
        className="rounded-2xl shadow-sm overflow-hidden"
        style={{
          background: "rgb(var(--bg))",
          border: "1px solid rgb(var(--border))",
        }}
      >
        <ImageSlider images={blog.images ?? []} />

        <div className="p-4">
          {/* Category badge */}
          <span
            className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1"
            style={{
              color: "rgb(var(--primary))",
              background: "rgb(var(--surface))",
            }}
          >
            {blog.category}
          </span>

          <h3
            className="text-base font-bold leading-snug"
            style={{ color: "rgb(var(--text))" }}
          >
            {blog.title}
          </h3>

          <p
            className="text-xs mt-0.5 mb-2"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {new Date(blog.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {blog.studentName ? (
              <>
                <span className="ml-1.5 before:content-['·'] before:mr-1.5">
                  {blog.studentName}
                </span>
                {blog.studentClass && (
                  <span className="ml-1.5 before:content-['·'] before:mr-1.5">
                    {blog.studentClass}
                  </span>
                )}
              </>
            ) : blog.createdByName ? (
              <span className="ml-1.5 before:content-['·'] before:mr-1.5">
                {blog.createdByName}
              </span>
            ) : null}
          </p>

          {/* Content */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {expanded || !isLong ? blog.content : blog.content.slice(0, 150)}
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs font-semibold ml-1"
                style={{ color: "rgb(var(--primary))" }}
              >
                {expanded ? " show less" : "...read more"}
              </button>
            )}
          </p>

          {/* Like / Share bar */}
          <div
            className="flex items-center gap-5 mt-3 pt-3"
            style={{ borderTop: "1px solid rgb(var(--border))" }}
          >
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className="flex items-center gap-1.5 text-sm font-medium transition-all active:scale-95 select-none"
              style={{ color: liked ? "#ef4444" : "rgb(var(--text-muted))" }}
            >
              <Heart
                className={`w-4 h-4 transition-all duration-200 ${liked ? "scale-110" : "scale-100"}`}
                style={liked ? { fill: "#ef4444", stroke: "#ef4444" } : {}}
              />
              <span>
                {likesCount > 0 ? likesCount : ""} {liked ? "Liked" : "Like"}
              </span>
            </button>

            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            {blog.canEdit && !blog.isPublic && (
              <span
                className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgb(var(--surface))",
                  color: "rgb(var(--text-muted))",
                }}
              >
                <EyeOff className="w-3 h-3" /> Private
              </span>
            )}
          </div>
        </div>
      </div>

      {showShare && (
        <ShareSheet shareUrl={shareUrl} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}

// ─── Blog Feed ────────────────────────────────────────────────
export default function BlogFeed() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(API, { withCredentials: true });
      const publicBlogs = (data.data || []).filter(
        (b) => b.isPublic && (!b.status || b.status === "published"),
      );
      setBlogs(publicBlogs);
    } catch (err) {
      setError("Failed to load blogs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeUpdate = (id, likes, hasLiked) => {
    setBlogs((prev) =>
      prev.map((b) => (b._id === id ? { ...b, likes, hasLiked } : b)),
    );
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "rgb(var(--primary))" }}
        />
        <p className="text-sm" style={{ color: "rgb(var(--text-muted))" }}>
          Loading blogs...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchBlogs}
          className="text-sm underline"
          style={{ color: "rgb(var(--primary))" }}
        >
          Try again
        </button>
      </div>
    );

  if (!blogs.length)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <ImageIcon
          className="w-12 h-12"
          style={{ color: "rgb(var(--border))" }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          No blogs yet
        </p>
      </div>
    );

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {blogs.map((blog) => (
        <BlogCard key={blog._id} blog={blog} onLikeUpdate={handleLikeUpdate} />
      ))}
    </div>
  );
}