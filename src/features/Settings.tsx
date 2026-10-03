import { Switch } from "../components/ui/switch";
import { NativeSelect } from "../components/ui/native-select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import Button from "../components/ui/ActionButton";
import ImportPanel from "./Import";
import { useState } from "react";
import type { PageProps } from "./common";
import { Field, Person } from "./common";
export default function Settings({ data, mutate, busy, readOnly }: PageProps) {
  const [cfg, setCfg] = useState(data.settings.data);
  const [name, setName] = useState(data.member.display_name);
  const [saveMode, setSaveMode] = useState(
    data.member.order_save_mode ?? "autosave",
  );
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
      <Tabs defaultValue="personal">
        <TabsList className="mb-5 flex h-auto w-full flex-wrap justify-start gap-1 bg-secondary p-1">
          <TabsTrigger value="personal" className="min-h-11">
            Cá nhân
          </TabsTrigger>
          {admin && (
            <>
              <TabsTrigger value="operation" className="min-h-11">
                Vận hành
              </TabsTrigger>
              <TabsTrigger value="chat" className="min-h-11">
                Google Chat
              </TabsTrigger>
              <TabsTrigger value="members" className="min-h-11">
                Thành viên
              </TabsTrigger>
              <TabsTrigger value="import" className="min-h-11">
                Import
              </TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="personal">
          {" "}
          <section className="panel">
            <h2>Thông tin cá nhân</h2>
            <div className="form-row">
              <Field label="Tên hiển thị">
                <Input
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Email công ty">
                <Input value={data.member.email} disabled />
              </Field>
            </div>
            <Field label="Cách lưu đơn">
              <NativeSelect
                value={saveMode}
                onChange={(e) => setSaveMode(e.target.value as typeof saveMode)}
              >
                <option value="autosave">Tự lưu khi thay đổi</option>
                <option value="manual">Bấm gửi để lưu</option>
              </NativeSelect>
            </Field>
            <Button
              className="secondary"
              disabled={busy || readOnly}
              onClick={() =>
                void mutate(
                  "profile.save",
                  { displayName: name, orderSaveMode: saveMode },
                  data.member.version,
                )
              }
            >
              Lưu hồ sơ
            </Button>
          </section>
        </TabsContent>
        {admin && (
          <>
            <TabsContent value="operation">
              {" "}
              <section className="panel">
                <h2>Đặt cơm & nhắc lịch</h2>
                <div className="form-row">
                  <Field label="Mốc dự kiến hôm trước">
                    <Input
                      type="time"
                      value={cfg.cutoffTime}
                      onChange={(e) => change("cutoffTime", e.target.value)}
                    />
                  </Field>
                  <Field label="Giờ nhắc hôm trước">
                    <Input
                      type="time"
                      value={cfg.reminderTime}
                      onChange={(e) => change("reminderTime", e.target.value)}
                    />
                  </Field>
                  <Field label="Giá mặc định (VND)">
                    <Input
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
                  Không tự khóa sau mốc dự kiến. Cơm thứ Hai chỉ thông báo khi
                  công bố menu có chọn Google Chat.
                </p>
                <Field label="Ngày nghỉ (YYYY-MM-DD, phân cách dấu phẩy)">
                  <Input
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
                    <NativeSelect
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
                    </NativeSelect>
                  </Field>
                  <Field label="Mã BIN ngân hàng">
                    <Input
                      value={cfg.bankCode}
                      onChange={(e) => change("bankCode", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="form-row">
                  <Field label="Số tài khoản">
                    <Input
                      value={cfg.accountNumber}
                      onChange={(e) => change("accountNumber", e.target.value)}
                    />
                  </Field>
                  <Field label="Tên chủ tài khoản">
                    <Input
                      value={cfg.accountName}
                      onChange={(e) => change("accountName", e.target.value)}
                    />
                  </Field>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="chat">
              {" "}
              <section className="panel">
                <h2>Google Chat</h2>
                <label className="checkbox">
                  <Switch
                    checked={cfg.chatEnabled}
                    onCheckedChange={(checked) =>
                      change("chatEnabled", checked)
                    }
                  />{" "}
                  Bật thông báo hệ thống
                </label>
                <p className="fine">
                  Nhật ký luôn được lưu. Tắt Chat không xóa lịch sử.
                </p>

                <hr />
                {data.destinations.map((d) => (
                  <div className="order-row" key={d.id}>
                    <b>{d.name}</b>
                    <span className="tag">
                      {d.active ? "Đang bật" : "Đã tắt"}
                    </span>
                    <Button
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
                    </Button>
                  </div>
                ))}
                <div className="form-row">
                  <Field label="Tên nơi nhận">
                    <Input
                      value={hookName}
                      onChange={(e) => setHookName(e.target.value)}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Webhook mới (không hiển thị lại)">
                    <Input
                      type="password"
                      value={hook}
                      onChange={(e) => setHook(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
                <Button
                  className="secondary"
                  disabled={!hook || !hookName || busy || readOnly}
                  onClick={() => {
                    void (async () => {
                      const result = await mutate("destination.save", {
                        name: hookName,
                        webhook: hook,
                        active: true,
                      });
                      if (result) setHook("");
                    })();
                  }}
                >
                  Thêm nơi nhận
                </Button>
              </section>
            </TabsContent>
            <TabsContent value="members">
              {" "}
              <section className="panel">
                <h2>Thành viên & phân quyền</h2>
                {data.members.map((m) => (
                  <div className="order-row" key={m.id}>
                    <Person name={m.display_name} />
                    <small>{m.email}</small>
                    <NativeSelect
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
                    </NativeSelect>
                    <label className="checkbox">
                      <Input
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
                    <Button
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
                    </Button>
                  </div>
                ))}
              </section>
            </TabsContent>
            <TabsContent value="import">
              {" "}
              <ImportPanel
                data={data}
                mutate={mutate}
                busy={busy}
                readOnly={readOnly}
              />
              <section className="panel">
                <h2>OCR menu</h2>
                <p>
                  Nhà cung cấp OCR và API key được cấu hình trong Cloudflare
                  Workers. Khóa không được gửi về trình duyệt. Khi chưa kết nối
                  OCR, bạn vẫn có thể nhập menu thủ công.
                </p>
              </section>
            </TabsContent>
            <div className="my-4">
              {" "}
              <Button
                className="primary"
                disabled={busy || readOnly}
                onClick={() =>
                  void mutate("settings.save", cfg, data.settings.version)
                }
              >
                Lưu cài đặt hệ thống
              </Button>
            </div>
          </>
        )}
      </Tabs>
    </>
  );
}
