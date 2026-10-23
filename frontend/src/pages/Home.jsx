import Icon from "../components/Icon";

export default function Home() {
  return (
    <div className="home page-enter">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-dot" /> SIMPLE POR FUERA. POTENTE POR DENTRO.
          </div>
          <h1>
            Menos URL.
            <br />
            Más{" "}
            <span className="accent-word">
              posibilidades
              <svg
                viewBox="0 0 500 18"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M3 12Q240-7 497 9" />
              </svg>
            </span>
            .
          </h1>
          <p>
            Las buenas ideas merecen enlaces fáciles de compartir. Acorta tus
            URLs, guárdalas y conecta con tu próximo destino.
          </p>
          <div className="hero-actions">
            <a href="#acortar" className="button button-dark">
              Crear mi primer enlace <Icon name="arrow" />
            </a>
            <a href="#enlaces" className="text-link">
              Explorar mis enlaces <Icon name="diagonal" size={17} />
            </a>
          </div>
          <div className="hero-note">
            <Icon name="check" size={16} /> Sin registro <span /> Enlaces que
            permanecen
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Ilustración del proceso: una dirección larga se convierte en un enlace corto"
        >
          <div className="art-grid" />
          <span className="art-tag">
            <span className="tiny-dot" /> ASÍ DE SIMPLE
          </span>
          <div className="url-card source-card">
            <span className="card-label">TU ENLACE ORIGINAL</span>
            <div className="url-preview">
              <span className="site-icon">
                <Icon name="external" size={19} />
              </span>
              <span>
                tus-ideas.com/un-destino
                <br />
                <span className="muted">/con-muchas-posibilidades</span>
              </span>
            </div>
          </div>
          <div className="flow-line">
            <span />
            <div className="flow-bolt">
              <Icon name="bolt" size={23} />
            </div>
            <span />
            <Icon name="arrow" size={18} />
          </div>
          <div className="url-card short-card">
            <div className="card-label">
              MENOS CARACTERES. MISMO DESTINO.
              <Icon name="check" size={16} />
            </div>
            <div className="short-preview">
              <Icon name="link" size={25} />
              <span>
                enlace<span className="muted"> / </span>
                <b>TuIdea01</b>
              </span>
            </div>
          </div>
          <div className="floating-label">
            <Icon name="shield" size={16} /> Listo para compartir
          </div>
          <span className="art-caption">
            De una gran dirección a una pequeña conexión.
          </span>
        </div>
      </section>
      <section className="how-section" aria-labelledby="how-title">
        <div className="section-topline">
          <h2 id="how-title">Tu próximo destino, a un enlace.</h2>
          <span>EN TRES SIMPLES PASOS</span>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "link",
              "Pega. Acorta. Comparte.",
              "Transforma cualquier URL HTTP o HTTPS en un enlace pequeño y fácil de recordar.",
            ],
            [
              "02",
              "database",
              "Tus enlaces, siempre aquí.",
              "Consulta tu colección cuando la necesites. Cada enlace se guarda de forma permanente.",
            ],
            [
              "03",
              "bolt",
              "Una consulta más ágil.",
              "El historial utiliza caché durante 30 segundos. Puedes ver cuándo viene de Redis y cuánto le queda.",
            ],
          ].map(([num, icon, title, text]) => (
            <article className="step" key={num}>
              <div className="step-top">
                <Icon name={icon} size={23} />
                <span>{num}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="home-banner">
        <div>
          <span className="eyebrow">HAZ ESPACIO PARA LO IMPORTANTE</span>
          <h2>Una gran idea cabe en un enlace corto.</h2>
        </div>
        <a
          href="#acortar"
          className="round-link"
          aria-label="Ir a acortar enlace"
        >
          <Icon name="diagonal" size={27} />
        </a>
      </section>
    </div>
  );
}
