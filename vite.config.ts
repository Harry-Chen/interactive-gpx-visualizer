import { defineConfig, type HtmlTagDescriptor, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { analyzer } from "vite-bundle-analyzer";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const appVersion = getGitDescribe();
const buildDate = new Date().toISOString();
const repositoryUrl = normalizeOptionalValue(process.env.VITE_REPOSITORY_URL);
const publicSiteUrl = normalizePublicSiteUrl(process.env.VITE_PUBLIC_SITE_URL);
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

export default defineConfig(({ mode }) => {
  const buildFlavor = mode === "debug" ? "debug" : "release";

  return {
    plugins: [
      react(),
      buildMetadataPlugin(publicSiteUrl),
      analyzer({
        analyzerMode: "static",
        fileName: `../bundle-analyzer/${buildFlavor}`,
        reportTitle: `Interactive GPX Visualizer Bundle (${buildFlavor})`,
        openAnalyzer: false,
        defaultSizes: "gzip"
      })
    ],
    base: "./",
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_DATE__: JSON.stringify(buildDate),
      __REPOSITORY_URL__: JSON.stringify(repositoryUrl),
      __PUBLIC_SITE_URL__: JSON.stringify(publicSiteUrl),
      __DEPENDENCY_LICENSES__: JSON.stringify(dependencyLicenses)
    },
    build: {
      target: "es2022",
      outDir: buildFlavor === "debug" ? "dist-debug" : "dist",
      minify: buildFlavor === "debug" ? false : "esbuild",
      sourcemap: buildFlavor === "debug"
    }
  };
});

function buildMetadataPlugin(siteUrl: string): Plugin {
  return {
    name: "app-build-metadata",
    transformIndexHtml() {
      if (!siteUrl) {
        return [];
      }

      return [
        {
          tag: "link",
          attrs: {
            rel: "canonical",
            href: siteUrl
          },
          injectTo: "head"
        },
        {
          tag: "meta",
          attrs: {
            property: "og:url",
            content: siteUrl
          },
          injectTo: "head"
        }
      ] satisfies HtmlTagDescriptor[];
    }
  };
}

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

function normalizeOptionalValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizePublicSiteUrl(value: string | undefined) {
  const url = normalizeOptionalValue(value);

  if (!url) {
    return "";
  }

  return url.endsWith("/") ? url : `${url}/`;
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
