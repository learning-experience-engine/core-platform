export const classNames = (...values: Array<string | undefined | false>) => {
  const next = values.filter(Boolean).join(" ");
  return next.length > 0 ? next : undefined;
};
