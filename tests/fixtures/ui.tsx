import { createRoot } from "react-dom/client";
import { useState } from "react";
import Button from "../../src/components/ui/Button";
import Dialog from "../../src/components/ui/Dialog";
import "../../src/app/styles.css";
function Fixture() {
  const [submits, setSubmits] = useState(0),
    [clicks, setClicks] = useState(0),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <main>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmits((n) => n + 1);
        }}
      >
        <Button onClick={() => setClicks((n) => n + 1)}>Thao tác</Button>
        <Button type="submit">Gửi form</Button>
        <Button disabled onClick={() => setClicks((n) => n + 1)}>
          Đã vô hiệu
        </Button>
      </form>
      <Button onClick={() => setOpen(true)}>Mở hộp thoại</Button>
      {open && (
        <Dialog
          title="Hộp thoại dùng chung"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <input aria-label="Nội dung" autoFocus />
          <Button onClick={() => setBusy(!busy)}>
            {busy ? "Đã xử lý" : "Đang xử lý"}
          </Button>
          <Button disabled={busy} onClick={() => setOpen(false)}>
            Đóng
          </Button>
        </Dialog>
      )}
      <output aria-label="Gửi form">{submits}</output>
      <output aria-label="Thao tác">{clicks}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
