import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
  .hostname;
let hmrConfig;

if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT) || 8002,
    clientPort: 443,
  };
}

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      allow: ["app", "node_modules"],
    },
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: false
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 4096, // Inline small assets
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    // Enable source maps in production for debugging
    sourcemap: false,
    reportCompressedSize: false, // Faster builds
  },
  optimizeDeps: {
    include: [
      "d3-scale",
      "@shopify/polaris-viz",
      "react/jsx-runtime",
      "@shopify/polaris",
      "@shopify/app-bridge-react",
      "date-fns",
      "react",
      "react-dom"
    ],
    // Force optimization of these packages
    force: true
  },
  // Enable build caching
  cacheDir: "node_modules/.vite",
  ssr: {
    noExternal: [
      "d3-scale",
      "@shopify/polaris-viz",
      "@shopify/polaris-viz-core",
      "d3-array",
      "d3-format",
      "d3-time",
      "d3-time-format"
    ],
  },
});
