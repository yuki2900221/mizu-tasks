export function renderServiceWorker(template, paths, revision) {
  const precache = [...new Set(["/", ...paths])].filter(
    (path) =>
      !path.startsWith("/api/") &&
      !path.startsWith("/auth/") &&
      path !== "/sw.js",
  );
  if (
    !precache.some((path) => path.endsWith(".js")) ||
    !precache.some((path) => path.endsWith(".css"))
  ) {
    throw new Error("The offline shell must include the compiled JS and CSS");
  }
  return template
    .replace(
      /\/\* mizu:version \*\/ "[^"]+"/,
      JSON.stringify(`mizu-shell-${revision}`),
    )
    .replace(/\/\* mizu:precache \*\/ \[[\s\S]*?\]/, JSON.stringify(precache));
}
