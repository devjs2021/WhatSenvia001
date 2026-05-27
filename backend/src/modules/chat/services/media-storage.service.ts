import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "../../../config/logger.js";

type MediaType = "image" | "video" | "audio" | "document";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

function getMediaTypeFromMime(mime: string): MediaType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/zip": "zip",
  };
  return map[mime] || mime.split("/")[1] || "bin";
}

class MediaStorageService {
  saveUploadedFile(
    buffer: Buffer,
    originalName: string,
    mimetype: string
  ): { url: string; mediaType: MediaType } {
    const now = new Date();
    const subdir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dir = path.join(UPLOADS_ROOT, subdir);
    fs.mkdirSync(dir, { recursive: true });

    const ext =
      path.extname(originalName).replace(".", "") || getExtFromMime(mimetype);
    const filename = `${randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), buffer);

    return {
      url: `/uploads/${subdir}/${filename}`,
      mediaType: getMediaTypeFromMime(mimetype),
    };
  }

  async downloadMetaMedia(
    mediaId: string,
    accessToken: string,
    mimeType: string
  ): Promise<{ url: string; mediaType: MediaType } | null> {
    // Step 1: get the download URL from Meta
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      logger.error({ status: metaRes.status }, 'Meta media URL fetch failed');
      return null;
    }
    const metaData: any = await metaRes.json();
    const downloadUrl = metaData.url;
    if (!downloadUrl) return null;

    // Step 2: download the binary
    const fileRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) {
      logger.error({ status: fileRes.status }, 'Meta media download failed');
      return null;
    }
    const arrayBuf = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const ext = getExtFromMime(mimeType || "application/octet-stream");
    return this.saveUploadedFile(buffer, `meta-media.${ext}`, mimeType);
  }

  async downloadBaileysMedia(
    msg: any
  ): Promise<{ url: string; mediaType: MediaType } | null> {
    // Dynamic import to avoid issues with Baileys ESM
    const { downloadMediaMessage } = await import("@whiskeysockets/baileys");

    const buffer = await downloadMediaMessage(msg, "buffer", {});
    if (!buffer || buffer.length === 0) return null;

    const message = msg.message;
    let mime = "application/octet-stream";
    let filename = "media";

    if (message.imageMessage) {
      mime = message.imageMessage.mimetype || "image/jpeg";
    } else if (message.videoMessage) {
      mime = message.videoMessage.mimetype || "video/mp4";
    } else if (message.audioMessage) {
      mime = message.audioMessage.mimetype || "audio/ogg";
    } else if (message.documentMessage) {
      mime = message.documentMessage.mimetype || "application/octet-stream";
      filename = message.documentMessage.fileName || "document";
    }

    const ext = getExtFromMime(mime);
    return this.saveUploadedFile(buffer, `${filename}.${ext}`, mime);
  }
}

export const mediaStorageService = new MediaStorageService();
