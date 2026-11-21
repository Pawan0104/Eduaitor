const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const nameOf = (item) =>
  String(item?.name || item?.className || item?.label || "").trim();

export function compareClassNames(a, b) {
  return collator.compare(nameOf(a), nameOf(b));
}

export function sortClassesByName(classes = []) {
  return (Array.isArray(classes) ? classes : []).slice().sort(compareClassNames);
}
