export async function request(path, options) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.detail || "No pudimos conectar con el servidor. Inténtalo de nuevo.",
    );
  return data;
}
