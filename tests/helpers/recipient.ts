import type { Page } from "@playwright/test";
export async function chooseRecipient(page: Page, id: string) {
  const picker = page.getByRole("combobox", { name: "Đặt cơm cho" });
  await picker.click();
  const names: Record<string, string> = {
    friend: "Lan",
    colleague: "Đồng nghiệp",
  };
  const option = names[id]
    ? page.getByRole("option", { name: names[id], exact: true })
    : page.getByRole("listbox").getByRole("option").first();
  await option.click();
}
