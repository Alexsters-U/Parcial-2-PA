import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { request } from "./api";
import Icon from "./components/Icon";
import ThemeSwitch from "./components/ThemeSwitch";
import Home from "./pages/Home";
import Shorten from "./pages/Shorten";
import History from "./pages/History";
import "./styles.css";
import "./theme.css";

const routeFromHash = () =>
  ["acortar", "enlaces"].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "inicio";

function App() {
  const [page, setPage] = useState(routeFromHash);
  const [config, setConfig] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [historyCacheEnabled, setHistoryCacheEnabled] = useState(false);
  const previousPage = useRef(page);
  const main = useRef();
  useEffect(() => {
    const navigate = () => {
      const nextPage = routeFromHash();
      if (previousPage.current === "enlaces" && nextPage !== "enlaces") {
        setHistoryCacheEnabled(true);
      }
      previousPage.current = nextPage;
      setPage(nextPage);
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", navigate);
    request("/api/config")
      .then(setConfig)
      .catch(() => {});
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="#inicio" className="brand" aria-label="Enlace, inicio">
            <span className="brand-symbol">
              <Icon name="link" size={25} />
            </span>
            enlace<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Navegación principal">
            {[
              ["inicio", "Inicio"],
              ["acortar", "Acortar enlace"],
              ["enlaces", "Ver enlaces"],
            ].map(([route, label]) => (
              <a
                key={route}
                href={`#${route}`}
                className={page === route ? "active" : ""}
                aria-current={page === route ? "page" : undefined}
                onClick={(event) => {
                  if (route === "enlaces" && page === "enlaces") {
                    event.preventDefault();
                    setHistoryRefresh((previous) => previous + 1);
                  }
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <span className="header-caption">UN ENLACE. MENOS DISTANCIA.</span>
            <ThemeSwitch />
          </div>
        </div>
      </header>
      <main id="main" ref={main} tabIndex="-1" className="main-content">
        {page === "inicio" && <Home />}
        {page === "acortar" && <Shorten />}
        {page === "enlaces" && (
          <History
            refreshSignal={historyRefresh}
            initialVisit={!historyCacheEnabled}
          />
        )}
      </main>
      <footer>
        <a href="#inicio" className="footer-brand">
          enlace.
        </a>
        <span>Pequeños enlaces, grandes destinos.</span>
        <span className="footer-project">
          Programación Avanzada <span> / </span> Parcial 02{" "}
          {config && (
            <span
              className="factory-note"
              title="Familia activa de Abstract Factory"
            >
              · {config.factory}
            </span>
          )}
        </span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
