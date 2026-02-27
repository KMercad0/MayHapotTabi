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
      let message = err instanceof Error ? err.message : "Upload error";
      if (message === "File too large") message = "File size must be under 10MB";
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
      res.status(500).json({ error: "File storage failed, try again" });
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

      // 3. Extract text and check for scanned PDF
      const text = await extractTextFromPdf(buffer);
      if (text.trim().length < 50) {
        await supabase.storage.from("uploads").remove([storagePath]);
        res.status(400).json({
          error:
            "This PDF appears to be scanned or image-only. Text extraction is not supported yet.",
        });
        return;
      }

      const chunks = chunkText(text);

      // 4. Generate embeddings and persist chunks
      try {
        await storeChunks(chunks, documentId, userId, supabase);
      } catch {
        throw Object.assign(new Error("Embedding service unavailable, try again"), {
          isEmbeddingError: true,
        });
      }

      res.status(201).json({
        documentId,
        name: originalname,
        chunkCount: chunks.length,
      });
    } catch (err) {
      // Rollback: remove the orphaned file from storage
      await supabase.storage.from("uploads").remove([storagePath]);
      const isEmbedding = (err as { isEmbeddingError?: boolean }).isEmbeddingError;
      if (isEmbedding) {
        res.status(500).json({ error: "Embedding service unavailable, try again" });
      } else {
        console.error("Upload pipeline error:", err);
        res.status(500).json({ error: "Failed to process document" });
      }
    }
  }
);

export const deleteRouter = Router();

deleteRouter.delete(
  "/:documentId",
  async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const userId = req.user!.id;

    // Verify document belongs to this user
    const { data: doc } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    try {
      // 1. Delete all chunks
      const { error: chunksError } = await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId);
      if (chunksError) throw chunksError;

      // 2. Delete file from storage
      const { error: storageError } = await supabase.storage
        .from("uploads")
        .remove([doc.storage_path as string]);
      if (storageError) throw storageError;

      // 3. Delete document row
      const { error: docError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);
      if (docError) throw docError;

      res.json({ success: true });
    } catch (err) {
      console.error("Delete document error:", err);
      res.status(500).json({ error: "Failed to delete document" });
    }
  }
);

export default router;
