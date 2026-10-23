import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const redis = (...args) =>
  execFileSync(
    "docker",
    ["compose", "exec", "-T", "redis", "redis-cli", ...args],
    { cwd: root, encoding: "utf8" },
  ).trim();
const isHistory = (response) =>
  new URL(response.url()).pathname === "/api/links";
const nav = (page, name) =>
  page.getByRole("navigation").getByRole("link", { name, exact: true });

async function assertDirectResponse(response) {
  const data = await response.json();
  expect(data.cacheStatus).toBe("BYPASS");
  expect(data.remainingTtlMillis).toBe(0);
  expect(new URL(response.url()).searchParams.get("source")).toBe("mongo");
}

test("Primera visita Mongo sin caducidad; Redis solo al salir y volver", async ({
  page,
}) => {
  const stored = await page.request.post("/api/links", {
    data: { originalUrl: `https://example.com/first-visit-${Date.now()}` },
  });
  expect(stored.status()).toBe(201);
  // Un caché previo no debe alterar la fuente de la primera entrada.
  await page.request.get("/api/links");
  const cachedValue = redis("GET", "enlace:history:v1");
  let requests = 0;
  page.on("request", (request) => {
    if (request.method() === "GET" && isHistory(request)) requests++;
  });
  const firstResponse = page.waitForResponse(isHistory);
  await page.goto("/#enlaces");
  await assertDirectResponse(await firstResponse);
  await expect(page.getByTestId("history-initial")).toBeVisible();
  await expect(page.getByTestId("ttl")).toHaveCount(0);
  await expect(page.getByRole("table")).toBeVisible();
  expect(redis("GET", "enlace:history:v1")).toBe(cachedValue);
  const shownAt = Date.now();
  await expect
    .poll(() => Date.now() - shownAt, { timeout: 35000, intervals: [1000] })
    .toBeGreaterThanOrEqual(31000);
  expect(redis("PTTL", "enlace:history:v1")).toBe("-2");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByTestId("history-expired")).toHaveCount(0);
  expect(requests).toBe(1);
  const updated = page.waitForResponse(isHistory);
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await assertDirectResponse(await updated);
  await expect(
    page.getByRole("region", { name: "Historial de enlaces" }),
  ).toHaveAttribute("aria-busy", "false");
  await expect(page.getByTestId("ttl")).toHaveCount(0);
  const sameModule = page.waitForResponse(isHistory);
  await nav(page, "Ver enlaces").click();
  await assertDirectResponse(await sameModule);
  await expect(page.getByTestId("history-initial")).toBeVisible();
  expect(requests).toBe(3);
  await nav(page, "Inicio").click();
  const returned = page.waitForResponse(isHistory);
  await nav(page, "Ver enlaces").click();
  const afterReturn = await (await returned).json();
  expect(afterReturn.cacheStatus).toBe("MISS");
  expect(afterReturn.remainingTtlMillis).toBeGreaterThan(0);
  await expect(page.getByTestId("history-initial")).toHaveCount(0);
  await expect(page.getByTestId("ttl")).toBeVisible();
  const ttlBefore = Number(redis("PTTL", "enlace:history:v1"));
  const hit = page.waitForResponse(isHistory);
  await nav(page, "Ver enlaces").click();
  expect((await (await hit).json()).cacheStatus).toBe("HIT");
  expect(Number(redis("PTTL", "enlace:history:v1"))).toBeLessThan(ttlBefore);
  await expect(page.getByTestId("ttl")).toBeVisible();
  // Una recarga inicia una nueva sesión de navegación, pero no borra Mongo ni Redis.
  const reloaded = page.waitForResponse(isHistory);
  await page.reload();
  await assertDirectResponse(await reloaded);
  await expect(page.getByTestId("history-initial")).toBeVisible();
  await expect(page.getByTestId("ttl")).toHaveCount(0);
});
