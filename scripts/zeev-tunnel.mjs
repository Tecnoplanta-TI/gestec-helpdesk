import { spawn } from "node:child_process"

const port = process.env.PORT ?? "3000"
const target = `http://127.0.0.1:${port}`

console.log("Expondo o Help Desk local para o Zeev alcançar.")
console.log(`Alvo: ${target}`)
console.log("Mantenha `npm run dev` em outro terminal.")
console.log("Cole a URL HTTPS gerada na integração HTTP do Zeev.")
console.log("")

const child = spawn("cloudflared", ["tunnel", "--url", target], { stdio: "inherit", shell: true })

child.on("error", () => {
  console.error("cloudflared não está instalado.")
  console.error("No Windows: winget install Cloudflare.cloudflared")
  console.error("Depois rode de novo: npm run zeev:tunnel")
  process.exit(1)
})

child.on("exit", (code) => {
  process.exit(code ?? 1)
})
