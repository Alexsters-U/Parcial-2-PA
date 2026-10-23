// Integración real: requiere Docker Compose iniciado. No sustituye MongoDB ni Redis.
// Crea registros de prueba y vacía únicamente la clave de caché de esta aplicación.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const base = process.env.API_URL || "http://localhost:8085";
const key = "enlace:history:v1";
let checks = 0;
const ok = (name) => {
  checks++;
  console.log(`OK ${checks}: ${name}`);
};
const docker = (...args) =>
  execFileSync("docker", ["compose", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const redis = (...args) =>
  docker("exec", "-T", "redis", "redis-cli", "--raw", ...args);
const create = (url) =>
  fetch(`${base}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalUrl: url }),
  });
const history = () =>
  fetch(`${base}/api/links`).then((r) => {
    assert.equal(r.status, 200);
    return r.json();
  });

try {
  assert.equal(
    (await fetch(`${base}/actuator/health`).then((r) => r.json())).status,
    "UP",
  );
  ok("Salud de Spring Boot, MongoDB y Redis");
  for (const url of [
    "",
    "   ",
    "ftp://example.com",
    "javascript:alert(1)",
    "https://",
    "sin-protocolo",
  ]) {
    const r = await create(url);
    assert.equal(r.status, 400);
    assert.equal((await r.json()).status, 400);
  }
  ok("URLs vacías y protocolos no permitidos devuelven 400 estructurado");
  const original = `https://example.com/validacion-parcial-2?run=${Date.now()}#destino`;
  const response = await create(original);
  assert.equal(response.status, 201);
  const link = await response.json();
  assert.match(link.id, /^[a-f0-9]{24}$/);
  assert.match(link.shortCode, /^[A-Za-z0-9]{8,10}$/);
  assert.equal(link.originalUrl, original);
  assert.ok(!Number.isNaN(Date.parse(link.createdAt)));
  ok("Creación 201, ObjectId automático, URL, código y fecha");
  const redirect = await fetch(`${base}/r/${link.shortCode}`, {
    redirect: "manual",
  });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), original);
  assert.equal(redirect.headers.get("cache-control"), "no-store");
  ok("Redirección real 302 al destino exacto");
  assert.equal(
    (await fetch(`${base}/r/invalid!`, { redirect: "manual" })).status,
    404,
  );
  assert.equal(
    (await fetch(`${base}/r/ZZZZZZZZZZ`, { redirect: "manual" })).status,
    404,
  );
  ok("Códigos inválidos y desconocidos devuelven 404");
  const parallel = await Promise.all(
    Array.from({ length: 12 }, () =>
      create(original).then(async (r) => {
        assert.equal(r.status, 201);
        return r.json();
      }),
    ),
  );
  assert.equal(
    new Set([link.shortCode, ...parallel.map((l) => l.shortCode)]).size,
    13,
  );
  ok("Solicitudes concurrentes: códigos únicos incluso para la misma URL");
  const stored = JSON.parse(
    docker(
      "exec",
      "-T",
      "mongo",
      "mongosh",
      "parcial_2_pa",
      "--quiet",
      "--eval",
      `JSON.stringify(db.links.findOne({shortCode: '${link.shortCode}'}))`,
    ),
  );
  assert.equal(stored.originalUrl, original);
  assert.equal(stored.shortCode, link.shortCode);
  const indexes = JSON.parse(
    docker(
      "exec",
      "-T",
      "mongo",
      "mongosh",
      "parcial_2_pa",
      "--quiet",
      "--eval",
      "JSON.stringify(db.links.getIndexes())",
    ),
  );
  assert.ok(
    indexes.some((index) => index.key.shortCode === 1 && index.unique === true),
  );
  const duplicate = docker(
    "exec",
    "-T",
    "mongo",
    "mongosh",
    "parcial_2_pa",
    "--quiet",
    "--eval",
    `try { db.links.insertOne({shortCode: '${link.shortCode}', originalUrl: 'https://example.com', createdAt: new Date()}); print('FAILED') } catch(e) { print(e.code) }`,
  );
  assert.equal(duplicate, "11000");
  ok("Documento real en MongoDB e índice único rechazando duplicados");
  redis("DEL", key);
  const miss = await history();
  assert.equal(miss.cacheStatus, "MISS");
  assert.ok(miss.remainingTtlMillis > 0 && miss.remainingTtlMillis <= 30000);
  assert.ok(miss.links.some((l) => l.id === link.id));
  const seededTtl = Number(redis("PTTL", key));
  assert.ok(seededTtl > 0 && seededTtl <= 30000);
  assert.ok(Math.abs(miss.remainingTtlMillis - seededTtl) < 2000);
  ok("Primera consulta MISS desde MongoDB, TTL Redis de 30 s, sin contador");
  const hit = await history();
  assert.equal(hit.cacheStatus, "HIT");
  const realTtl = Number(redis("PTTL", key));
  assert.ok(hit.remainingTtlMillis > 0 && hit.remainingTtlMillis <= 30000);
  assert.ok(Math.abs(hit.remainingTtlMillis - realTtl) < 2000);
  await delay(1200);
  const hit2 = await history();
  assert.equal(hit2.cacheStatus, "HIT");
  assert.ok(hit2.remainingTtlMillis < hit.remainingTtlMillis - 1000);
  ok(
    `HIT y TTL real sin renovación: ${hit.remainingTtlMillis} -> ${hit2.remainingTtlMillis} ms`,
  );
  const beforeBypass = Number(redis("PTTL", key));
  const cachedValue = redis("GET", key);
  const directResponse = await fetch(`${base}/api/links?source=mongo`);
  assert.equal(directResponse.status, 200);
  assert.equal(directResponse.headers.get("X-Cache"), "BYPASS");
  const direct = await directResponse.json();
  assert.equal(direct.cacheStatus, "BYPASS");
  assert.equal(direct.remainingTtlMillis, 0);
  assert.ok(direct.links.some((l) => l.id === link.id));
  assert.equal(redis("GET", key), cachedValue);
  assert.ok(Number(redis("PTTL", key)) < beforeBypass);
  ok(
    "Primera visita: lectura MongoDB directa sin leer, invalidar ni renovar Redis",
  );
  const newResponse = await create("http://example.com/cache-invalidation");
  assert.equal(newResponse.status, 201);
  const added = await newResponse.json();
  assert.equal(redis("EXISTS", key), "0");
  const invalidated = await history();
  assert.equal(invalidated.cacheStatus, "MISS");
  assert.ok(invalidated.links.some((l) => l.id === added.id));
  ok("Crear un enlace invalida el caché e incluye el nuevo documento");
  const wait = Number(redis("PTTL", key)) + 150;
  console.log(`Esperando expiración real (${Math.ceil(wait / 1000)} s)…`);
  await delay(wait);
  assert.equal(redis("PTTL", key), "-2");
  assert.equal((await history()).cacheStatus, "MISS");
  ok("Redis elimina automáticamente la clave y la siguiente consulta es MISS");
  const method = await fetch(`${base}/api/links`, { method: "DELETE" });
  assert.equal(method.status, 405);
  const malformed = await fetch(`${base}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  const cors = await fetch(`${base}/api/links`, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(
    cors.headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
  ok("405, JSON malformado y CORS del frontend");
  if (process.argv.includes("--restart")) {
    console.log(
      "Reiniciando solo MongoDB y backend de este proyecto para verificar persistencia…",
    );
    docker("restart", "mongo", "backend");
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        ready = (await fetch(`${base}/actuator/health`)).ok;
      } catch {}
      if (ready) break;
      await delay(1000);
    }
    assert.ok(ready, "El backend debe volver a estar saludable");
    const persisted = await fetch(`${base}/r/${link.shortCode}`, {
      redirect: "manual",
    });
    assert.equal(persisted.status, 302);
    assert.equal(persisted.headers.get("location"), original);
    ok(
      "Enlace persistente y redirección después de reiniciar MongoDB y Spring Boot",
    );
  }
  console.log(
    `\n${checks}/${checks} comprobaciones de integración correctas. Familia: ${(await fetch(`${base}/api/config`).then((r) => r.json())).factory}`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
