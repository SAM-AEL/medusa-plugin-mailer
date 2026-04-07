import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ok } from "../../../../shared/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const host = process.env.MAILER_SMTP_HOST || ""
    const port = process.env.MAILER_SMTP_PORT || ""
    const user = process.env.MAILER_SMTP_USER || ""
    const secure = process.env.MAILER_SMTP_SECURE === "true"

    const smtp = {
        host,
        port,
        user,
        secure,
        configured: !!(host && port && user && process.env.MAILER_SMTP_PASS),
    }

    // Build sender profiles from env vars (up to 5)
    const senders: { index: number; name: string; address: string }[] = []
    for (let i = 1; i <= 5; i++) {
        const name = process.env[`MAILER_FROM_NAME_${i}`]
        const address = process.env[`MAILER_FROM_ADDRESS_${i}`]
        if (name || address) {
            senders.push({ index: i, name: name || "", address: address || "" })
        }
    }

    return ok(res, { smtp, senders })
}
