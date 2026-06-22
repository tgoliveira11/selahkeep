"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AttachmentMetadataPlaintext } from "@/lib/crypto-client/note-attachments";
import {
  attachmentPreviewKind,
  decodeAttachmentText,
  truncateTextPreview,
  type AttachmentPreviewKind,
} from "@/lib/notes/attachment-preview";

type DecryptedLoader = () => Promise<{ metadata: AttachmentMetadataPlaintext; bytes: Uint8Array }>;

interface AttachmentPreviewProps {
  metadata: AttachmentMetadataPlaintext;
  /** When set (e.g. pending upload), preview from local file without decrypting from server. */
  localFile?: File | null;
  loadDecrypted?: DecryptedLoader;
  collapsed?: boolean;
}

function PreviewFrame({
  kind,
  children,
}: {
  kind: AttachmentPreviewKind;
  children: ReactNode;
}) {
  return (
    <div
      className="mt-2 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)]"
      data-testid="attachment-preview"
      data-preview-kind={kind}
    >
      {children}
    </div>
  );
}

export function AttachmentPreview({
  metadata,
  localFile,
  loadDecrypted,
  collapsed = false,
}: AttachmentPreviewProps) {
  const kind = attachmentPreviewKind(metadata.mimeType, metadata.filename);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const blobUrlRef = useRef<string | null>(null);

  // Revoke blob URLs only on real unmount (not Strict Mode effect re-runs).
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (kind === "none" || collapsed) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
      setTextPreview(null);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setBlobUrl(null);
    setTextPreview(null);

    let cancelled = false;

    async function load() {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      try {
        let bytes: Uint8Array;
        let mime = metadata.mimeType || "application/octet-stream";

        if (localFile) {
          bytes = new Uint8Array(await localFile.arrayBuffer());
          mime = localFile.type || mime;
        } else if (loadDecrypted) {
          const decrypted = await loadDecrypted();
          bytes = decrypted.bytes;
          mime = decrypted.metadata.mimeType || mime;
        } else {
          setStatus("error");
          return;
        }

        if (cancelled) return;

        if (kind === "text") {
          setTextPreview(truncateTextPreview(decodeAttachmentText(bytes)));
          setStatus("ready");
          return;
        }

        const blob = new Blob([new Uint8Array(bytes)], { type: mime });
        const objectUrl = URL.createObjectURL(blob);
        blobUrlRef.current = objectUrl;
        setBlobUrl(objectUrl);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [collapsed, kind, localFile, loadDecrypted, metadata.filename, metadata.mimeType]);

  if (kind === "none" || collapsed) {
    return null;
  }

  if (status === "loading" || status === "idle") {
    return (
      <p className="mt-2 text-xs text-[var(--muted)]" data-testid="attachment-preview-loading">
        Loading preview…
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="mt-2 text-xs text-[var(--muted)]" data-testid="attachment-preview-error">
        Preview unavailable. Download the file to open it.
      </p>
    );
  }

  if (kind === "text" && textPreview !== null) {
    return (
      <PreviewFrame kind={kind}>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]">
          {textPreview}
        </pre>
      </PreviewFrame>
    );
  }

  if (!blobUrl) return null;

  if (kind === "image") {
    return (
      <PreviewFrame kind={kind}>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from client decrypt */}
        <img
          src={blobUrl}
          alt={`Preview of ${metadata.filename}`}
          className="max-h-64 w-full object-contain"
          data-testid="attachment-preview-image"
        />
      </PreviewFrame>
    );
  }

  if (kind === "pdf") {
    return (
      <PreviewFrame kind={kind}>
        <iframe
          title={`PDF preview: ${metadata.filename}`}
          src={blobUrl}
          className="h-80 w-full border-0 bg-white"
          data-testid="attachment-preview-pdf"
        />
      </PreviewFrame>
    );
  }

  if (kind === "audio") {
    return (
      <PreviewFrame kind={kind}>
        <audio controls src={blobUrl} className="w-full p-2" data-testid="attachment-preview-audio">
          <track kind="captions" />
        </audio>
      </PreviewFrame>
    );
  }

  if (kind === "video") {
    return (
      <PreviewFrame kind={kind}>
        <video
          controls
          src={blobUrl}
          className="max-h-64 w-full"
          data-testid="attachment-preview-video"
        >
          <track kind="captions" />
        </video>
      </PreviewFrame>
    );
  }

  return null;
}
