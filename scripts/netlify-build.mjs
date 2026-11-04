import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist");

await mkdir(output, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });

for (const entry of entries) {
  if (entry.isFile() && /\.(html|css)$/i.test(entry.name)) {
    await cp(
      path.join(root, entry.name),
      path.join(output, entry.name),
    );
  }
}

for (const directory of ["assets"]) {
  try {
    await cp(
      path.join(root, directory),
      path.join(output, directory),
      { recursive: true },
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

console.log("VIVAIATHAN static site copied to dist/");
