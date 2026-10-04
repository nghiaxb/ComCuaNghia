import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { useDecision } from "../../src/features/useDecision";
import "../../src/app/styles.css";
function Fixture() {
  const [subject, setSubject] = useState(0);
  const [count, setCount] = useState(0);
  const { prompt, dialog } = useDecision(String(subject));
  useEffect(() => {
    const change = () => setSubject((s) => s + 1);
    window.addEventListener("change-subject", change);
    return () => window.removeEventListener("change-subject", change);
  }, []);
  return (
    <>
      {dialog}
      <button
        onClick={() =>
          void prompt("Xác nhận thao tác", async () => {
            setCount((c) => c + 1);
            await new Promise<void>((resolve, reject) => {
              const clean = () => {
                window.removeEventListener("complete-action", success);
                window.removeEventListener("fail-action", fail);
              };
              const success = () => {
                clean();
                resolve();
              };
              const fail = () => {
                clean();
                reject(new Error("Không thể lưu"));
              };
              window.addEventListener("complete-action", success);
              window.addEventListener("fail-action", fail);
            });
          })
        }
      >
        Mở xác nhận
      </button>
      <output aria-label="Số thao tác">{count}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
