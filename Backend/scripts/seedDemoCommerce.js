import dotenv from "dotenv";
import mongoose from "mongoose";
import School from "../models/school.js";
import Student from "../models/student.js";
import CommerceProduct from "../models/commerceProduct.js";
import CommerceOrder from "../models/commerceOrder.js";

dotenv.config({ path: ".env" });

const PRODUCTS = [
  {
    category: "uniform",
    name: "Boys Shirt (White)",
    sku: "UNI-BS-W-M",
    price: 450,
    stock: 40,
    size: "M",
    gender: "Boys",
    color: "White",
    unit: "piece",
  },
  {
    category: "uniform",
    name: "Boys Trouser (Grey)",
    sku: "UNI-BT-G-M",
    price: 550,
    stock: 35,
    size: "M",
    gender: "Boys",
    color: "Grey",
    unit: "piece",
  },
  {
    category: "uniform",
    name: "Girls Tunic (Navy)",
    sku: "UNI-GT-N-M",
    price: 650,
    stock: 30,
    size: "M",
    gender: "Girls",
    color: "Navy",
    unit: "piece",
  },
  {
    category: "book",
    name: "Mathematics Grade 1",
    sku: "BK-MATH-G1",
    price: 220,
    stock: 50,
    classLabel: "Grade 1",
    subject: "Mathematics",
    author: "NCERT",
    unit: "piece",
  },
  {
    category: "book",
    name: "English Grade 5",
    sku: "BK-ENG-G5",
    price: 280,
    stock: 45,
    classLabel: "Grade 5",
    subject: "English",
    author: "NCERT",
    unit: "piece",
  },
  {
    category: "stationery",
    name: "Long Notebook (200 pages)",
    sku: "STN-NB-200",
    price: 60,
    stock: 120,
    brand: "Classmate",
    unit: "piece",
  },
  {
    category: "stationery",
    name: "Blue Ball Pen Pack (10)",
    sku: "STN-PEN-BL10",
    price: 50,
    stock: 80,
    brand: "Reynolds",
    unit: "pack",
  },
  {
    category: "accessory",
    name: "School Tie (Navy)",
    sku: "ACC-TIE-N",
    price: 120,
    stock: 60,
    gender: "Unisex",
    color: "Navy",
    size: "Standard",
    brand: "School Store",
    unit: "piece",
  },
  {
    category: "accessory",
    name: "Belt (Black)",
    sku: "ACC-BELT-B",
    price: 150,
    stock: 55,
    gender: "Unisex",
    color: "Black",
    size: "Adjustable",
    brand: "School Store",
    unit: "piece",
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const school = await School.findOne({
    $or: [
      { school_name: "Default School" },
      { admin_email: "school@admin.com" },
    ],
  });

  if (!school) throw new Error("Default School not found");

  if (!school.subscribed_modules?.includes("commerce")) {
    await School.updateOne(
      { _id: school._id },
      { $addToSet: { subscribed_modules: "commerce" } }
    );
  }

  const createdProducts = [];
  for (const item of PRODUCTS) {
    const product = await CommerceProduct.findOneAndUpdate(
      { schoolId: school._id, sku: item.sku },
      {
        $set: {
          ...item,
          schoolId: school._id,
          status: "Active",
          description: `Demo ${item.category} item`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    createdProducts.push(product);
  }

  const aarav = await Student.findOne({
    schoolId: school._id,
    firstName: "Aarav",
    lastName: "Sharma",
  });
  const ananya = await Student.findOne({
    schoolId: school._id,
    firstName: "Ananya",
    lastName: "Verma",
  });

  // Clear previous demo orders for clean seed
  await CommerceOrder.deleteMany({
    schoolId: school._id,
    orderNumber: { $in: ["ORD-00001", "ORD-00002", "ORD-00003"] },
  });

  const bySku = Object.fromEntries(createdProducts.map((p) => [p.sku, p]));

  const demoOrders = [
    {
      orderNumber: "ORD-00001",
      studentId: aarav?._id || null,
      customerName: aarav ? "Aarav Sharma" : "Walk-in",
      items: [
        {
          product: bySku["UNI-BS-W-M"],
          quantity: 1,
        },
        {
          product: bySku["ACC-TIE-N"],
          quantity: 1,
        },
      ],
      paymentStatus: "Paid",
      paymentMode: "Cash",
      orderStatus: "Delivered",
      paidAt: new Date("2025-07-01"),
    },
    {
      orderNumber: "ORD-00002",
      studentId: ananya?._id || null,
      customerName: ananya ? "Ananya Verma" : "Walk-in",
      items: [
        {
          product: bySku["UNI-GT-N-M"],
          quantity: 1,
        },
        {
          product: bySku["BK-MATH-G1"],
          quantity: 1,
        },
        {
          product: bySku["STN-NB-200"],
          quantity: 2,
        },
      ],
      paymentStatus: "Pending",
      paymentMode: "",
      orderStatus: "Placed",
      paidAt: null,
    },
    {
      orderNumber: "ORD-00003",
      studentId: aarav?._id || null,
      customerName: aarav ? "Aarav Sharma" : "Walk-in",
      items: [
        {
          product: bySku["BK-ENG-G5"],
          quantity: 1,
        },
        {
          product: bySku["STN-PEN-BL10"],
          quantity: 1,
        },
      ],
      paymentStatus: "Paid",
      paymentMode: "Online",
      orderStatus: "Processing",
      paidAt: new Date("2025-07-10"),
      razorpayOrderId: "order_local_demo_003",
      razorpayPaymentId: "pay_local_demo_003",
    },
  ];

  const createdOrders = [];
  for (const row of demoOrders) {
    const items = row.items.map(({ product, quantity }) => ({
      productId: product._id,
      name: product.name,
      category: product.category,
      sku: product.sku,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
    }));
    const total = items.reduce((s, i) => s + i.lineTotal, 0);

    const order = await CommerceOrder.create({
      schoolId: school._id,
      orderNumber: row.orderNumber,
      studentId: row.studentId,
      customerName: row.customerName,
      items,
      subtotal: total,
      total,
      paymentStatus: row.paymentStatus,
      paymentMode: row.paymentMode,
      orderStatus: row.orderStatus,
      paidAt: row.paidAt,
      razorpayOrderId: row.razorpayOrderId || "",
      razorpayPaymentId: row.razorpayPaymentId || "",
      notes: "Demo store order",
    });
    createdOrders.push({
      orderNumber: order.orderNumber,
      total: order.total,
      paymentStatus: order.paymentStatus,
    });
  }

  console.log(`School: ${school.school_name}`);
  console.log(`Products: ${createdProducts.length}`);
  console.log(JSON.stringify(createdOrders, null, 2));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
