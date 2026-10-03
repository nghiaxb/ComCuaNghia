import { useEffect, useRef, useState } from "react";
import { ScanLine, Upload } from "lucide-react";

export default function ImageUpload({
  disabled,
  onImage,
}: {
  disabled: boolean;
  onImage: (file: File) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const depth = useRef(0);
  const receive = async (files: File[]) => {
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
    pending.current = true;
    setError("");
    try {
      await onImage(file);
    } finally {
      pending.current = false;
    }
  };
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
  }, [disabled, onImage]);
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
          Kéo thả ảnh, nhấn Ctrl+V (⌘V trên Mac) hoặc chọn ảnh menu. Kiểm tra
          các món trước khi công bố.
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
          disabled={disabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void receive(files);
          }}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
