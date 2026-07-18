import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaTrash, FaEdit, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const SECTION_MAP = {
  uniforms: {
    category: "uniform",
    title: "Uniform Management",
    subtitle: "Manage school uniforms, sizes, stock and pricing",
  },
  books: {
    category: "book",
    title: "Book Management",
    subtitle: "Sell and track textbooks and academic books",
  },
  stationery: {
    category: "stationery",
    title: "Stationery Management",
    subtitle: "Notebooks, pens and classroom stationery stock",
  },
  accessories: {
    category: "accessory",
    title: "Accessories Management",
    subtitle: "Belts, ties, badges and other accessories",
  },
};

const EMPTY = {
  name: "",
  sku: "",
  description: "",
  price: "",
  stock: "",
  unit: "piece",
  size: "",
  gender: "",
  classLabel: "",
  subject: "",
  author: "",
  isbn: "",
  brand: "",
  color: "",
  status: "Active",
};

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const CommerceInventory = () => {
  const { section } = useParams();
  const config = SECTION_MAP[section];
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => {
    if (!config) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/commerce/products`, {
        withCredentials: true,
        params: { category: config.category },
      });
      setItems(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  if (!config) {
    return (
      <div className="p-6">
        <p>Unknown section.</p>
        <button onClick={() => navigate("/school/commerce")} className="underline">
          Back
        </button>
      </div>
    );
  }

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({ ...EMPTY });
    setFormModal(true);
  };

  const openEdit = (item) => {
    setIsEdit(true);
    setEditId(item._id);
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      description: item.description || "",
      price: String(item.price ?? ""),
      stock: String(item.stock ?? ""),
      unit: item.unit || "piece",
      size: item.size || "",
      gender: item.gender || "",
      classLabel: item.classLabel || "",
      subject: item.subject || "",
      author: item.author || "",
      isbn: item.isbn || "",
      brand: item.brand || "",
      color: item.color || "",
      status: item.status || "Active",
    });
    setFormModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.price === "" || Number(form.price) < 0) {
      return toast.error("Valid price is required");
    }

    const payload = {
      category: config.category,
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: form.stock === "" ? 0 : Number(form.stock),
      unit: form.unit.trim() || "piece",
      size: form.size.trim(),
      gender: form.gender,
      classLabel: form.classLabel.trim(),
      subject: form.subject.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim(),
      brand: form.brand.trim(),
      color: form.color.trim(),
      status: form.status,
    };

    try {
      setFormLoading(true);
      if (isEdit) {
        await axios.put(`${API}/commerce/products/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Product updated");
      } else {
        await axios.post(`${API}/commerce/products`, payload, {
          withCredentials: true,
        });
        toast.success("Product created");
      }
      setFormModal(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save product");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/commerce/products/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Product deleted");
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = items.filter((item) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      item.name?.toLowerCase().includes(s) ||
      item.sku?.toLowerCase().includes(s) ||
      item.brand?.toLowerCase().includes(s) ||
      item.subject?.toLowerCase().includes(s);
    const matchStatus = filterStatus ? item.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  const totalStock = items.reduce((s, i) => s + (i.stock || 0), 0);
  const totalValue = items.reduce(
    (s, i) => s + (Number(i.price) || 0) * (Number(i.stock) || 0),
    0
  );

  if (loading) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const showSize = config.category === "uniform" || config.category === "accessory";
  const showBook = config.category === "book";

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      {isMobile ? (
        <button
          onClick={() => navigate("/school/commerce")}
          className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-xl bg-white border text-sm font-bold"
        >
          <FaArrowLeft /> Back
        </button>
      ) : (
        <button
          onClick={() => navigate("/school/commerce")}
          className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] mb-2"
        >
          <FaArrowLeft size={12} /> School Commerce Suite
        </button>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{config.title}</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">{config.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat title="ITEMS" value={items.length} />
        <Stat title="TOTAL STOCK" value={totalStock} />
        <Stat title="INVENTORY VALUE" value={fmtINR(totalValue)} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 justify-between">
        <h2 className="text-lg font-semibold">Catalogue</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU..."
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-4 text-left">Item</th>
              <th className="p-4 text-left">Details</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">Stock</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item._id} className="border-t">
                <td className="p-4">
                  <p className="font-bold text-[rgb(var(--primary))]">{item.name}</p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">
                    {item.sku || "No SKU"}
                  </p>
                </td>
                <td className="p-4 text-xs text-[rgb(var(--text-muted))]">
                  {showSize && (
                    <p>
                      {[item.size, item.gender, item.color].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                  )}
                  {showBook && (
                    <p>
                      {[item.classLabel, item.subject, item.author]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  )}
                  {config.category === "stationery" && (
                    <p>{[item.brand, item.unit].filter(Boolean).join(" · ") || "—"}</p>
                  )}
                </td>
                <td className="p-4 font-medium">{fmtINR(item.price)}</td>
                <td className="p-4">
                  <span
                    className={
                      item.stock <= 5 ? "text-amber-600 font-semibold" : ""
                    }
                  >
                    {item.stock} {item.unit}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      item.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="px-3 py-1 bg-gray-100 rounded text-xs flex items-center gap-1"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs flex items-center gap-1"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-10 text-[rgb(var(--text-muted))]">
                  No items yet. Click Add Item to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Item" : "Add Item"}
              </h3>
              <button onClick={() => setFormModal(false)}>✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name *" className="sm:col-span-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input"
                />
              </Field>
              <Field label="SKU">
                <input
                  value={form.sku}
                  onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                  className="input"
                />
              </Field>
              <Field label="Unit">
                <input
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  className="input"
                />
              </Field>
              <Field label="Price *">
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  className="input"
                />
              </Field>
              <Field label="Stock">
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                  className="input"
                />
              </Field>

              {showSize && (
                <>
                  <Field label="Size">
                    <input
                      value={form.size}
                      onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
                      className="input"
                      placeholder="S / M / L / 28"
                    />
                  </Field>
                  <Field label="Gender">
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, gender: e.target.value }))
                      }
                      className="input"
                    >
                      <option value="">—</option>
                      <option value="Boys">Boys</option>
                      <option value="Girls">Girls</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </Field>
                  <Field label="Color">
                    <input
                      value={form.color}
                      onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                      className="input"
                    />
                  </Field>
                </>
              )}

              {showBook && (
                <>
                  <Field label="Class">
                    <input
                      value={form.classLabel}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, classLabel: e.target.value }))
                      }
                      className="input"
                    />
                  </Field>
                  <Field label="Subject">
                    <input
                      value={form.subject}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, subject: e.target.value }))
                      }
                      className="input"
                    />
                  </Field>
                  <Field label="Author">
                    <input
                      value={form.author}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, author: e.target.value }))
                      }
                      className="input"
                    />
                  </Field>
                  <Field label="ISBN">
                    <input
                      value={form.isbn}
                      onChange={(e) => setForm((p) => ({ ...p, isbn: e.target.value }))}
                      className="input"
                    />
                  </Field>
                </>
              )}

              {(config.category === "stationery" ||
                config.category === "accessory") && (
                <Field label="Brand">
                  <input
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    className="input"
                  />
                </Field>
              )}

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="input"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </Field>

              <Field label="Description" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="input resize-none"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setFormModal(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="px-4 py-2 bg-[rgb(var(--primary))] rounded-lg text-sm disabled:opacity-60"
              >
                {formLoading ? "Saving..." : isEdit ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-lg mb-2">Delete item?</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-4">
              Delete <b>{deleteTarget.name}</b>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: rgb(var(--surface));
          outline: none;
        }
      `}</style>
    </div>
  );
};

const Stat = ({ title, value }) => (
  <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 border-l-indigo-500">
    <p className="text-xs font-medium">{title}</p>
    <p className="text-xl font-bold mt-1">{value}</p>
  </div>
);

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className="block text-xs font-semibold uppercase text-[rgb(var(--text-muted))] mb-1">
      {label}
    </label>
    {children}
  </div>
);

export default CommerceInventory;
