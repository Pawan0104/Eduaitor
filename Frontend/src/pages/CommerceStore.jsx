import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaStore } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const LABEL = {
  uniform: "Uniforms",
  book: "Books",
  stationery: "Stationery",
  accessory: "Accessories",
};

const PATH = {
  uniform: "/school/commerce/uniforms",
  book: "/school/commerce/books",
  stationery: "/school/commerce/stationery",
  accessory: "/school/commerce/accessories",
};

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const CommerceStore = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/commerce/store/summary`, {
          withCredentials: true,
        });
        setData(res.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load store");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const totals = data?.totals || {};

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

      <div className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <FaStore size={20} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">School Store Management</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Central inventory overview across all store categories
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat title="PRODUCTS" value={totals.products || 0} />
        <Stat title="ACTIVE" value={totals.active || 0} />
        <Stat title="TOTAL STOCK" value={totals.stock || 0} />
        <Stat title="INVENTORY VALUE" value={fmtINR(totals.value)} />
      </div>

      <h2 className="text-lg font-semibold mb-3">By Category</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {(data?.byCategory || []).map((row) => (
          <button
            key={row.category}
            type="button"
            onClick={() => navigate(PATH[row.category])}
            className="text-left rounded-xl border bg-[rgb(var(--surface))] p-5 shadow-sm hover:border-indigo-300 transition"
          >
            <p className="font-semibold">{LABEL[row.category] || row.category}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[rgb(var(--text-muted))]">
              <span>{row.totalItems} items</span>
              <span>{row.totalStock} in stock</span>
              <span>{row.lowStock} low stock</span>
              <span>{fmtINR(row.inventoryValue)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Low Stock Alerts</h2>
        <button
          onClick={() => navigate("/school/commerce/orders")}
          className="text-sm font-semibold text-[rgb(var(--primary))]"
        >
          Go to Orders →
        </button>
      </div>
      <div className="bg-[rgb(var(--surface))] rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-4 text-left">Item</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Stock</th>
              <th className="p-4 text-left">Price</th>
            </tr>
          </thead>
          <tbody>
            {(data?.lowStockItems || []).map((item) => (
              <tr key={item._id} className="border-t">
                <td className="p-4 font-medium">{item.name}</td>
                <td className="p-4 capitalize">{item.category}</td>
                <td className="p-4 text-amber-600 font-semibold">{item.stock}</td>
                <td className="p-4">{fmtINR(item.price)}</td>
              </tr>
            ))}
            {(data?.lowStockItems || []).length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-8 text-[rgb(var(--text-muted))]">
                  No low-stock items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Stat = ({ title, value }) => (
  <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 border-l-indigo-500">
    <p className="text-xs font-medium">{title}</p>
    <p className="text-xl font-bold mt-1">{value}</p>
  </div>
);

export default CommerceStore;
