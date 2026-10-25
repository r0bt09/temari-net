import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { one, transaction } from "./db";
import { asyncRoute, ApiError } from "./helpers";
import { authenticate, requireRoles } from "./security";

const router = Router();
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
const validRef = (value: string) => /^[A-Za-z0-9_-]{8,100}$/.test(value);

async function finishSponsorship(txRef: string) {
  return transaction(async (connection) => {
    const [rows] = await connection.execute("SELECT id, student_id, status FROM temari_sponsorships WHERE tx_ref = ? FOR UPDATE", [txRef]);
    const item = (rows as Array<{ id: number; student_id: number | null; status: string }>)[0];
    if (!item) throw new ApiError(404, "Sponsorship reference was not found.");
    if (item.status === "completed") return { status: "completed", awardedCoins: 0, alreadyCompleted: true };
    await connection.execute("UPDATE temari_sponsorships SET status = 'completed' WHERE id = ?", [item.id]);
    if (item.student_id) await connection.execute("UPDATE temari_users SET coins = coins + 50 WHERE id = ?", [item.student_id]);
    return { status: "completed", awardedCoins: item.student_id ? 50 : 0, alreadyCompleted: false };
  });
}

async function failSponsorship(txRef: string) {
  return transaction(async (connection) => {
    const [rows] = await connection.execute("SELECT id, status FROM temari_sponsorships WHERE tx_ref = ? FOR UPDATE", [txRef]);
    const item = (rows as Array<{ id: number; status: string }>)[0];
    if (!item) throw new ApiError(404, "Sponsorship reference was not found.");
    if (item.status !== "completed") await connection.execute("UPDATE temari_sponsorships SET status = 'failed' WHERE id = ?", [item.id]);
    return { status: item.status === "completed" ? "completed" : "failed", awardedCoins: 0 };
  });
}

router.post("/initialize", authenticate, requireRoles("student", "teacher", "admin"), asyncRoute(async (req, res) => {
  const sponsor = typeof req.body?.sponsor_name === "string" ? req.body.sponsor_name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const phone = typeof req.body?.phone_number === "string" ? req.body.phone_number.replace(/[\s-]/g, "") : "";
  const amount = Number(req.body?.amount_etb ?? 50);
  const studentId = req.body?.student_id == null ? null : Number(req.body.student_id);
  if (sponsor.length < 2 || sponsor.length > 100) throw new ApiError(400, "Enter the sponsor’s name.");
  if (email.length > 100 || !/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, "Enter a valid sponsor email address.");
  if (!/^(09|07)\d{8}$/.test(phone)) throw new ApiError(400, "Enter a 10-digit Ethiopian phone beginning 09 or 07.");
  if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) throw new ApiError(400, "Sponsorship amount must be from 1 to 1,000,000 ETB.");
  if (studentId !== null && (!Number.isInteger(studentId) || studentId < 1)) throw new ApiError(400, "Invalid student ID.");
  if (studentId !== null) {
    const linkedStudent = await one<{ role: string }>("SELECT role FROM temari_users WHERE id = ?", [studentId]);
    if (!linkedStudent || linkedStudent.role !== "student") throw new ApiError(400, "Sponsorship target must be a student account.");
  }
  const txRef = `TEMARINET-TX-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await transaction(async (connection) => {
    await connection.execute("INSERT INTO temari_sponsorships (sponsor_name, email, phone_number, amount_etb, student_id, status, tx_ref) VALUES (?, ?, ?, ?, ?, 'pending', ?)", [sponsor, email, phone, amount, studentId, txRef]);
  });
  const secret = process.env.CHAPA_SECRET_KEY;
  if (!secret || process.env.CHAPA_DEMO_MODE === "true") {
    return res.status(201).json({ tx_ref: txRef, checkout_url: `/api/chapa/mock-checkout?tx_ref=${encodeURIComponent(txRef)}`, mock: true });
  }
  try {
    const base = process.env.PUBLIC_API_URL?.replace(/\/$/, "") || "";
    const callback = process.env.CHAPA_CALLBACK_URL || (base ? `${base}/api/chapa/verify/${encodeURIComponent(txRef)}` : undefined);
    const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: String(amount), currency: "ETB", email: email || undefined, first_name: sponsor.split(/\s+/)[0], phone_number: phone, tx_ref: txRef, callback_url: callback, return_url: base ? `${base}/api/chapa/success-page?tx_ref=${encodeURIComponent(txRef)}` : undefined, customization: { title: "TEMARI NET Sponsorship" } }),
    });
    const payload = await response.json() as { status?: string; data?: { checkout_url?: string }; message?: string };
    if (!response.ok || !payload.data?.checkout_url) throw new Error(payload.message || "Chapa checkout did not return a URL");
    res.status(201).json({ tx_ref: txRef, checkout_url: payload.data.checkout_url, mock: false });
  } catch {
    if (process.env.CHAPA_DEMO_MODE === "fallback") return res.status(201).json({ tx_ref: txRef, checkout_url: `/api/chapa/mock-checkout?tx_ref=${encodeURIComponent(txRef)}`, mock: true });
    throw new ApiError(502, "Chapa could not start checkout. Your pending sponsorship was saved; try again or contact a teacher.");
  }
}));

router.get("/verify/:tx_ref", asyncRoute(async (req, res) => {
  const txRef = String(req.params.tx_ref);
  if (!validRef(txRef)) throw new ApiError(400, "Invalid transaction reference.");
  const item = await one<{ status: string }>("SELECT status FROM temari_sponsorships WHERE tx_ref = ?", [txRef]);
  if (!item) throw new ApiError(404, "Sponsorship reference was not found.");
  if (item.status === "completed") return res.json({ status: "completed", message: "This sponsorship was already confirmed." });
  if (item.status === "failed") throw new ApiError(409, "This sponsorship has already been marked failed.");
  const secret = process.env.CHAPA_SECRET_KEY;
  if (secret && process.env.CHAPA_DEMO_MODE !== "true") {
    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const payload = await response.json() as { status?: string; data?: { status?: string }; message?: string };
    const providerStatus = String(payload.data?.status ?? payload.status ?? "").toLowerCase();
    if (providerStatus === "failed") return res.json(await failSponsorship(txRef));
    if (!response.ok || (providerStatus !== "success" && providerStatus !== "completed")) throw new ApiError(409, payload.message || "Chapa has not confirmed this transaction yet.");
  } else {
    const url = new URL(`http://temari.local${req.originalUrl}`);
    if (!url.searchParams.has("mock") && !String(req.headers.referer ?? "").includes("mock-checkout")) {
      const [rows] = await (await import("./db")).rows<{ tx_ref: string }>("SELECT tx_ref FROM temari_sponsorships WHERE tx_ref = ?", [txRef]);
      if (!rows) throw new ApiError(404, "Sponsorship reference was not found.");
    }
  }
  const completed = await finishSponsorship(txRef);
  res.json(completed);
}));

router.post("/webhook", asyncRoute(async (req, res) => {
  const secret = process.env.CHAPA_WEBHOOK_SECRET;
  const signature = req.header("x-chapa-signature") ?? "";
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
  if (!secret || !rawBody || !signature) throw new ApiError(401, "Webhook signature is not configured or missing.");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new ApiError(401, "Webhook signature is invalid.");
  const txRef = String(req.body?.tx_ref ?? "");
  if (!validRef(txRef)) throw new ApiError(400, "Webhook has an invalid transaction reference.");
  const providerStatus = String(req.body?.status ?? req.body?.data?.status ?? "").toLowerCase();
  if (providerStatus === "success" || providerStatus === "completed") return res.json({ received: true, ...(await finishSponsorship(txRef)) });
  if (providerStatus === "failed") return res.json({ received: true, ...(await failSponsorship(txRef)) });
  if (providerStatus === "pending") return res.status(202).json({ received: true, status: "pending" });
  throw new ApiError(400, "Webhook has an unsupported or missing transaction status.");
}));

router.get("/mock-checkout", asyncRoute(async (req, res) => {
  if (process.env.CHAPA_SECRET_KEY && process.env.CHAPA_DEMO_MODE !== "true") throw new ApiError(404, "Mock checkout is disabled while Chapa is configured.");
  const txRef = String(req.query.tx_ref ?? "");
  if (!validRef(txRef)) throw new ApiError(400, "Invalid transaction reference.");
  const item = await one<{ tx_ref: string; sponsor_name: string; amount_etb: string; status: string }>("SELECT tx_ref, sponsor_name, amount_etb, status FROM temari_sponsorships WHERE tx_ref = ?", [txRef]);
  if (!item) throw new ApiError(404, "Sponsorship reference was not found.");
  const safe = escapeHtml(item.tx_ref);
  res.type("html").send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TEMARI NET Demo Checkout</title><style>body{margin:0;background:#fff9ee;font:16px system-ui;color:#20352e;display:grid;min-height:100vh;place-items:center}.card{max-width:430px;margin:20px;padding:28px;border:1px solid #e7ddcb;border-radius:24px;background:white;box-shadow:0 10px 35px #20352e12}.mark{width:46px;height:46px;border-radius:16px;background:#146b54;color:#fff;display:grid;place-items:center;font-size:24px}h1{font-size:23px;margin:18px 0 8px}.muted{color:#68766f;line-height:1.55}.amount{font-size:26px;font-weight:900;background:#fff0c9;display:inline-block;padding:9px 14px;border-radius:14px;margin:8px 0 14px}a{display:block;text-align:center;background:#146b54;color:white;text-decoration:none;padding:14px;border-radius:14px;font-weight:800;margin-top:18px}</style><main class="card"><div class="mark">✦</div><h1>TEMARI NET · Demo checkout</h1><p class="muted">This is an offline simulation for Telebirr / CBE Birr. No real payment will be taken.</p><div class="amount">${escapeHtml(String(item.amount_etb))} ETB</div><p class="muted">Reference: ${safe}</p><a href="/api/chapa/verify/${encodeURIComponent(txRef)}?mock=1">Approve demo sponsorship</a></main></html>`);
}));

router.get("/success-page", (_req, res) => res.type("html").send("<!doctype html><html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>TEMARI NET · Thank you</title><body style='font:16px system-ui;background:#fff9ee;color:#20352e;display:grid;min-height:100vh;place-items:center'><main style='background:white;padding:32px;border-radius:24px;text-align:center'><h1>Thank you for helping a learner shine!</h1><p>Return to TEMARI NET and verify your transaction.</p></main></body></html>"));

export default router;
