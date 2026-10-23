import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

const captures = fileURLToPath(
  new URL("../../docs/capturas/", import.meta.url),
);

for (const width of [1440, 390]) {
  test(`Modo oscuro persistente, lectura y módulos adaptables: ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const control = page.getByRole("switch", { name: "Modo oscuro" });
    await expect(control).toBeVisible();
    await expect(control).toHaveAttribute("aria-checked", "false");
    await page.screenshot({
      path: `${captures}/tema-claro-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await control.click();
    await expect(control).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(() => localStorage.getItem("enlace-theme")),
    ).toBe("dark");
    for (const name of ["Inicio", "Acortar enlace", "Ver enlaces"]) {
      await page
        .getByRole("navigation")
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      if (name === "Ver enlaces")
        await expect(page.getByTestId("history-initial")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const tooSmall = await page
        .locator("main, header, footer")
        .evaluateAll((roots) =>
          roots
            .flatMap((root) => [...root.querySelectorAll("*")])
            .filter((element) => {
              const style = getComputedStyle(element);
              return (
                element.children.length === 0 &&
                element.textContent.trim() &&
                element.getBoundingClientRect().width > 0 &&
                style.display !== "none" &&
                parseFloat(style.fontSize) < 11
              );
            })
            .map((element) => ({
              text: element.textContent,
              size: getComputedStyle(element).fontSize,
            })),
        );
      expect(tooSmall).toEqual([]);
      const brightSurfaces = await page
        .locator(".form-panel, .history-panel, .icon-button, .button-outline")
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const rgb =
                getComputedStyle(element)
                  .backgroundColor.match(/\d+/g)
                  ?.slice(0, 3)
                  .map(Number) || [];
              return rgb.length === 3 && rgb.every((value) => value > 180);
            })
            .map((element) => element.className),
        );
      expect(brightSurfaces).toEqual([]);
      const slug =
        name === "Inicio"
          ? "inicio"
          : name === "Acortar enlace"
            ? "acortar"
            : "historial";
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `${captures}/tema-oscuro-${slug}-${width}.png`,
        animations: "disabled",
      });
    }
    await page.reload();
    await expect(control).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await control.focus();
    await page.keyboard.press("Space");
    await expect(control).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(control).toHaveAttribute("aria-checked", "false");
  });
}
