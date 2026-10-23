import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import Icon from "../components/Icon";
import CopyButton from "../components/CopyButton";
import PageHeading from "../components/PageHeading";
import ErrorNotice from "../components/ErrorNotice";

export default function History({ refreshSignal, initialVisit }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [search, setSearch] = useState("");
  const [expired, setExpired] = useState(false);
  const sequence = useRef(0);
  async function load() {
    const current = ++sequence.current;
    const started = performance.now();
    setLoading(true);
    setError("");
    try {
      const next = await request(
        initialVisit ? "/api/links?source=mongo" : "/api/links",
      );
      if (current !== sequence.current) return;
      // Descontar el viaje completo es conservador: nunca mostramos TTL extra.
      const ttl = Math.max(
        0,
        next.remainingTtlMillis - (performance.now() - started),
      );
      const persistent = next.cacheStatus === "BYPASS";
      setData(persistent || ttl > 0 ? next : null);
      setExpired(!persistent && ttl <= 0);
      setDeadline(!persistent && ttl > 0 ? Date.now() + ttl : 0);
      setRemaining(Math.ceil(ttl / 1000));
    } catch (err) {
      if (current === sequence.current) setError(err.message);
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    load();
    return () => {
      sequence.current++;
    };
  }, [refreshSignal, initialVisit]);
  useEffect(() => {
    if (!deadline) return;
    const expire = () => {
      setData(null);
      setExpired(true);
      setRemaining(0);
      setDeadline(0);
    };
    const tick = () => {
      const millis = deadline - Date.now();
      setRemaining(Math.max(0, Math.ceil(millis / 1000)));
      if (millis <= 0) expire();
    };
    tick();
    const timer = setInterval(tick, 1000);
    const expiryTimer = setTimeout(expire, Math.max(0, deadline - Date.now()));
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      clearTimeout(expiryTimer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [deadline]);
  const filtered = (data?.links || []).filter((link) =>
    `${link.originalUrl} ${link.shortUrl}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="inner-page history-page page-enter">
      <PageHeading
        number="02"
        eyebrow="CADA ENLACE, UNA CONEXIÓN"
        title="Tus destinos, en un solo lugar."
        text="Todos los enlaces que has creado. Listos para volver a compartir."
      >
        <a href="#acortar" className="button button-dark">
          Nuevo enlace <Icon name="arrow" size={18} />
        </a>
      </PageHeading>
      <section
        className="history-panel"
        aria-label="Historial de enlaces"
        aria-busy={loading}
      >
        <div className="history-toolbar">
          <div className="collection-label">
            <Icon name="list" size={21} />
            <h2>Mi colección</h2>
            {data && <span className="count-pill">{data.links.length}</span>}
          </div>
          <div className="history-controls">
            <label className="sr-only" htmlFor="filter">
              Buscar en mis enlaces
            </label>
            <input
              id="filter"
              className="search-input"
              type="search"
              placeholder="Buscar un enlace…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="button button-outline"
              onClick={load}
              disabled={loading}
            >
              <Icon
                name="refresh"
                size={17}
                className={loading ? "spin" : ""}
              />
              Actualizar
            </button>
          </div>
        </div>
        {error && (
          <div className="history-error">
            <ErrorNotice>{error}</ErrorNotice>
          </div>
        )}
        {loading && data && (
          <span className="sr-only" role="status">
            Actualizando el historial. Los enlaces actuales siguen disponibles.
          </span>
        )}
        {data && (
          <div
            className={`source-bar ${data.cacheStatus !== "BYPASS" ? "source-redis" : ""}`}
            role="status"
            data-testid="cache-status"
          >
            <span>
              <Icon
                name={data.cacheStatus !== "BYPASS" ? "bolt" : "database"}
                size={17}
              />
              {data.cacheStatus === "HIT"
                ? "Datos obtenidos desde Redis"
                : data.cacheStatus === "MISS"
                  ? "Datos almacenados en Redis"
                  : "Datos consultados en MongoDB"}
            </span>
            {data.cacheStatus === "BYPASS" ? (
              <span className="source-detail" data-testid="history-initial">
                Primera visita · Sin caducidad
              </span>
            ) : (
              <span className="ttl-block">
                <span className="ttl-track">
                  <span style={{ width: `${(remaining / 30) * 100}%` }} />
                </span>
                <span data-testid="ttl">
                  {remaining > 0
                    ? `${remaining} s restantes`
                    : "Caché expirado"}
                </span>
              </span>
            )}
          </div>
        )}
        {expired && (
          <div
            className="empty-state history-expired"
            role="status"
            data-testid="history-expired"
          >
            <span className="empty-icon">
              <Icon name="clock" size={32} />
            </span>
            <h3>Caché expirado</h3>
            <p>
              Los 30 segundos terminaron. Los enlaces siguen guardados en
              MongoDB.
            </p>
            <p>
              Pulsa Actualizar o Ver enlaces para volver a consultar el
              historial.
            </p>
          </div>
        )}
        {loading && !data && !expired ? (
          <div className="loading-state" role="status">
            <span className="spinner" /> Consultando tus enlaces…
          </div>
        ) : (
          data &&
          (!data?.links.length ? (
            <div className="empty-state">
              <span className="empty-icon">
                <Icon name="link" size={32} />
              </span>
              <h3>Aquí empieza tu colección.</h3>
              <p>Crea tu primer enlace y lo encontrarás en este espacio.</p>
              <a href="#acortar" className="text-link">
                Acortar mi primer enlace <Icon name="arrow" size={18} />
              </a>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ENLACE ORIGINAL</th>
                    <th>ENLACE CORTO</th>
                    <th>CREADO EL</th>
                    <th className="actions-heading">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((link) => (
                    <tr key={link.id}>
                      <td>
                        <span className="original-cell">
                          <span className="row-link-icon">
                            <Icon name="link" size={18} />
                          </span>
                          <span>
                            <strong>
                              {new URL(link.originalUrl).hostname}
                            </strong>
                            <span
                              className="original-path"
                              title={link.originalUrl}
                            >
                              {link.originalUrl}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <a
                          className="short-table-link"
                          href={link.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={link.shortUrl}
                        >
                          {link.shortUrl.replace(/^https?:\/\//, "")}
                          <Icon name="diagonal" size={14} />
                        </a>
                      </td>
                      <td>
                        <time dateTime={link.createdAt}>
                          {new Date(link.createdAt).toLocaleDateString(
                            "es-CO",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                          <small>
                            {new Date(link.createdAt).toLocaleTimeString(
                              "es-CO",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </small>
                        </time>
                      </td>
                      <td>
                        <div className="row-actions">
                          <CopyButton value={link.shortUrl} compact />
                          <a
                            className="icon-button"
                            href={link.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir URL original"
                            aria-label={`Abrir URL original: ${link.originalUrl}`}
                          >
                            <Icon name="external" size={17} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="no-results">
                  No hay enlaces que coincidan con tu búsqueda.
                </p>
              )}
            </div>
          ))
        )}
        {data?.links.length > 0 && (
          <div className="table-footer">
            <span>
              {filtered.length} de {data.links.length} enlaces
            </span>
            <span>
              <Icon name="shield" size={14} /> Guardados de forma permanente
            </span>
          </div>
        )}
      </section>
      <div className="history-note">
        <Icon name="clock" size={19} />
        <p>
          Un historial ágil, sin perder tus enlaces.
          <span>
            {" "}
            {initialVisit
              ? "Esta primera visita consulta MongoDB y conserva el listado mientras permanezcas aquí. Al salir y volver, se activa la caché de Redis con TTL de 30 segundos."
              : "Redis conserva la consulta por 30 segundos. Al vencer el TTL, el listado se oculta hasta que pulses Actualizar o Ver enlaces."}
          </span>
        </p>
      </div>
    </div>
  );
}
