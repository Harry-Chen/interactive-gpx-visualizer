import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const appVersion = getGitDescribe();
const buildDate = new Date().toISOString();
const dependencyLicenses = buildDependencyLicenses([
  "react",
  "react-dom",
  "vite",
  "typescript",
  "maplibre-gl",
  "@garmin/fitsdk",
  "fast-xml-parser",
  "recharts",
  "lucide-react"
]);

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_DATE__: JSON.stringify(buildDate),
    __DEPENDENCY_LICENSES__: JSON.stringify(dependencyLicenses)
  },
  build: {
    target: "es2022"
  }
});

function getGitDescribe() {
  try {
    return execSync("git describe --tags --always --dirty", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "unknown";
  }
}

function buildDependencyLicenses(packageNames: string[]) {
  return packageNames.map((name) => {
    try {
      const packageJson = JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")) as {
        version?: string;
        license?: string;
      };
      return {
        name,
        version: packageJson.version ?? "unknown",
        license: packageJson.license ?? "unknown"
      };
    } catch {
      return {
        name,
        version: "unknown",
        license: "unknown"
      };
    }
  });
}
