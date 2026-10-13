import { test, expect } from "@playwright/test";

test("native select options keep opaque contrasting colors in both themes", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/fixtures/autosave.html?settings&admin");
    for (const theme of ["dark", "light"]) {
      await page.emulateMedia({
        colorScheme: theme === "dark" ? "light" : "dark",
      });
      await page.getByLabel("Giao diện", { exact: true }).selectOption(theme);
      const options = await page
        .locator("select option")
        .evaluateAll((elements) => {
          const rgb = (color: string) => color.match(/[\d.]+/g)!.map(Number);
          const luminance = (values: number[]) =>
            values.slice(0, 3).reduce((sum, value, i) => {
              const channel = value / 255;
              return (
                sum +
                (channel <= 0.04045
                  ? channel / 12.92
                  : ((channel + 0.055) / 1.055) ** 2.4) *
                  [0.2126, 0.7152, 0.0722][i]
              );
            }, 0);
          return elements.map((option) => {
            const style = getComputedStyle(option);
            const background = rgb(style.backgroundColor);
            const foreground = rgb(style.color);
            const a = luminance(background),
              b = luminance(foreground);
            return {
              text: option.textContent,
              alpha: background[3] ?? 1,
              contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
            };
          });
        });
      expect(options.length).toBeGreaterThanOrEqual(5);
      for (const option of options) {
        expect(
          option.alpha,
          `${theme}: ${option.text} needs an opaque popup background`,
        ).toBe(1);
        expect(
          option.contrast,
          `${theme}: ${option.text}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    }
    const theme = page.getByLabel("Giao diện", { exact: true });
    await theme.focus();
    await page.keyboard.press("End");
    await expect(theme).toHaveValue("dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByLabel("Yêu cầu")).toBeEmpty();
  }
});
