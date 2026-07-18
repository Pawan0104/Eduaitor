import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import {
  getProducts,
  getParentProducts,
  getStoreSummary,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/commerceProductController.js";
import {
  getOrders,
  getOrder,
  getMyOrders,
  createOrder,
  createParentOrder,
  updateOrderStatus,
  markOrderPaidCash,
  initiateOrderPayment,
  verifyOrderPayment,
  deleteOrder,
} from "../controllers/commerceOrderController.js";

const router = express.Router();
const guard = [authMiddleware, checkModuleAccess("commerce")];

/* Parent / student store (before /orders/:id) */
router.get("/parent/products", ...guard, getParentProducts);
router.get("/parent/orders", ...guard, getMyOrders);
router.post("/parent/orders", ...guard, createParentOrder);
router.post("/parent/orders/:id/razorpay/order", ...guard, initiateOrderPayment);
router.post("/parent/orders/:id/razorpay/verify", ...guard, verifyOrderPayment);

router.get("/products", ...guard, getProducts);
router.get("/store/summary", ...guard, getStoreSummary);
router.post("/products", ...guard, createProduct);
router.put("/products/:id", ...guard, updateProduct);
router.delete("/products/:id", ...guard, deleteProduct);

router.get("/orders", ...guard, getOrders);
router.get("/orders/:id", ...guard, getOrder);
router.post("/orders", ...guard, createOrder);
router.patch("/orders/:id/status", ...guard, updateOrderStatus);
router.post("/orders/:id/pay-cash", ...guard, markOrderPaidCash);
router.post("/orders/:id/razorpay/order", ...guard, initiateOrderPayment);
router.post("/orders/:id/razorpay/verify", ...guard, verifyOrderPayment);
router.delete("/orders/:id", ...guard, deleteOrder);

export default router;
