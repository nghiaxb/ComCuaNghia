import Button from "../components/ui/Button";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScanLine, Upload } from "lucide-react";

export default function ImageUpload({
  disabled,
  onImage,
}: {
  disabled: boolean;
  onImage: (file: File) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    url: string;
    name: string;
    size: number;
  } | null>(null);
  const previewUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );
  const pending = useRef(false);
  const depth = useRef(0);
  const receive = useCallback(
    (files: File[]) => {
      if (disabled || pending.current) return;
      if (files.length !== 1) {
        setError("Vui lòng chọn một ảnh menu mỗi lần.");
        return;
      }
      const file = files[0];
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      ) {
        setError("Chọn ảnh PNG, JPEG hoặc WebP dưới 10 MB.");
        return;
      }
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      const url = URL.createObjectURL(file);
      previewUrl.current = url;
      setPreview({
        url,
        name: file.name || "Ảnh từ clipboard",
        size: file.size,
      });
      setSelectedFile(file);
      setError("");
    },
    [disabled],
  );
  async function submit() {
    if (!selectedFile || disabled || pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError("");
    try {
      await onImage(selectedFile);
    } catch {
      setError(
        "Chưa xử lý được ảnh menu. Bạn có thể thử chọn hoặc dán lại ảnh.",
      );
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }
  function clear() {
    if (disabled || pending.current) return;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
    setSelectedFile(null);
    setError("");
  }
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const images = Array.from(event.clipboardData?.items ?? [])
        .filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file);
      if (!images.length || disabled || pending.current) return;
      event.preventDefault();
      void receive(images);
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [disabled, receive]);
  return (
    <section role="region" aria-label="Ảnh menu OCR">
      <label
        className={"upload" + (dragging ? " dragging" : "")}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            depth.current++;
            setDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current = Math.max(0, depth.current - 1);
          if (!depth.current) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          void receive(Array.from(event.dataTransfer.files));
        }}
      >
        <ScanLine size={38} />
        <h2>Đưa thực đơn vào đây</h2>
        <p>
          Kéo thả ảnh, nhấn Ctrl+V (⌘V trên Mac) hoặc chọn ảnh menu. Xem lại
          ảnh, rồi bấm Đọc menu bằng OCR để gửi.
        </p>
        <span className="secondary">
          <Upload size={16} />
          Chọn ảnh menu
        </span>
        <input
          aria-label="Chọn ảnh menu"
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || submitting}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void receive(files);
          }}
        />
      </label>
      {preview && (
        <figure className="menu-image-preview">
          <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Xem ảnh menu kích thước đầy đủ"
          >
            <img src={preview.url} alt="Ảnh menu đã chọn" />
          </a>
          <figcaption>
            <span>{preview.name}</span> · {Math.round(preview.size / 1024)} KB
          </figcaption>
        </figure>
      )}
      <div className="form-row">
        <Button
          type="button"
          disabled={disabled || submitting || !selectedFile}
          onClick={() => void submit()}
        >
          {submitting ? "Đang đọc menu…" : "Đọc menu bằng OCR"}
        </Button>
        {selectedFile && (
          <Button
            type="button"
            className="secondary"
            disabled={disabled || submitting}
            onClick={clear}
          >
            Bỏ ảnh đã chọn
          </Button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
