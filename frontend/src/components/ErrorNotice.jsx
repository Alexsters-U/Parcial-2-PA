import Icon from "./Icon";

export default function ErrorNotice({ children }) {
  return (
    <div className="error-notice" role="alert">
      <Icon name="alert" size={20} />
      <span>{children}</span>
    </div>
  );
}
