import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaArrowLeft,
  FaRupeeSign,
  FaCreditCard,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const CommerceOrders = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPay, setFilterPay] = useState("");

  const [formModal, setFormModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    customerName: "",
    notes: "",
    paymentMode: "Cash",
    lines: [{ productId: "", quantity: "1" }],
  });

  const [devCheckout, setDevCheckout] = useState(null);
  const [payLoadingId, setPayLoadingId] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [o, p, s] = await Promise.all([
        axios.get(`${API}/commerce/orders`, { withCredentials: true }),
        axios.get(`${API}/commerce/products`, {
          withCredentials: true,
          params: { status: "Active" },
        }),
        axios.get(`${API}/students`, { withCredentials: true }),
      ]);
      setOrders(o.data.data || []);
      setProducts(p.data.data || []);
      setStudents(s.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const cartTotal = useMemo(() => {
    return form.lines.reduce((sum, line) => {
      const product = products.find((p) => p._id === line.productId);
      const qty = Number(line.quantity) || 0;
      return sum + (product ? product.price * qty : 0);
    }, 0);
  }, [form.lines, products]);

  const openCreate = () => {
    setForm({
      studentId: "",
      customerName: "",
      notes: "",
      paymentMode: "Cash",
      lines: [{ productId: "", quantity: "1" }],
    });
    setFormModal(true);
  };

  const handleCreate = async () => {
    const items = form.lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
      }));

    if (items.length === 0) return toast.error("Add at least one product");

    try {
      setFormLoading(true);
      await axios.post(
        `${API}/commerce/orders`,
        {
          studentId: form.studentId || undefined,
          customerName: form.customerName.trim(),
          notes: form.notes.trim(),
          paymentMode: form.paymentMode,
          items,
        },
        { withCredentials: true }
      );
      toast.success("Order created");
      setFormModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create order");
    } finally {
      setFormLoading(false);
    }
  };

  const verifyOnlinePayment = async (commerceOrderId, payload) => {
    await axios.post(
      `${API}/commerce/orders/${commerceOrderId}/razorpay/verify`,
      payload,
      { withCredentials: true }
    );
    toast.success("Payment successful");
    setDevCheckout(null);
    fetchAll();
  };

  const payOnline = async (order) => {
    try {
      setPayLoadingId(order._id);
      const { data } = await axios.post(
        `${API}/commerce/orders/${order._id}/razorpay/order`,
        {},
        { withCredentials: true }
      );

      if (data.mock) {
        setDevCheckout({
          commerceOrderId: order._id,
          orderId: data.orderId,
          amountRupees: data.amountRupees,
          orderNumber: order.orderNumber,
        });
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        return toast.error("Failed to load Razorpay checkout");
      }

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "School Store",
        description: `Order ${order.orderNumber}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await verifyOnlinePayment(order._id, {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
          } catch (err) {
            toast.error(err.response?.data?.message || "Verification failed");
          }
        },
        theme: { color: "#4F46E5" },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment init failed");
    } finally {
      setPayLoadingId(null);
    }
  };

  const completeDevPayment = async () => {
    if (!devCheckout) return;
    try {
      await verifyOnlinePayment(devCheckout.commerceOrderId, {
        orderId: devCheckout.orderId,
        paymentId: `pay_local_${Date.now()}`,
        signature: "local_test_signature",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Dev payment failed");
    }
  };

  const payCash = async (order, mode = "Cash") => {
    try {
      await axios.post(
        `${API}/commerce/orders/${order._id}/pay-cash`,
        { paymentMode: mode },
        { withCredentials: true }
      );
      toast.success(`Marked paid (${mode})`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark paid");
    }
  };

  const updateStatus = async (order, orderStatus) => {
    try {
      await axios.patch(
        `${API}/commerce/orders/${order._id}/status`,
        { orderStatus },
        { withCredentials: true }
      );
      toast.success("Status updated");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const deleteOrder = async (order) => {
    try {
      await axios.delete(`${API}/commerce/orders/${order._id}`, {
        withCredentials: true,
      });
      toast.success("Order deleted");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = orders.filter((o) => {
    const s = search.toLowerCase();
    const studentName = `${o.studentId?.firstName || ""} ${o.studentId?.lastName || ""}`
      .trim()
      .toLowerCase();
    const matchSearch =
      !s ||
      o.orderNumber?.toLowerCase().includes(s) ||
      o.customerName?.toLowerCase().includes(s) ||
      studentName.includes(s);
    const matchPay = filterPay ? o.paymentStatus === filterPay : true;
    return matchSearch && matchPay;
  });

  const paidCount = orders.filter((o) => o.paymentStatus === "Paid").length;
  const pendingCount = orders.filter((o) => o.paymentStatus === "Pending").length;
  const revenue = orders
    .filter((o) => o.paymentStatus === "Paid")
    .reduce((s, o) => s + (o.total || 0), 0);

  if (loading) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600" />
      </div>
    );
  }

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
          <h1 className="text-2xl sm:text-3xl font-bold">Order Management</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Create store orders and collect payment via Cash / UPI / Razorpay
            (same keys as Fee Collection)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus /> New Order
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat title="PENDING" value={pendingCount} />
        <Stat title="PAID ORDERS" value={paidCount} />
        <Stat title="REVENUE" value={fmtINR(revenue)} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order / customer..."
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          />
          <select
            value={filterPay}
            onChange={(e) => setFilterPay(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="">All Payments</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-4 text-left">Order</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Items</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Payment</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order._id} className="border-t align-top">
                <td className="p-4">
                  <p className="font-bold text-[rgb(var(--primary))]">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="p-4">
                  <p className="font-medium">{order.customerName || "—"}</p>
                  {order.studentId && (
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {order.studentId.studentId || ""}
                    </p>
                  )}
                </td>
                <td className="p-4 text-xs">
                  {order.items?.slice(0, 3).map((i, idx) => (
                    <p key={idx}>
                      {i.quantity}× {i.name}
                    </p>
                  ))}
                  {(order.items?.length || 0) > 3 && (
                    <p className="text-[rgb(var(--text-muted))]">
                      +{order.items.length - 3} more
                    </p>
                  )}
                </td>
                <td className="p-4 font-semibold">{fmtINR(order.total)}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      order.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-700"
                        : order.paymentStatus === "Pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                  {order.paymentMode && (
                    <p className="text-xs mt-1 text-[rgb(var(--text-muted))]">
                      {order.paymentMode}
                    </p>
                  )}
                </td>
                <td className="p-4">
                  <select
                    value={order.orderStatus}
                    onChange={(e) => updateStatus(order, e.target.value)}
                    className="border rounded-lg px-2 py-1 text-xs bg-[rgb(var(--surface))]"
                  >
                    {["Placed", "Processing", "Ready", "Delivered", "Cancelled"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap justify-center gap-1">
                    {order.paymentStatus === "Pending" &&
                      order.orderStatus !== "Cancelled" && (
                        <>
                          <button
                            onClick={() => payOnline(order)}
                            disabled={payLoadingId === order._id}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs flex items-center gap-1"
                          >
                            <FaCreditCard /> Online
                          </button>
                          <button
                            onClick={() => payCash(order, "Cash")}
                            className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs flex items-center gap-1"
                          >
                            <FaRupeeSign /> Cash
                          </button>
                        </>
                      )}
                    {order.paymentStatus !== "Paid" && (
                      <button
                        onClick={() => deleteOrder(order)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs flex items-center gap-1"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-10 text-[rgb(var(--text-muted))]">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Store Order</h3>
              <button onClick={() => setFormModal(false)}>✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold uppercase text-[rgb(var(--text-muted))]">
                  Student (optional)
                </label>
                <select
                  value={form.studentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const st = students.find((x) => x._id === id);
                    setForm((p) => ({
                      ...p,
                      studentId: id,
                      customerName: st
                        ? `${st.firstName} ${st.lastName}`.trim()
                        : p.customerName,
                    }));
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-[rgb(var(--surface))]"
                >
                  <option value="">Walk-in / select student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[rgb(var(--text-muted))]">
                  Customer Name
                </label>
                <input
                  value={form.customerName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, customerName: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-[rgb(var(--surface))]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[rgb(var(--text-muted))]">
                  Payment at create
                </label>
                <select
                  value={form.paymentMode}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, paymentMode: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-[rgb(var(--surface))]"
                >
                  <option value="">Pay later (Pending)</option>
                  <option value="Cash">Cash (mark paid)</option>
                  <option value="UPI">UPI (mark paid)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[rgb(var(--text-muted))]">
                  Notes
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-[rgb(var(--surface))]"
                />
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {form.lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 flex-wrap items-center">
                  <select
                    value={line.productId}
                    onChange={(e) => {
                      const lines = [...form.lines];
                      lines[idx] = { ...lines[idx], productId: e.target.value };
                      setForm((p) => ({ ...p, lines }));
                    }}
                    className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        [{p.category}] {p.name} — {fmtINR(p.price)} (stock{" "}
                        {p.stock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => {
                      const lines = [...form.lines];
                      lines[idx] = { ...lines[idx], quantity: e.target.value };
                      setForm((p) => ({ ...p, lines }));
                    }}
                    className="w-20 border rounded-lg px-2 py-2 text-sm bg-[rgb(var(--surface))]"
                  />
                  {form.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          lines: p.lines.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  lines: [...p.lines, { productId: "", quantity: "1" }],
                }))
              }
              className="text-sm font-semibold text-[rgb(var(--primary))] mb-4"
            >
              + Add line
            </button>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="font-semibold">Total: {fmtINR(cartTotal)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={formLoading}
                  className="px-4 py-2 bg-[rgb(var(--primary))] rounded-lg text-sm disabled:opacity-60"
                >
                  {formLoading ? "Saving..." : "Create Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {devCheckout && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Dev Payment Gateway</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-3">
              No real Razorpay keys configured — same mock flow as fee
              collection. Confirm to mark order paid.
            </p>
            <div className="text-sm space-y-1 mb-5">
              <p>
                Order: <b>{devCheckout.orderNumber}</b>
              </p>
              <p>
                Amount: <b>{fmtINR(devCheckout.amountRupees)}</b>
              </p>
              <p className="font-mono text-xs">{devCheckout.orderId}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDevCheckout(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={completeDevPayment}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
              >
                OK — Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ title, value }) => (
  <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 border-l-rose-500">
    <p className="text-xs font-medium">{title}</p>
    <p className="text-xl font-bold mt-1">{value}</p>
  </div>
);

export default CommerceOrders;
