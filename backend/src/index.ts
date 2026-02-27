import "dotenv/config";
import express from "express";
import cors from "cors";
import "./types/index";
import uploadRouter from "./routes/upload";
import chatRouter from "./routes/chat";
import { verifyAuth } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT ?? 3000;

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL ?? ""]
    : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.use("/upload", verifyAuth, uploadRouter);
app.use("/chat", verifyAuth, chatRouter);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`MayHapotTabi backend running on port ${PORT}`);
});
