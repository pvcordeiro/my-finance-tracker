import { createServer } from "https"
import { parse } from "url"
import next from "next"
import { readFileSync } from "fs"
import { join } from "path"

const dev = process.env.NODE_ENV !== "production"
const hostname = "0.0.0.0"
const port = process.env.PORT || 443

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // SSL certificate configuration
  const httpsOptions = {
    key: readFileSync(join(process.cwd(), "certs", "private-key.pem")),
    cert: readFileSync(join(process.cwd(), "certs", "certificate.pem")),
  }

  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error("Error occurred handling", req.url, err)
      res.statusCode = 500
      res.end("internal server error")
    }
  })
    .once("error", (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on https://${hostname}:${port}`)
    })
})
