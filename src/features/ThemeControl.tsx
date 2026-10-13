import { useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import Button from "../components/ui/ActionButton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../components/ui/popover";
import { NativeSelect } from "../components/ui/native-select";
import { useTheme, type ThemePreference } from "../lib/theme";
import { Field } from "./common";

const choices = [
  { value: "system", label: "Theo thiết bị", Icon: Monitor },
  { value: "light", label: "Sáng", Icon: Sun },
  { value: "dark", label: "Tối", Icon: Moon },
] as const;

export function ThemeSwitcher() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const Icon =
    theme.preference === "system"
      ? Monitor
      : theme.resolved === "dark"
        ? Moon
        : Sun;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          aria-label="Đổi giao diện"
          title="Đổi giao diện"
          className="min-h-11 min-w-11 px-2"
        >
          <Icon size={18} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Chọn giao diện"
        className="w-52 p-2"
      >
        <p className="px-2 pb-2 pt-1 text-xs font-semibold text-muted-foreground">
          Giao diện
        </p>
        {choices.map(({ value, label, Icon: ChoiceIcon }) => (
          <Button
            key={value}
            variant="text"
            className="w-full justify-start"
            aria-pressed={theme.preference === value}
            onClick={() => {
              theme.setPreference(value);
              setOpen(false);
            }}
          >
            <ChoiceIcon size={16} aria-hidden="true" />
            {label}
            {theme.preference === value && (
              <Check size={16} className="ml-auto" aria-hidden="true" />
            )}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function ThemePreferenceField() {
  const theme = useTheme();
  return (
    <div className="mt-5 border-t pt-2">
      <Field label="Giao diện">
        <NativeSelect
          aria-label="Giao diện"
          value={theme.preference}
          onChange={(e) =>
            theme.setPreference(e.target.value as ThemePreference)
          }
        >
          {choices.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <p className="fine">
        Áp dụng ngay trên trình duyệt này. Theo thiết bị sẽ tự đổi sáng/tối cùng
        máy.
      </p>
    </div>
  );
}
