import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const clearCache = () =>
  execFileSync(
    "docker",
    ["compose", "exec", "-T", "redis", "redis-cli", "DEL", "enlace:history:v1"],
    { cwd: root, stdio: "pipe" },
  );

const geometry = (page) =>
  page.evaluate(() => {
    const rect = (selector) => {
      const { x, y, width, height } = document
        .querySelector(selector)
        .getBoundingClientRect();
      return { x, y, width, height };
    };
    return {
      scroll: scrollY,
      documentHeight: document.documentElement.scrollHeight,
      navigation: rect("nav"),
      ...(document.querySelector(".history-panel") && {
        panel: rect(".history-panel"),
        table: rect("table"),
        button: rect(".history-controls button"),
        source: rect(".source-bar"),
      }),
    };
  });

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Navegación sin desplazamiento de la cabecera: ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const initial = (await geometry(page)).navigation;
    for (const name of ["Acortar enlace", "Ver enlaces", "Inicio"]) {
      await page
        .getByRole("navigation")
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page.locator("main")).toBeFocused();
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      const current = (await geometry(page)).navigation;
      expect(current).toEqual(initial);
    }
  });

  test(`Actualizar conserva tabla, scroll y dimensiones: ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    // Garantizar un historial con scroll incluso en una instalación nueva.
    const history = await page.request.get("/api/links");
    const { links } = await history.json();
    for (let i = links.length; i < 16; i++) {
      const response = await page.request.post("/api/links", {
        data: { originalUrl: `https://example.com/layout-stability/${i}` },
      });
      expect(response.status()).toBe(201);
    }
    clearCache();
    await page.goto("/#enlaces");
    await expect(page.getByTestId("cache-status")).toContainText("MongoDB");
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Inicio", exact: true })
      .click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Ver enlaces", exact: true })
      .click();
    await expect(page.getByTestId("ttl")).toBeVisible();
    await page.getByLabel("Buscar en mis enlaces").fill("example.com");
    await page.evaluate(() => scrollTo(0, 200));
    const before = await geometry(page);
    expect(before.scroll).toBe(200);
    const count = await page.getByRole("row").count();
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    // Retrasar la respuesta real permite observar el estado intermedio.
    await page.route("**/api/links", async (route) => {
      await pending;
      await route.continue();
    });
    try {
      await page
        .getByRole("button", { name: "Actualizar", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Historial de enlaces" }),
      ).toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("table")).toBeVisible();
      expect(await page.getByRole("row").count()).toBe(count);
      expect(await geometry(page)).toEqual(before);
    } finally {
      release();
    }
    await expect(
      page.getByRole("region", { name: "Historial de enlaces" }),
    ).toHaveAttribute("aria-busy", "false");
    await expect(page.getByTestId("cache-status")).toContainText("Redis");
    await expect(page.getByLabel("Buscar en mis enlaces")).toHaveValue(
      "example.com",
    );
    expect(await geometry(page)).toEqual(before);
  });
}
