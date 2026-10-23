import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import Icon from "../components/Icon";
import CopyButton from "../components/CopyButton";
import PageHeading from "../components/PageHeading";
import ErrorNotice from "../components/ErrorNotice";

export default function Shorten() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef();
  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      setError("Escribe una URL completa, por ejemplo https://ejemplo.com.");
      return;
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    ) {
      setError("Usa una URL HTTP o HTTPS sin credenciales.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await request("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: url.trim() }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);
  return (
    <div className="inner-page page-enter">
      <PageHeading
        number="01"
        eyebrow="MENOS ES MÁS"
        title={
          <>
            Un enlace pequeño.
            <br />
            <span className="muted">Un mundo de destinos.</span>
          </>
        }
        text="Pega una dirección y conviértela en tu próxima conexión."
      />
      <div className="shorten-layout">
        <section className="form-panel">
          <div className="panel-heading">
            <span className="panel-icon">
              <Icon name="link" size={22} />
            </span>
            <span>De largo a corto</span>
            <span className="small-tag">HTTP / HTTPS</span>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="original-url">¿A dónde quieres llevarnos?</label>
            <p className="field-help" id="url-help">
              Introduce la URL completa del sitio que quieres compartir.
            </p>
            <div className={`url-input-wrap ${error ? "invalid" : ""}`}>
              <Icon name="link" />
              <input
                id="original-url"
                type="url"
                inputMode="url"
                placeholder="https://tus-ideas.com/un-gran-destino"
                required
                maxLength={8192}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                aria-describedby="url-help"
                aria-invalid={!!error}
                autoComplete="url"
                disabled={loading}
              />
            </div>
            {error && <ErrorNotice>{error}</ErrorNotice>}
            <button
              className="button button-dark submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Acortando…
                </>
              ) : (
                <>
                  Acortar enlace <Icon name="arrow" />
                </>
              )}
            </button>
          </form>
          {loading && (
            <div className="transformation" role="status">
              <span className="transform-long" />
              <Icon name="arrow" />
              <span className="transform-short" /> Creando tu conexión…
            </div>
          )}
          {result ? (
            <div
              className="result-card page-enter"
              ref={resultRef}
              tabIndex="-1"
            >
              <div className="result-top">
                <span>
                  <Icon name="check" size={17} /> Tu enlace está listo
                </span>
                <span>GUARDADO</span>
              </div>
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="result-url"
              >
                {result.shortUrl}
                <Icon name="diagonal" />
              </a>
              <div className="result-original" title={result.originalUrl}>
                {result.originalUrl}
              </div>
              <div className="result-actions">
                <CopyButton value={result.shortUrl} />
                <a href="#enlaces" className="text-link">
                  Ver mis enlaces <Icon name="arrow" size={17} />
                </a>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="result-placeholder">
                <span className="placeholder-link">
                  <Icon name="link" size={28} />
                </span>
                <span>
                  Tu próxima conexión aparecerá aquí.
                  <small>El mismo destino, con menos caracteres.</small>
                </span>
              </div>
            )
          )}
        </section>
        <aside className="tips-panel">
          <span className="eyebrow">PEQUEÑO, PERO PODEROSO</span>
          <h2>
            Todo lo que necesitas.
            <br />
            En menos espacio.
          </h2>
          <div className="tip">
            <Icon name="shield" />
            <div>
              <h3>Un destino intacto</h3>
              <p>
                Tu enlace corto te lleva a la dirección original, sin cambiar su
                contenido.
              </p>
            </div>
          </div>
          <div className="tip">
            <Icon name="database" />
            <div>
              <h3>Guardado de verdad</h3>
              <p>
                Los enlaces permanecen disponibles aunque reinicies la
                aplicación.
              </p>
            </div>
          </div>
          <div className="tip">
            <Icon name="copy" />
            <div>
              <h3>Comparte a tu manera</h3>
              <p>Cópialo con un clic y úsalo donde quieras.</p>
            </div>
          </div>
          <div className="aside-bottom">
            Menos caracteres.
            <br />
            <strong>Más conexiones.</strong>
            <Icon name="diagonal" size={35} />
          </div>
        </aside>
      </div>
    </div>
  );
}
