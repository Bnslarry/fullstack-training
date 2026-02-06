import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const resolveClientPackageJson = () => {
  try {
    return require.resolve("@prisma/client/package.json", {
      paths: [process.cwd()],
    });
  } catch (error) {
    return null;
  }
};

const clientPackageJsonPath = resolveClientPackageJson();

if (!clientPackageJsonPath) {
  process.exit(0);
}

const clientDir = path.dirname(clientPackageJsonPath);
const prismaDir = path.resolve(clientDir, "..", "..", ".prisma");
const linkTarget = path.join(clientDir, ".prisma");

if (!fs.existsSync(prismaDir)) {
  console.warn("[prisma] .prisma directory not found, skipping link.");
  process.exit(0);
}

if (fs.existsSync(linkTarget)) {
  process.exit(0);
}

const relativeTarget = path.relative(clientDir, prismaDir);

try {
  fs.symlinkSync(relativeTarget, linkTarget, "dir");
  console.log("[prisma] Linked @prisma/client/.prisma ->", relativeTarget);
} catch (error) {
  console.warn("[prisma] Failed to link Prisma client output:", error);
}
