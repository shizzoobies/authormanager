import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config, ALLOWED_ORIGINS } from "./config.js";
import { signupRouter } from "./routes/signup.js";
import { confirmRouter } from "./routes/confirm.js";
import { membersRouter } from "./routes/members.js";

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`origin not allowed: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "author-api", time: new Date().toISOString() });
});

app.use(signupRouter);
app.use(confirmRouter);
app.use(membersRouter);

app.listen(config.port, () => {
  console.log(`author-api listening on :${config.port}`);
});
