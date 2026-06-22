import { createApp } from "../src/app.js";

// An Express app is a valid (req, res) handler — Vercel invokes it directly.
// The vercel.json rewrite routes every path to this serverless function.
export default createApp();
