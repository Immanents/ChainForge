import { defineConfig, type HtmlTagDescriptor, type Plugin, loadEnv } from "vite"

import react from "@vitejs/plugin-react"

import tailwindcss from "@tailwindcss/vite"

import path from "node:path"

import siteConfiguration from "./.figma/make/site.json"
import { handleBlueprintRequest, INPUT_LIMITS } from "./server/blueprintHandler.ts"
import { handleEarlyAccessRequest, EARLY_ACCESS_LIMITS } from "./server/earlyAccessHandler.ts"

// Vite config — https://vitejs.dev/config/

export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.

  const emitSourcemaps = mode === "development"

  return {
    base: process.env.FIGMA_PUBLIC_URL
      ? `${process.env.FIGMA_PUBLIC_URL}/`
      : "/",

    build: {
      sourcemap: emitSourcemaps ? "inline" : false,

      minify: !emitSourcemaps,
    },

    plugins: [
      react(),

      tailwindcss(),

      figmaBlueprintProxy(),

      figmaSiteConfiguration(siteConfiguration),

      figmaErrorOverlayReplay(),

      figmaReactRefreshBoundaryFallback(),

      figmaMakeKitPlugin({ storiesGlob: "/src/**/*.stories.{ts,tsx,js,jsx}" }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: process.env.FIGMA_DEV_SERVER_HOST || "0.0.0.0",

      port: parseInt(process.env.PORT || "5173"),

      strictPort: true,

      watch: {
        ignored: ["**/.figma/**"],
      },
    },

    preview: {
      host: process.env.FIGMA_DEV_SERVER_HOST || "0.0.0.0",

      port: parseInt(process.env.PORT || "5173"),
    },
  }
})

type FigmaSiteConfiguration = {
  title?: string

  description?: string

  language?: string

  robots?: {
    index?: boolean
  }

  icons?: {
    icon?: string
  }

  openGraph?: {
    image?: string
  }

  analytics?: {
    googleAnalyticsId?: string
  }

  customScripts?: {
    headStart?: string

    headEnd?: string

    bodyStart?: string

    bodyEnd?: string
  }

  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */

function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, "") || ""
  }

  function escapeHtmlText(value: string): string {
    return value

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")
  }

  function replaceHtmlCommentSlot(
    html: string,

    slotName: string,

    content: string,
  ): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "Figma Make App"

  const description = config.description ?? ""

  const favicon = config.icons?.icon ?? ""

  const socialImage = config.openGraph?.image ?? ""

  const language = sanitizeHtmlValue(config.language) || "en"

  const googleAnalyticsId = sanitizeHtmlValue(
    config.analytics?.googleAnalyticsId,
  )

  const headStart = config.customScripts?.headStart ?? ""

  const headEnd = config.customScripts?.headEnd ?? ""

  const bodyStart = config.customScripts?.bodyStart ?? ""

  const bodyEnd = config.customScripts?.bodyEnd ?? ""

  const robotsTxt =
    config.robots?.index === false ? "User-agent: *\nDisallow: /\n" : ""

  return {
    name: "figma-site-configuration",

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split("?")[0] !== "/robots.txt")
          return next()

        res.setHeader("Content-Type", "text/plain; charset=utf-8")

        res.end(robotsTxt)
      })
    },

    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: "asset",

        fileName: "robots.txt",

        source: robotsTxt,
      })
    },

    transformIndexHtml: {
      order: "pre",

      handler(html) {
        let result = html

        result = replaceHtmlCommentSlot(result, "figma:lang", language)

        result = replaceHtmlCommentSlot(
          result,

          "figma:title",

          escapeHtmlText(title),
        )

        result = replaceHtmlCommentSlot(result, "figma:head-start", headStart)

        result = replaceHtmlCommentSlot(result, "figma:head-end", headEnd)

        result = replaceHtmlCommentSlot(result, "figma:body-start", bodyStart)

        result = replaceHtmlCommentSlot(result, "figma:body-end", bodyEnd)

        const tags: HtmlTagDescriptor[] = []

        if (description) {
          tags.push({
            tag: "meta",

            attrs: { name: "description", content: description },

            injectTo: "head",
          })
        }

        if (config.robots?.index === false) {
          tags.push({
            tag: "meta",

            attrs: { name: "robots", content: "noindex, nofollow" },

            injectTo: "head",
          })
        }

        if (favicon) {
          tags.push({
            tag: "link",

            attrs: { rel: "icon", href: favicon },

            injectTo: "head",
          })
        }

        if (title) {
          tags.push({
            tag: "meta",

            attrs: { property: "og:title", content: title },

            injectTo: "head",
          })
        }

        if (description) {
          tags.push({
            tag: "meta",

            attrs: { property: "og:description", content: description },

            injectTo: "head",
          })
        }

        if (socialImage) {
          tags.push(
            {
              tag: "meta",

              attrs: { property: "og:image", content: socialImage },

              injectTo: "head",
            },

            {
              tag: "meta",

              attrs: { name: "twitter:card", content: "summary_large_image" },

              injectTo: "head",
            },

            {
              tag: "meta",

              attrs: { name: "twitter:image", content: socialImage },

              injectTo: "head",
            },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: "script",

              attrs: {
                async: true,

                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },

              injectTo: "head",
            },

            {
              tag: "script",

              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,

              injectTo: "head",
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: "style",

              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,

              injectTo: "head",
            },

            {
              tag: "a",

              attrs: { class: "figma-bypass-link", href: "#root" },

              children: "Skip to content",

              injectTo: "body-prepend",
            },
          )
        }

        return {
          html: result,

          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */

function figmaErrorOverlayReplay(): Plugin {
  return {
    name: "figma-error-overlay-replay",

    apply: "serve",

    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (
        ...args: any[]
      ) => void

      server.ws.send = (((...args: any[]) => {
        const payload = args[0]

        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type

          if (type === "error") {
            lastError = (payload as object)
          } else if (type === "update" || type === "full-reload") {
            lastError = null
          }
        }

        return origSend(...args)
      }) as typeof server.ws.send)

      server.ws.on("connection", (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */

function figmaReactRefreshBoundaryFallback(): Plugin {
  type ModuleNode = import("vite").ModuleNode

  const hadRefreshBoundary = new Map<string, boolean>()

  const lostRefreshBoundaries = new Set<string>()

  let sendFullReload: (() => void) | null = null

  return {
    name: "figma-react-refresh-boundary-fallback",

    apply: "serve",

    enforce: "post",

    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: "full-reload", path: "*" })
    },

    handleHotUpdate({ modules, server, timestamp }) {
      if (lostRefreshBoundaries.size === 0) return

      const visited = new Set<ModuleNode>()

      const pending = [...modules]

      while (pending.length > 0) {
        const current = pending.pop()

        if (!current || visited.has(current)) continue

        visited.add(current)

        const moduleId = current.id?.split("?")[0]

        if (moduleId && lostRefreshBoundaries.has(moduleId)) {
          const invalidated = new Set<ModuleNode>()

          for (const updatedModule of modules) {
            server.moduleGraph.invalidateModule(
              updatedModule,

              invalidated,

              timestamp,

              true,
            )
          }

          sendFullReload?.()

          return []
        }

        pending.push(...current.importers)
      }
    },

    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes("/node_modules/"))
        return null

      const moduleId = id.split("?")[0] ?? id

      const hasRefreshBoundary = code.includes("registerExportsForReactRefresh")

      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)

      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (hasRefreshBoundary) lostRefreshBoundaries.delete(moduleId)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        lostRefreshBoundaries.add(moduleId)

        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */

function figmaMakeKitPlugin(options: {
  storiesGlob: string | string[]
}): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob)
    ? options.storiesGlob
    : [options.storiesGlob]

  const ROUTE = "/.figma/make/kit.html"

  const VIRTUAL_ID = "virtual:figma-stories"

  const RESOLVED_ID = "\0" + VIRTUAL_ID

  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`

  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: "figma-make-kit",

    apply: "serve",

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID

      return null
    },

    load(id) {
      if (id !== RESOLVED_ID) return null

      return STORIES_MODULE
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ""

        if (url.split("?")[0] !== ROUTE) return next()

        try {
          res.setHeader("Content-Type", "text/html")

          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}

/**
 * Server-side proxy for Gemini API blueprint generation and early access.
 * Delegates to portable shared handlers in `server/`.
 * Keeps the API key out of client bundles — the key is read from
 * `process.env.VITE_GEMINI_API_KEY` only on the server.
 */

function readJsonBody(
  req: import("node:http").IncomingMessage,
  maxBytes: number,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  return new Promise((resolve) => {
    let size = 0
    const chunks: Buffer[] = []
    let tooLarge = false

    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        tooLarge = true
        req.destroy()
        resolve({
          ok: false,
          error: `Payload too large. Maximum size is ${Math.round(maxBytes / 1024)} KB.`,
          status: 413,
        })
        return
      }
      chunks.push(chunk)
    })

    req.on("end", () => {
      if (tooLarge) return
      const raw = Buffer.concat(chunks).toString("utf8")
      if (!raw.trim()) {
        resolve({ ok: true, data: {} })
        return
      }
      try {
        const parsed = JSON.parse(raw)
        resolve({ ok: true, data: parsed })
      } catch {
        resolve({ ok: false, error: "Invalid JSON payload.", status: 400 })
      }
    })

    req.on("error", (err) => {
      resolve({ ok: false, error: `Stream error: ${err.message}`, status: 400 })
    })
  })
}

function figmaBlueprintProxy(): Plugin {
  return {
    name: "figma-blueprint-proxy",

    apply: "serve",

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0]

        if (path === "/api/early-access") {
          const bodyResult = await readJsonBody(req, EARLY_ACCESS_LIMITS.maxBodyBytes)
          if (!bodyResult.ok) {
            res.statusCode = bodyResult.status
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ error: bodyResult.error }))
            return
          }

          const response = await handleEarlyAccessRequest({
            method: req.method || "GET",
            url: req.url,
            headers: req.headers,
            body: bodyResult.data,
          })

          res.statusCode = response.status
          if (response.headers) {
            for (const [k, v] of Object.entries(response.headers)) {
              res.setHeader(k, v)
            }
          }
          res.end(JSON.stringify(response.body))
          return
        }

        if (path === "/api/generate-blueprint") {
          const apiKey =
            process.env.VITE_GEMINI_API_KEY ||
            loadEnv("development", process.cwd(), "").VITE_GEMINI_API_KEY

          const openRouterApiKey =
            process.env.OPENROUTER_API_KEY ||
            loadEnv("development", process.cwd(), "").OPENROUTER_API_KEY

          const openRouterModel =
            process.env.OPENROUTER_MODEL ||
            loadEnv("development", process.cwd(), "").OPENROUTER_MODEL

          const bodyResult = await readJsonBody(req, INPUT_LIMITS.maxBodyBytes)
          if (!bodyResult.ok) {
            res.statusCode = bodyResult.status
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ error: bodyResult.error }))
            return
          }

          const response = await handleBlueprintRequest(
            {
              method: req.method || "GET",
              url: req.url,
              headers: req.headers,
              body: bodyResult.data,
            },
            { apiKey, openRouterApiKey, openRouterModel },
          )

          res.statusCode = response.status
          if (response.headers) {
            for (const [k, v] of Object.entries(response.headers)) {
              res.setHeader(k, v)
            }
          }
          res.end(JSON.stringify(response.body))
          return
        }

        return next()
      })
    },
  }
}
