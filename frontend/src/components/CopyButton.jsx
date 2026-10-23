import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export default function CopyButton({ value, compact = false }) {
  const [status, setStatus] = useState("idle");
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  }
  const label =
    status === "copied"
      ? "Copiado"
      : status === "error"
        ? "No se pudo copiar"
        : "Copiar enlace";
  return (
    <span className="copy-control">
      <button
        type="button"
        className={`${compact ? "icon-button" : "button button-dark"} ${status === "copied" ? "copied" : ""}`}
        onClick={copy}
        aria-label={`${label}: ${value}`}
        title={label}
      >
        <Icon name={status === "copied" ? "check" : "copy"} size={18} />
        {!compact && label}
      </button>
      <span role="status" className={compact ? "copy-feedback" : "sr-only"}>
        {status === "copied"
          ? "Enlace copiado."
          : status === "error"
            ? "No se pudo copiar. Selecciona el enlace y cópialo manualmente."
            : ""}
      </span>
    </span>
  );
}
