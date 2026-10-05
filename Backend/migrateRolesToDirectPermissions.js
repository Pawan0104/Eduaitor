import dotenv from "dotenv";
import mongoose from "mongoose";
import Staff from "./models/staff.js";
import Teacher from "./models/teacher.js";
import SchoolStaffRole from "./models/schoolStaffRole.js";
import School from "./models/school.js";
import { MODULE_KEYS } from "./constants/module.js";
import { resolveSubscribedModules } from "./utils/schoolModules.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");

const MODELS = [
  { label: "Teacher", Model: Teacher },
  { label: "Staff", Model: Staff },
];

const nameOf = (doc) =>
  doc.fullName || doc.name || doc.teacherName || doc.email || String(doc._id);

const resolveModulesFor = (school) =>
  resolveSubscribedModules(school, {
    userEmail: school?.admin_email,
    role: "school_admin",
  });

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set in .env — aborting.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(
    `Connected. Mode: ${APPLY ? "APPLY (writes to DB)" : "DRY RUN (no writes)"}`,
  );

  const roleCache = new Map();
  const getRole = async (roleId) => {
    const key = String(roleId);
    if (!roleCache.has(key)) {
      roleCache.set(key, await SchoolStaffRole.findById(key).lean());
    }
    return roleCache.get(key);
  };

  const plan = [];
  const warnings = [];

  for (const { label, Model } of MODELS) {
    const docs = await Model.find({
      customRoleId: { $ne: null, $exists: true },
    })
      .select("schoolId fullName name teacherName email permissions customRoleId")
      .lean();

    for (const doc of docs) {
      const school = await School.findById(doc.schoolId).lean();
      const allowed = resolveModulesFor(school);

      const role = await getRole(doc.customRoleId);
      if (!role) {
        warnings.push(
          `${label} "${nameOf(doc)}" — role ${doc.customRoleId} not found. Left untouched; pick modules manually.`,
        );
        continue;
      }
      if (role.isActive === false) {
        warnings.push(
          `${label} "${nameOf(doc)}" — role "${role.name}" is inactive. Left untouched; pick modules manually.`,
        );
        continue;
      }

      const rolePerms = role.permissions || [];
      const nextPerms = [
        ...new Set([
          ...(doc.permissions || []),
          ...rolePerms,
        ]),
      ].filter((p) => MODULE_KEYS.includes(p));

      const dropped = nextPerms.filter((p) => !allowed.includes(p));
      const finalPerms = nextPerms.filter((p) => allowed.includes(p));

      if (finalPerms.length === 0) {
        warnings.push(
          `${label} "${nameOf(doc)}" — role "${role.name}" yields no modules available to this school. Left untouched; pick modules manually.`,
        );
        continue;
      }

      plan.push({
        label,
        Model,
        _id: doc._id,
        name: nameOf(doc),
        roleName: role.name,
        perms: finalPerms,
        dropped,
      });
    }
  }

  console.log(`\nWill convert ${plan.length} record(s) to direct permissions:\n`);
  for (const p of plan) {
    console.log(`  [${p.label}] ${p.name}`);
    console.log(`      role "${p.roleName}" -> ${p.perms.length} module(s)`);
    console.log(`      ${p.perms.join(", ")}`);
    if (p.dropped.length) {
      console.log(
        `      dropped (not subscribed by school): ${p.dropped.join(", ")}`,
      );
    }
  }

  if (warnings.length) {
    console.log(`\n${warnings.length} record(s) need manual attention:\n`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write these changes.");
    await mongoose.disconnect();
    return;
  }

  for (const { label, Model } of MODELS) {
    const ops = plan
      .filter((p) => p.label === label)
      .map((p) => ({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { permissions: p.perms, customRoleId: null } },
        },
      }));
    if (!ops.length) continue;
    const res = await Model.bulkWrite(ops);
    console.log(
      `\n${label}: matched ${res.matchedCount}, modified ${res.modifiedCount}`,
    );
  }

  console.log("\nDone. customRoleId cleared on all converted records.");
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});