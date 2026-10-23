import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const captures = fileURLToPath(
  new URL("../../docs/capturas/", import.meta.url),
);
mkdirSync(captures, { recursive: true });
const clearCache = () =>
  execFileSync(
    "docker",
    ["compose", "exec", "-T", "redis", "redis-cli", "DEL", "enlace:history:v1"],
    { cwd: root, stdio: "pipe" },
  );
const noOverflow = async (page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
const capture = async (page, name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${captures}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
};

test("Inicio de escritorio y navegación entre los tres módulos", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Menos URL/ })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(3);
  await noOverflow(page);
  await capture(page, "inicio-escritorio");
  await page.getByRole("link", { name: "Crear mi primer enlace" }).click();
  await expect(page.getByLabel("¿A dónde quieres llevarnos?")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ver enlaces" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi colección" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Acortar desde React, copiar al portapapeles y abrir el enlace corto", async ({
  page,
}) => {
  const destination = `https://example.com/e2e-${Date.now()}`;
  await page.goto("/#acortar");
  await page.getByLabel("¿A dónde quieres llevarnos?").fill(destination);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/links") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Acortar enlace", exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const link = await response.json();
  expect(link.shortCode).toMatch(/^[A-Za-z0-9]{8,10}$/);
  await expect(page.getByText("Tu enlace está listo")).toBeVisible();
  await page
    .getByRole("button", {
      name: `Copiar enlace: ${link.shortUrl}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: `Copiado: ${link.shortUrl}`,
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    link.shortUrl,
  );
  await capture(page, "acortar-resultado");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: link.shortUrl, exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForURL(destination, { waitUntil: "commit" });
  // Verificamos la redirección real, sin depender del contenido del sitio externo.
  expect(popup.url()).toBe(destination);
  await popup.close();
  await expect(
    page.getByRole("button", {
      name: `Copiar enlace: ${link.shortUrl}`,
      exact: true,
    }),
  ).toBeVisible({ timeout: 5000 });
});

test("Validación de protocolos y presentación de errores del servidor", async ({
  page,
}) => {
  await page.goto("/#acortar");
  await page
    .getByLabel("¿A dónde quieres llevarnos?")
    .fill("ftp://example.com");
  await page
    .getByRole("button", { name: "Acortar enlace", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("HTTP o HTTPS");
  // Inyección de un fallo únicamente para comprobar la experiencia de error.
  await page.route("**/api/links", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/problem+json",
      body: JSON.stringify({ detail: "Servicio temporalmente no disponible." }),
    }),
  );
  await page
    .getByLabel("¿A dónde quieres llevarnos?")
    .fill("https://example.com");
  await page
    .getByRole("button", { name: "Acortar enlace", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Servicio temporalmente no disponible.",
  );
  await expect(
    page.getByRole("button", { name: "Acortar enlace", exact: true }),
  ).toBeEnabled();
});

test("Historial: primera visita permanente y siguientes consultas con TTL", async ({
  page,
}) => {
  clearCache();
  await page.goto("/#enlaces");
  await expect(page.getByTestId("cache-status")).toContainText(
    "Datos consultados en MongoDB",
  );
  await expect(page.getByTestId("history-initial")).toBeVisible();
  await expect(page.getByTestId("ttl")).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ver enlaces", exact: true })
    .click();
  await expect(page.getByTestId("history-initial")).toHaveCount(0);
  await expect(page.getByTestId("cache-status")).toContainText(
    "Datos almacenados en Redis",
  );
  await expect(page.getByTestId("ttl")).toBeVisible();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByTestId("cache-status")).toContainText(
    "Datos obtenidos desde Redis",
  );
  const first = parseInt(await page.getByTestId("ttl").innerText());
  expect(first).toBeGreaterThan(0);
  expect(first).toBeLessThanOrEqual(30);
  await expect
    .poll(async () => parseInt(await page.getByTestId("ttl").innerText()))
    .toBeLessThan(first - 1);
  const before = parseInt(await page.getByTestId("ttl").innerText());
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByTestId("cache-status")).toContainText(
    "Datos obtenidos desde Redis",
  );
  expect(
    parseInt(await page.getByTestId("ttl").innerText()),
  ).toBeLessThanOrEqual(before);
  await capture(page, "historial-redis");
  const expandedHeight = await page
    .locator(".history-panel")
    .evaluate((element) => element.getBoundingClientRect().height);
  await expect(page.getByTestId("history-expired")).toContainText(
    "Caché expirado",
    {
      timeout: 35000,
    },
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.locator(".short-table-link")).toHaveCount(0);
  const compactHeight = await page
    .locator(".history-panel")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(compactHeight).toBeLessThan(expandedHeight);
  expect(compactHeight).toBeLessThan(600);
  await expect
    .poll(() =>
      Number(
        execFileSync(
          "docker",
          [
            "compose",
            "exec",
            "-T",
            "redis",
            "redis-cli",
            "PTTL",
            "enlace:history:v1",
          ],
          { cwd: root, encoding: "utf8" },
        ).trim(),
      ),
    )
    .toBe(-2);
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByTestId("cache-status")).toContainText(
    "Datos almacenados en Redis",
  );
  await expect(page.getByTestId("ttl")).toBeVisible();
});

test("Historial: copia, apertura de URL original, búsqueda e invalidación al crear", async ({
  page,
  context,
}) => {
  const destination = `https://example.com/e2e-history-${Date.now()}`;
  const response = await page.request.post("/api/links", {
    data: { originalUrl: destination },
  });
  const link = await response.json();
  await page.goto("/#enlaces");
  await expect(page.getByTestId("cache-status")).toContainText(
    "Datos consultados en MongoDB",
  );
  const row = page.getByRole("row").filter({ hasText: destination });
  await expect(row).toBeVisible();
  await row
    .getByRole("button", {
      name: `Copiar enlace: ${link.shortUrl}`,
      exact: true,
    })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    link.shortUrl,
  );
  await expect(row.getByText("Enlace copiado.")).toBeVisible();
  await context.route("https://example.com/e2e-history-*", (route) =>
    route.fulfill({
      body: "<title>Original</title>URL original",
      contentType: "text/html",
    }),
  );
  const popupPromise = page.waitForEvent("popup");
  await row
    .getByRole("link", {
      name: `Abrir URL original: ${destination}`,
      exact: true,
    })
    .click();
  const popup = await popupPromise;
  await popup.waitForURL(destination);
  await popup.close();
  await page.getByLabel("Buscar en mis enlaces").fill("no-existe-este-enlace");
  await expect(
    page.getByText("No hay enlaces que coincidan con tu búsqueda."),
  ).toBeVisible();
  await page.getByLabel("Buscar en mis enlaces").fill("");
  await expect(row.getByText("Enlace copiado.")).toHaveCount(0, {
    timeout: 5000,
  });
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ver enlaces", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Historial de enlaces" }),
  ).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByTestId("cache-status")).toContainText("Redis");
  await page.getByRole("link", { name: "Nuevo enlace", exact: true }).click();
  await page
    .getByLabel("¿A dónde quieres llevarnos?")
    .fill("https://example.com/e2e-invalidation");
  await page
    .getByRole("button", { name: "Acortar enlace", exact: true })
    .click();
  await expect(page.getByText("Tu enlace está listo")).toBeVisible();
  await page
    .getByRole("link", { name: "Ver mis enlaces", exact: true })
    .click();
  await expect(page.getByTestId("cache-status")).toContainText(
    "Datos almacenados en Redis",
  );
  await expect(
    page
      .getByRole("cell")
      .filter({ hasText: "https://example.com/e2e-invalidation" })
      .first(),
  ).toBeVisible();
});

test("Diseño móvil: los tres módulos y tabla con desplazamiento interno", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Menos URL/ })).toBeVisible();
  await noOverflow(page);
  await capture(page, "inicio-movil");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Acortar enlace", exact: true })
    .click();
  await expect(page.getByLabel("¿A dónde quieres llevarnos?")).toBeVisible();
  await noOverflow(page);
  await capture(page, "acortar-movil");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ver enlaces", exact: true })
    .click();
  await expect(page.getByRole("table")).toBeVisible();
  await noOverflow(page);
  expect(
    await page
      .locator(".table-scroll")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBe(true);
  await capture(page, "historial-movil");
});
