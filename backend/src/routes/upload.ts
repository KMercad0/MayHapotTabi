import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase";
import { extractTextFromPdf, chunkText } from "../services/pdf";
import { storeChunks } from "../services/embeddings";
import { DocumentRow } from "../types";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

const router = Router();

// Wrap multer so errors return JSON instead of Express's default HTML response
function handleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload error";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

router.post(
  "/",
  handleUpload,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // req.user is guaranteed by verifyAuth, mounted in index.ts
    const { id: userId } = req.user!;
    const { buffer, originalname } = req.file;
    const documentId = randomUUID();
    const storagePath = `${userId}/${documentId}.pdf`;

    // 1. Upload file to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      res.status(500).json({ error: "Failed to upload file to storage" });
      return;
    }

    // Everything after this point must clean up storage on failure
    try {
      // 2. Insert document row
      const docRow: DocumentRow = {
        id: documentId,
        user_id: userId,
        name: originalname,
        storage_path: storagePath,
      };

      const { error: dbError } = await supabase
        .from("documents")
        .insert(docRow);

      if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

      // 3. Extract text and split into chunks
      const text = await extractTextFromPdf(buffer);
      const chunks = chunkText(text);

      // 4. Generate embeddings and persist chunks
      await storeChunks(chunks, documentId, userId, supabase);

      res.status(201).json({
        documentId,
        name: originalname,
        chunkCount: chunks.length,
      });
    } catch (err) {
      // Rollback: remove the orphaned file from storage
      await supabase.storage.from("uploads").remove([storagePath]);
      console.error("Upload pipeline error:", err);
      res.status(500).json({ error: "Failed to process document" });
    }
  }
);

export default router;
