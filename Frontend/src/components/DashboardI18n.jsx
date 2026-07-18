import { useLanguage } from "../context/LanguageContext";

export function useTx() {
  const { tx } = useLanguage();
  return tx;
}

/** Inline translate for JSX text nodes / props. */
export function Tx({ children, as: Tag = "span", className = "", ...rest }) {
  const tx = useTx();
  const content =
    typeof children === "string" || typeof children === "number"
      ? tx(String(children))
      : children;
  return (
    <Tag className={className} {...rest}>
      {content}
    </Tag>
  );
}
