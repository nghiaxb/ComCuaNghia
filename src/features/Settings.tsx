import ImportPanel from "./Import";
import { useState } from "react";
import type { PageProps } from "./common";
import { Field, Person } from "./common";
export default function Settings({ data, mutate, busy, readOnly }: PageProps) {
  const [cfg, setCfg] = useState(data.settings.data);
  const [name, setName] = useState(data.member.display_name);
  const [hook, setHook] = useState("");
  const [hookName, setHookName] = useState("");
  const admin = data.member.role === "admin";
  const change = (key: string, value: unknown) =>
    setCfg((old) => ({ ...old, [key]: value }));
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">THEO CÁCH CỦA BẠN</p>
          <h1>Cài đặt</h1>
          <p>Điều chỉnh quy trình, thành viên và thông báo ở một nơi.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Thông tin cá nhân</h2>
        <div className="form-row">
          <Field label="Tên hiển thị">
            <input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Email công ty">
            <input value={data.member.email} disabled />
          </Field>
        </div>
        <button
          className="secondary"
          disabled={busy || readOnly}
          onClick={() =>
            void mutate(
              "profile.save",
              { displayName: name },
              data.member.version,
            )
          }
        >
          Lưu hồ sơ
        </button>
      </section>
      {admin && (
        <>
          <ImportPanel
            data={data}
            mutate={mutate}
            busy={busy}
            readOnly={readOnly}
          />
          <section className="panel">
            <h2>Đặt cơm & nhắc lịch</h2>
            <div className="form-row">
              <Field label="Mốc dự kiến hôm trước">
                <input
                  type="time"
                  value={cfg.cutoffTime}
                  onChange={(e) => change("cutoffTime", e.target.value)}
                />
              </Field>
              <Field label="Giờ nhắc hôm trước">
                <input
                  type="time"
                  value={cfg.reminderTime}
                  onChange={(e) => change("reminderTime", e.target.value)}
                />
              </Field>
              <Field label="Giá mặc định (VND)">
                <input
                  type="number"
                  min="0"
                  value={cfg.defaultPrice}
                  onChange={(e) =>
                    change("defaultPrice", Number(e.target.value))
                  }
                />
              </Field>
            </div>
            <p className="notice">
              Không tự khóa sau mốc dự kiến. Cơm thứ Hai chỉ thông báo khi công
              bố menu có chọn Google Chat.
            </p>
            <Field label="Ngày nghỉ (YYYY-MM-DD, phân cách dấu phẩy)">
              <input
                value={cfg.holidays.join(", ")}
                onChange={(e) =>
                  change(
                    "holidays",
                    e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  )
                }
              />
            </Field>
          </section>
          <section className="panel">
            <h2>Thanh toán</h2>
            <div className="form-row">
              <Field label="Người thu tiền">
                <select
                  value={cfg.collectorId ?? ""}
                  onChange={(e) =>
                    change("collectorId", e.target.value || null)
                  }
                >
                  <option value="">Chọn người thu</option>
                  {data.members
                    .filter((m) => m.active)
                    .map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Mã BIN ngân hàng">
                <input
                  value={cfg.bankCode}
                  onChange={(e) => change("bankCode", e.target.value)}
                />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Số tài khoản">
                <input
                  value={cfg.accountNumber}
                  onChange={(e) => change("accountNumber", e.target.value)}
                />
              </Field>
              <Field label="Tên chủ tài khoản">
                <input
                  value={cfg.accountName}
                  onChange={(e) => change("accountName", e.target.value)}
                />
              </Field>
            </div>
          </section>
          <section className="panel">
            <h2>Google Chat</h2>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={cfg.chatEnabled}
                onChange={(e) => change("chatEnabled", e.target.checked)}
              />{" "}
              Bật thông báo hệ thống
            </label>
            <p className="fine">
              Nhật ký luôn được lưu. Tắt Chat không xóa lịch sử.
            </p>
            <button
              className="primary"
              disabled={busy || readOnly}
              onClick={() =>
                void mutate("settings.save", cfg, data.settings.version)
              }
            >
              Lưu cài đặt hệ thống
            </button>
            <hr />
            {data.destinations.map((d) => (
              <div className="order-row" key={d.id}>
                <b>{d.name}</b>
                <span className="tag">{d.active ? "Đang bật" : "Đã tắt"}</span>
                <button
                  className="text-button"
                  disabled={busy || readOnly}
                  onClick={() =>
                    void mutate("destination.save", {
                      id: d.id,
                      name: d.name,
                      active: !d.active,
                    })
                  }
                >
                  {d.active ? "Tắt" : "Bật"}
                </button>
              </div>
            ))}
            <div className="form-row">
              <Field label="Tên nơi nhận">
                <input
                  value={hookName}
                  onChange={(e) => setHookName(e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <Field label="Webhook mới (không hiển thị lại)">
                <input
                  type="password"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <button
              className="secondary"
              disabled={!hook || !hookName || busy || readOnly}
              onClick={async () => {
                const result = await mutate("destination.save", {
                  name: hookName,
                  webhook: hook,
                  active: true,
                });
                if (result) setHook("");
              }}
            >
              Thêm nơi nhận
            </button>
          </section>
          <section className="panel">
            <h2>Thành viên & phân quyền</h2>
            {data.members.map((m) => (
              <div className="order-row" key={m.id}>
                <Person name={m.display_name} />
                <small>{m.email}</small>
                <select
                  aria-label={"Vai trò " + m.display_name}
                  value={m.role}
                  disabled={busy || readOnly}
                  onChange={(e) =>
                    void mutate(
                      "member.update",
                      {
                        id: m.id,
                        role: e.target.value,
                        active: m.active,
                        canManageFinance: m.can_manage_finance,
                      },
                      m.version,
                    )
                  }
                >
                  <option value="employee">Nhân viên</option>
                  <option value="coordinator">Điều phối</option>
                  <option value="admin">Quản trị</option>
                </select>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={m.can_manage_finance}
                    disabled={busy || readOnly}
                    onChange={(e) =>
                      void mutate(
                        "member.update",
                        {
                          id: m.id,
                          role: m.role,
                          active: m.active,
                          canManageFinance: e.target.checked,
                        },
                        m.version,
                      )
                    }
                  />{" "}
                  Tài chính
                </label>
                <button
                  className="text-button"
                  disabled={busy || readOnly}
                  onClick={() =>
                    void mutate(
                      "member.update",
                      {
                        id: m.id,
                        role: m.role,
                        active: !m.active,
                        canManageFinance: m.can_manage_finance,
                      },
                      m.version,
                    )
                  }
                >
                  {m.active ? "Vô hiệu hóa" : "Kích hoạt"}
                </button>
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>OCR menu</h2>
            <p>
              Nhà cung cấp OCR và API key được cấu hình trong Cloudflare
              Workers. Khóa không được gửi về trình duyệt. Khi chưa kết nối OCR,
              bạn vẫn có thể nhập menu thủ công.
            </p>
          </section>
        </>
      )}
    </>
  );
}
