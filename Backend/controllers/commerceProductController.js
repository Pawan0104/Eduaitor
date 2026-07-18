import CommerceProduct, {
  COMMERCE_CATEGORIES,
} from "../models/commerceProduct.js";

const getSchoolId = (req) => req.user?.school_id;

const normalizeSku = (sku) => {
  if (sku === undefined || sku === null) return undefined;
  const value = String(sku).trim().toUpperCase();
  return value || undefined;
};

export const getProducts = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified." });
    }

    const { category, search, status } = req.query;
    const filter = { schoolId };

    if (category && COMMERCE_CATEGORIES.includes(category)) {
      filter.category = category;
    }
    if (status) filter.status = status;

    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { classLabel: { $regex: q, $options: "i" } },
      ];
    }

    const products = await CommerceProduct.find(filter)
      .sort({ category: 1, name: 1 })
      .lean();

    return res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

/** Parent/student catalogue — active items with stock only */
export const getParentProducts = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified." });
    }

    const { category, search } = req.query;
    const filter = {
      schoolId,
      status: "Active",
      stock: { $gt: 0 },
    };

    if (category && COMMERCE_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { classLabel: { $regex: q, $options: "i" } },
      ];
    }

    const products = await CommerceProduct.find(filter)
      .select(
        "category name description price stock unit size gender classLabel subject author brand color sku"
      )
      .sort({ category: 1, name: 1 })
      .lean();

    return res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const getStoreSummary = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified." });
    }

    const products = await CommerceProduct.find({ schoolId }).lean();
    const byCategory = COMMERCE_CATEGORIES.map((cat) => {
      const items = products.filter((p) => p.category === cat);
      return {
        category: cat,
        totalItems: items.length,
        activeItems: items.filter((p) => p.status === "Active").length,
        totalStock: items.reduce((s, p) => s + (p.stock || 0), 0),
        lowStock: items.filter((p) => p.status === "Active" && p.stock <= 5).length,
        inventoryValue: items.reduce(
          (s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0),
          0
        ),
      };
    });

    return res.json({
      success: true,
      data: {
        totals: {
          products: products.length,
          active: products.filter((p) => p.status === "Active").length,
          stock: products.reduce((s, p) => s + (p.stock || 0), 0),
          value: products.reduce(
            (s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0),
            0
          ),
        },
        byCategory,
        lowStockItems: products
          .filter((p) => p.status === "Active" && p.stock <= 5)
          .slice(0, 20),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified." });
    }

    const {
      category,
      name,
      sku,
      description,
      price,
      stock,
      unit,
      size,
      gender,
      classLabel,
      subject,
      author,
      isbn,
      brand,
      color,
      status,
    } = req.body;

    if (!COMMERCE_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category." });
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Product name is required." });
    }
    if (price === undefined || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "Valid price is required." });
    }

    const payload = {
      schoolId,
      category,
      name: String(name).trim(),
      description: description?.trim() || "",
      price: Number(price),
      stock: stock === undefined || stock === "" ? 0 : Number(stock),
      unit: unit?.trim() || "piece",
      size: size?.trim() || "",
      gender: gender || "",
      classLabel: classLabel?.trim() || "",
      subject: subject?.trim() || "",
      author: author?.trim() || "",
      isbn: isbn?.trim() || "",
      brand: brand?.trim() || "",
      color: color?.trim() || "",
      status: status || "Active",
    };

    const normalizedSku = normalizeSku(sku);
    if (normalizedSku) payload.sku = normalizedSku;

    const product = await CommerceProduct.create(payload);
    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
    }
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const product = await CommerceProduct.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const fields = [
      "name",
      "description",
      "price",
      "stock",
      "unit",
      "size",
      "gender",
      "classLabel",
      "subject",
      "author",
      "isbn",
      "brand",
      "color",
      "status",
    ];

    for (const key of fields) {
      if (req.body[key] !== undefined) {
        if (key === "name" && !String(req.body[key]).trim()) {
          return res.status(400).json({
            success: false,
            message: "Product name is required.",
          });
        }
        if (key === "price" || key === "stock") {
          product[key] = Number(req.body[key]);
        } else if (typeof req.body[key] === "string") {
          product[key] = req.body[key].trim();
        } else {
          product[key] = req.body[key];
        }
      }
    }

    if (req.body.sku !== undefined) {
      const normalizedSku = normalizeSku(req.body.sku);
      if (normalizedSku) product.sku = normalizedSku;
      else product.set("sku", undefined);
    }

    if (
      req.body.category &&
      COMMERCE_CATEGORIES.includes(req.body.category)
    ) {
      product.category = req.body.category;
    }

    await product.save();
    return res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
    }
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const product = await CommerceProduct.findOneAndDelete({
      _id: req.params.id,
      schoolId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};
