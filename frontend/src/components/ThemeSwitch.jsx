import { useEffect, useState } from "react";

export default function ThemeSwitch() {
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );

  useEffect(() => {
    const theme = dark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("enlace-theme", theme);
    } catch {
      // El cambio funciona también cuando el navegador bloquea el almacenamiento.
    }
  }, [dark]);

  return (
    <button
      className="theme-switch"
      type="button"
      role="switch"
      aria-label="Modo oscuro"
      aria-checked={dark}
      title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={() => setDark((previous) => !previous)}
    >
      <span className="theme-switch-thumb">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {dark ? (
            <path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
            </>
          )}
        </svg>
      </span>
    </button>
  );
}
