import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../components/ui/command";
export default function RecipientPicker({
  value,
  recipients,
  disabled,
  onChange,
}: {
  value: string;
  recipients: ReadonlyArray<{ id: string; display_name: string }>;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = (m: { id: string; display_name: string }) =>
    m.display_name +
    (recipients.filter((r) => r.display_name === m.display_name).length > 1
      ? " · " + m.id.slice(0, 8)
      : "");
  return (
    <div className="min-w-0">
      <p className="mb-2 text-sm font-medium">Đặt cơm cho</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label="Đặt cơm cho"
            aria-expanded={open}
            disabled={disabled}
            className="min-h-11 w-full justify-between whitespace-normal text-left"
          >
            <span className="min-w-0 break-words">
              {recipients.find((m) => m.id === value)
                ? label(recipients.find((m) => m.id === value)!)
                : "Chọn người nhận"}
            </span>
            <ChevronsUpDown className="shrink-0" size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(24rem,calc(100vw-2rem))] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Tìm đồng nghiệp…" />
            <CommandList>
              <CommandEmpty>Không tìm thấy đồng nghiệp.</CommandEmpty>
              <CommandGroup>
                {recipients.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.id}
                    keywords={[m.display_name]}
                    onSelect={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className="min-h-11 whitespace-normal"
                  >
                    <span className="min-w-0 break-words">{label(m)}</span>
                    {value === m.id && (
                      <Check className="ml-auto shrink-0" size={16} />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
