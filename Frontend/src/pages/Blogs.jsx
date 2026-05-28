import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Heart,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL}/blogs`; // ← change to your base URL if needed

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
    <div
      className="fixed top-0 left-0 w-screen h-screen inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-800 text-base">Share this post</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* URL preview box */}
        <div className="mx-5 mt-4 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-400 mb-0.5">Link</p>
          <p className="text-xs text-gray-600 truncate">{shareUrl}</p>
        </div>

        {/* Share options */}
        <div className="p-5 flex flex-col gap-2.5">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl bg-green-50 hover:bg-green-100 transition text-left"
          >
            <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <svg
                className="w-4.5 h-4.5 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">WhatsApp</p>
              <p className="text-xs text-gray-400">Send as clickable link</p>
            </div>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-left"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${copied ? "bg-green-500" : "bg-gray-200"}`}
            >
              {copied ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {copied ? "Copied!" : "Copy Link"}
              </p>
              <p className="text-xs text-gray-400">
                {copied ? "Link copied to clipboard" : "Copy to clipboard"}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-xl">
        <ImageIcon className="w-10 h-10 text-gray-300" />
      </div>
    );

  return (
    <div className="relative w-full rounded-t-xl overflow-hidden bg-gray-50 group">
      {/* ✅ Full width, natural height, no crop */}
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
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40
              text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40
              text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300
                  ${i === current ? "bg-white w-4" : "bg-white/60 w-1.5"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG CARD
// ─────────────────────────────────────────────────────────────────────────────
function BlogCard({ blog, onEdit, onDelete, onTogglePublic, onLike }) {
  const [liked, setLiked] = useState(blog.hasLiked ?? false);
  const [likesCount, setLikesCount] = useState(blog.likes ?? 0);
  const [expanded, setExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const shareUrl = `${import.meta.env.VITE_APP_URL}/blogs/${blog._id}`;

  useEffect(() => {
    setLiked(blog.hasLiked ?? false);
    setLikesCount(blog.likes ?? 0);
  }, [blog.hasLiked, blog.likes]);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikesCount((l) => l + 1);
    await onLike(blog._id);
  };

  const isLong = blog.content.length > 120;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <ImageSlider images={blog.images} />

        <div className="p-4">
          {/* Title row + admin controls */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              {/* Category badge */}
              <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1">
                {blog.category}
              </span>
              <h3 className="text-base font-bold text-gray-800 leading-tight truncate">
                {blog.title}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Admin action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onTogglePublic(blog._id)}
                title={blog.isPublic ? "Make Private" : "Make Public"}
                className={`p-1.5 rounded-lg transition ${
                  blog.isPublic
                    ? "bg-green-50 text-green-600 hover:bg-green-100"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                {blog.isPublic ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => onEdit(blog)}
                className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(blog._id)}
                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {expanded || !isLong ? blog.content : blog.content.slice(0, 120)}
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-500 text-xs font-medium ml-1"
              >
                {expanded ? " show less" : "...read more"}
              </button>
            )}
          </p>

          {/* Like / Share bar */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                liked ? "text-red-500" : "text-gray-400 hover:text-red-400"
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform active:scale-125 ${
                  liked ? "fill-red-500 stroke-red-500" : ""
                }`}
              />
              <span>{likesCount > 0 ? likesCount : ""} Like</span>
            </button>

            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            {/* Private badge */}
            {!blog.isPublic && (
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
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

// ─────────────────────────────────────────────────────────────────────────────
// BLOG FORM MODAL  (create + edit)
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "General",
  "Did You Know",
  "Story Time",
  "Announcement",
  "Achievement",
  "Event",
];

function BlogFormModal({ blog, onClose, onSave }) {
  const [form, setForm] = useState({
    title: blog?.title || "",
    content: blog?.content || "",
    category: blog?.category || "General",
    isPublic: blog?.isPublic ?? true,
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState(
    blog?.images?.map((i) => i.url) || [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const removePreview = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("content", form.content.trim());
      fd.append("category", form.category);
      fd.append("isPublic", form.isPublic);
      files.forEach((f) => fd.append("images", f));

      if (blog?._id) {
        await axios.put(`${API}/${blog._id}`, fd, { withCredentials: true });
      } else {
        console.log("Submitting new blog with data:", form);
        await axios.post(API, fd, { withCredentials: true });
      }
      onSave();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {blog ? "Edit Blog" : "New Blog"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter blog title..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your blog content..."
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none transition"
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images
            </label>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 transition">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">
                Click to upload images (max 10)
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFiles}
                className="hidden"
              />
            </label>

            {/* Image previews */}
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previews.map((p, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={p}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removePreview(i)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Public Post</p>
              <p className="text-xs text-gray-400">Visible to everyone</p>
            </div>
            <button
              onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                form.isPublic ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                  form.isPublic ? "left-5.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Saving..." : blog ? "Update Blog" : "Publish Blog"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────
function DeleteModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-800 text-center mb-1">
          Delete Blog?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          This will permanently delete the post and all its images from
          Cloudinary.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBlog, setEditBlog] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | public | private

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API, { withCredentials: true });
      console.log("Fetched blogs:", data);
      setBlogs(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async () => {
    try {
      const res = await axios.delete(`${API}/${deleteId}`, {
        withCredentials: true,
      });
      console.log("Delete response:", res);
      setBlogs((prev) => prev.filter((b) => b._id !== deleteId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteId(null);
    }
  };

  const handleTogglePublic = async (id) => {
    try {
      const { data } = await axios.patch(
        `${API}/${id}/toggle-public`,
        {},
        { withCredentials: true },
      );
      setBlogs((prev) => prev.map((b) => (b._id === id ? data.data : b)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (id) => {
    try {
      await axios.patch(`${API}/${id}/like`, {}, { withCredentials: true });
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = blogs?.filter((b) => {
    if (filter === "public") return b.isPublic;
    if (filter === "private") return !b.isPublic;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ── */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">School Blogs</h1>
            <p className="text-xs text-gray-400">{blogs?.length} posts</p>
          </div>
          <button
            onClick={() => {
              setEditBlog(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Blog</span>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          {[
            ["all", "All"],
            ["public", "Public"],
            ["private", "Private"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                filter === val
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
              {val === "all" && (
                <span className="ml-1 text-[10px] opacity-70">
                  {blogs?.length}
                </span>
              )}
              {val === "public" && (
                <span className="ml-1 text-[10px] opacity-70">
                  {blogs?.filter((b) => b.isPublic).length}
                </span>
              )}
              {val === "private" && (
                <span className="ml-1 text-[10px] opacity-70">
                  {blogs?.filter((b) => !b.isPublic).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Blog feed ── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading blogs...</p>
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-24">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-400">No blogs found</p>
            <p className="text-sm text-gray-300 mt-1">
              {filter === "all"
                ? "Create your first blog post!"
                : `No ${filter} posts yet.`}
            </p>
          </div>
        ) : (
          filtered?.map((blog) => (
            <BlogCard
              key={blog._id}
              blog={blog}
              onEdit={(b) => {
                setEditBlog(b);
                setShowForm(true);
              }}
              onDelete={(id) => setDeleteId(id)}
              onTogglePublic={handleTogglePublic}
              onLike={handleLike}
            />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <BlogFormModal
          blog={editBlog}
          onClose={() => {
            setShowForm(false);
            setEditBlog(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditBlog(null);
            fetchBlogs();
          }}
        />
      )}

      {deleteId && (
        <DeleteModal
          onCancel={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
