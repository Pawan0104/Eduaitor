import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Check,
  Copy,
  X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE SLIDER
// ─────────────────────────────────────────────────────────────────────────────
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
      <div className="w-full h-52 bg-gray-100 flex items-center justify-center">
        <ImageIcon className="w-10 h-10 text-gray-300" />
      </div>
    );

  return (
    <div
      className="relative w-full overflow-hidden bg-gray-50 group"
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
        style={{ maxHeight: "500px", objectFit: "contain" }}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? "bg-white w-5" : "bg-white/60 w-2"
                }`}
              />
            ))}
          </div>

          <span className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
            {current + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARE BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────
function ShareSheet({ shareUrl, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
      "_blank",
    );
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
    // dark backdrop
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose} // tap outside to close
    >
      {/* sheet — stop click from closing when tapping inside */}
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* handle bar */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-gray-800">Share</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* share options */}
        <div className="flex flex-col gap-2">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl
              bg-green-50 hover:bg-green-100 transition text-left"
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
              <p className="font-semibold text-gray-800 text-sm">WhatsApp</p>
              <p className="text-xs text-gray-500">Send as clickable link</p>
            </div>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl
              bg-gray-50 hover:bg-gray-100 transition text-left"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                copied ? "bg-green-500" : "bg-gray-200"
              }`}
            >
              {copied ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Copy className="w-5 h-5 text-gray-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {copied ? "Copied!" : "Copy Link"}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-55">
                {shareUrl}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG DETAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const shareUrl = blog
    ? `${import.meta.env.VITE_APP_URL}/blogs/${blog._id}`
    : "";

  // ── Fetch blog ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const { data } = await axios.get(`${API}/blogs/${id}`, {
          withCredentials: true,
        });
        setBlog(data.data);
        setLiked(data.data.hasLiked ?? false);
        setLikesCount(data.data.likes ?? 0);
      } catch (err) {
        console.error(err);
        setError("Failed to load blog.");
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [id]);

  // ── Like ───────────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      const { data } = await axios.patch(
        `${API}/blogs/${id}/like`,
        {},
        { withCredentials: true },
      );
      setLiked(data.hasLiked);
      setLikesCount(data.likes);
    } catch (err) {
      console.error("Like failed:", err);
      setLiked(wasLiked);
      setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setLikeLoading(false);
    }
  };

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-500 text-sm underline"
        >
          Go back
        </button>
      </div>
    );

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{blog.title}</title>
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.content.slice(0, 150)} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="article" />
        {blog.images?.[0]?.url && (
          <meta property="og:image" content={blog.images[0].url} />
        )}
      </Helmet>

      <div className="max-w-xl mx-auto">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">
              {blog.title}
            </p>
            <p className="text-xs text-gray-400">{blog.category}</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white shadow-sm">
          <ImageSlider images={blog.images ?? []} />

          <div className="p-5">
            <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-2">
              {blog.category}
            </span>

            <h1 className="text-xl font-bold text-gray-800 leading-snug mb-1">
              {blog.title}
            </h1>

            <p className="text-xs text-gray-400 mb-4">
              {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {blog.content}
            </p>

            {/* Like / Share */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-2 text-sm font-medium transition-all active:scale-95 select-none ${
                  liked ? "text-red-500" : "text-gray-400 hover:text-red-400"
                }`}
              >
                <Heart
                  className={`w-5 h-5 transition-all duration-200 ${
                    liked
                      ? "fill-red-500 stroke-red-500 scale-110"
                      : "scale-100"
                  }`}
                />
                <span>
                  {likesCount > 0 ? likesCount : ""} {liked ? "Liked" : "Like"}
                </span>
              </button>

              {/* Share button — opens bottom sheet */}
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share bottom sheet */}
      {showShare && (
        <ShareSheet shareUrl={shareUrl} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
