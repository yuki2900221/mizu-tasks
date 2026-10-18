import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { renderServiceWorker } from "./precache-worker.mjs";
const root = new URL("../dist/", import.meta.url);
async function files(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? files(new URL(entry.name + "/", directory), prefix + entry.name + "/")
        : [prefix + entry.name],
    ),
  );
  return nested.flat();
}
const paths = (await files(root))
  .filter(
    (path) =>
      path !== "sw.js" && !path.startsWith("api/") && !path.startsWith("auth/"),
  )
  .sort();
const hash = createHash("sha256");
for (const path of paths)
  hash.update(path).update(await readFile(new URL(path, root)));
const template = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
hash.update(template);
const revision = hash.digest("hex").slice(0, 16);
await writeFile(
  new URL("sw.js", root),
  renderServiceWorker(
    template,
    paths.map((path) => "/" + path),
    revision,
  ),
);
console.log(`Offline shell: ${paths.length + 1} precached files (${revision})`);
