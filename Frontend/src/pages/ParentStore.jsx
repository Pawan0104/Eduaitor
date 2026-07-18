import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaArrowLeft,
  FaStore,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaTrash,
  FaCreditCard,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const API = import.meta.env.VITE_API_URL;

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "uniform", label: "Uniforms" },
  { id: "book", label: "Books" },
  { id: "stationery", label: "Stationery" },
  { id: "accessory", label: "Accessories" },
];

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

const ParentStore = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isMobile = window.innerWidth <= 768;

  const [tab, setTab] = useState("shop"); // shop | cart | orders
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]); // { product, quantity }
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [payLoadingId, setPayLoadingId] = useState(null);
  const [devCheckout, setDevCheckout] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/commerce/parent/products`, {
        withCredentials: true,
        params: {
          category: category || undefined,
          search: search.trim() || undefined,
        },
      });
      setProducts(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load store");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/commerce/parent/orders`, {
        withCredentials: true,
      });
      setOrders(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load orders");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchOrders()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = useMemo(
    () => cart.reduce((s, c) => s + c.product.price * c.quantity, 0),
    [cart]
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Not enough stock");
          return prev;
        }
        return prev.map((c) =>
          c.product._id === product._id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success("Added to cart");
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product._id !== productId) return c;
          const next = c.quantity + delta;
          if (next > c.product.stock) {
            toast.error("Not enough stock");
            return c;
          }
          return { ...c, quantity: next };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((c) => c.product._id !== productId));
  };

  const verifyOnlinePayment = async (commerceOrderId, payload) => {
    await axios.post(
      `${API}/commerce/parent/orders/${commerceOrderId}/razorpay/verify`,
      payload,
      { withCredentials: true }
    );
    toast.success("Payment successful");
    setDevCheckout(null);
    setCart([]);
    await fetchOrders();
    await fetchProducts();
    setTab("orders");
  };

  const payOnline = async (order) => {
    try {
      setPayLoadingId(order._id);
      const { data } = await axios.post(
        `${API}/commerce/parent/orders/${order._id}/razorpay/order`,
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
      toast.error(err.response?.data?.message || "Payment failed");
    }
  };

  const placeOrderAndPay = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");

    try {
      setPlacing(true);
      const { data } = await axios.post(
        `${API}/commerce/parent/orders`,
        {
          items: cart.map((c) => ({
            productId: c.product._id,
            quantity: c.quantity,
          })),
          notes: "Ordered from parent store",
        },
        { withCredentials: true }
      );

      if (!data?.success || !data?.data?._id) {
        toast.error(data?.message || "Could not place order");
        return;
      }

      toast.success("Order created — complete payment");
      setCart([]);
      await fetchOrders();
      await payOnline(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const filteredProducts = products; // already filtered by API

  if (loading) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-xl bg-white border text-sm font-bold"
        >
          <FaArrowLeft /> {t("common.back")}
        </button>
      )}

      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FaStore size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">School Store</h1>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Order uniforms, books &amp; more — pay online to school
            </p>
          </div>
        </div>

        <div className="flex rounded-xl border bg-[rgb(var(--surface))] p-1 gap-1">
          {[
            { id: "shop", label: "Shop" },
            { id: "cart", label: `Cart (${cartCount})` },
            { id: "orders", label: "My Orders" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                tab === item.id
                  ? "bg-[rgb(var(--primary))] text-white"
                  : "text-[rgb(var(--text-muted))]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "shop" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
              placeholder="Search products..."
              className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] flex-1 min-w-[180px]"
            />
            <button
              type="button"
              onClick={fetchProducts}
              className="px-3 py-2 rounded-lg border text-sm font-semibold"
            >
              Search
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id || "all"}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                  category === c.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-[rgb(var(--surface))]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p._id}
                className="rounded-2xl border bg-[rgb(var(--surface))] p-4 shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                      {p.category}
                    </p>
                    <h3 className="font-bold text-base">{p.name}</h3>
                  </div>
                  <p className="font-bold text-[rgb(var(--primary))]">
                    {fmtINR(p.price)}
                  </p>
                </div>
                <p className="text-xs text-[rgb(var(--text-muted))] mb-3 line-clamp-2">
                  {[p.size, p.gender, p.classLabel, p.subject, p.brand]
                    .filter(Boolean)
                    .join(" · ") || p.description || "—"}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-[rgb(var(--text-muted))]">
                    Stock: {p.stock}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    className="px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] text-sm font-semibold flex items-center gap-1"
                  >
                    <FaShoppingCart size={12} /> Add
                  </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-[rgb(var(--text-muted))]">
                No products available right now.
              </div>
            )}
          </div>
        </>
      )}

      {tab === "cart" && (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border shadow-sm overflow-hidden">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-[rgb(var(--text-muted))]">
              Your cart is empty. Browse the shop to add items.
            </div>
          ) : (
            <>
              <div className="divide-y">
                {cart.map((c) => (
                  <div
                    key={c.product._id}
                    className="p-4 flex flex-wrap items-center gap-3 justify-between"
                  >
                    <div className="min-w-[160px]">
                      <p className="font-semibold">{c.product.name}</p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        {fmtINR(c.product.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(c.product._id, -1)}
                        className="w-8 h-8 rounded-lg border flex items-center justify-center"
                      >
                        <FaMinus size={10} />
                      </button>
                      <span className="w-8 text-center font-bold">
                        {c.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.product._id, 1)}
                        className="w-8 h-8 rounded-lg border flex items-center justify-center"
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>
                    <p className="font-bold w-24 text-right">
                      {fmtINR(c.product.price * c.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(c.product._id)}
                      className="text-red-500 p-2"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-lg font-bold">Total: {fmtINR(cartTotal)}</p>
                <button
                  type="button"
                  disabled={placing}
                  onClick={placeOrderAndPay}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <FaCreditCard />
                  {placing ? "Placing..." : "Place order & pay online"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left">Order</th>
                <th className="p-4 text-left">Items</th>
                <th className="p-4 text-left">Total</th>
                <th className="p-4 text-left">Payment</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-t align-top">
                  <td className="p-4">
                    <p className="font-bold text-[rgb(var(--primary))]">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4 text-xs">
                    {order.items?.map((i, idx) => (
                      <p key={idx}>
                        {i.quantity}× {i.name}
                      </p>
                    ))}
                  </td>
                  <td className="p-4 font-semibold">{fmtINR(order.total)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.paymentStatus === "Paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-xs">{order.orderStatus}</td>
                  <td className="p-4 text-center">
                    {order.paymentStatus === "Pending" &&
                      order.orderStatus !== "Cancelled" && (
                        <button
                          type="button"
                          disabled={payLoadingId === order._id}
                          onClick={() => payOnline(order)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold"
                        >
                          Pay now
                        </button>
                      )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-12 text-[rgb(var(--text-muted))]"
                  >
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {devCheckout && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Dev Payment Gateway</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-3">
              School Razorpay keys not configured — same mock flow as fee
              payment. Confirm to pay the school store order.
            </p>
            <div className="text-sm space-y-1 mb-5">
              <p>
                Order: <b>{devCheckout.orderNumber}</b>
              </p>
              <p>
                Amount: <b>{fmtINR(devCheckout.amountRupees)}</b>
              </p>
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

export default ParentStore;
