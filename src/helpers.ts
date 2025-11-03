export function getLocale(inputLocale: string | undefined) {
  let lang =
    inputLocale ||
    (typeof navigator !== "undefined" ? navigator.language : "en-US");
  let locale: string | undefined = undefined;
  try {
    locale = Intl.getCanonicalLocales([lang])[0];
  } catch {
    // ignore, use default
  }
  return locale;
}