import Button from "../components/ui/Button";
import { useState } from "react";
import type { PageProps } from "./common";
type Report = {
  canApply: boolean;
  errors: string[];
  totals: Record<string, number>;
  payload: Record<string, unknown>;
};
export default function ImportPanel({
  data,
  mutate,
  busy,
  readOnly,
}: PageProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [legacyName, setLegacyName] = useState("");
  const [email, setEmail] = useState("");
  function downloadMapping() {
    const content = Object.fromEntries(
      data.members.map((m) => [m.display_name, m.id]),
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "member-mapping.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="panel">
      <h2>Chuyển dữ liệu từ Sheet</h2>
      <p className="muted">
        Tạo hồ sơ và xuất ánh xạ, chạy công cụ đối chiếu trong repo, sau đó tải
        báo cáo JSON đã kiểm tra để nhập. Số dư đầu kỳ đã bao gồm lịch sử trước
        ngày chuyển đổi.
      </p>
      <div className="form-row">
        <input
          aria-label="Tên thành viên cũ"
          placeholder="Tên thành viên cũ"
          value={legacyName}
          onChange={(e) => setLegacyName(e.target.value)}
        />
        <input
          aria-label="Email được xác nhận"
          placeholder="Email công ty đã xác nhận (có thể để trống)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          className="secondary"
          disabled={readOnly || busy || !legacyName}
          onClick={() =>
            void mutate("member.legacy", { displayName: legacyName, email })
          }
        >
          Tạo hồ sơ cũ
        </Button>
      </div>
      <Button className="text-button" onClick={downloadMapping}>
        Tải danh sách ánh xạ thành viên
      </Button>
      <p className="fine">
        Không tự đoán email từ tên. Hồ sơ chỉ liên kết đăng nhập khi email công
        ty đã được xác minh khớp chính xác.
      </p>
      <input
        aria-label="Báo cáo import JSON"
        type="file"
        accept="application/json"
        disabled={readOnly}
        onChange={(e) => {
          void (async () => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2 * 1024 * 1024) throw Error("Báo cáo quá lớn");
              const r = JSON.parse(await f.text());
              if (!Array.isArray(r.errors) || !r.payload?.batchId)
                throw Error("Sai định dạng báo cáo");
              setReport(r);
              setReviewed(false);
              setError("");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Không đọc được báo cáo",
              );
            }
          })();
        }}
      />
      {error && <p className="error">{error}</p>}
      {report && (
        <>
          <pre>{JSON.stringify(report.totals, null, 2)}</pre>
          {report.errors.map((e, i) => (
            <p className="error" key={i}>
              {e}
            </p>
          ))}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />{" "}
            Tôi đã đối chiếu tổng tiền, người thu và số dư đầu kỳ.
          </label>
          <Button
            className="primary"
            disabled={
              busy ||
              readOnly ||
              !reviewed ||
              !report.canApply ||
              report.errors.length > 0
            }
            onClick={() =>
              void mutate("import.apply", {
                ...report.payload,
                reconciled: true,
              })
            }
          >
            Nhập dữ liệu đã đối chiếu
          </Button>
          <p className="fine">
            Mã lô: {String(report.payload.batchId)}. Giữ mã này để đối chiếu
            hoặc hoàn tác trước khi có phát sinh tiếp.
          </p>
        </>
      )}
    </section>
  );
}
