export default function PageHeading({
  number,
  eyebrow,
  title,
  text,
  children,
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="section-number">{number}</span> {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
