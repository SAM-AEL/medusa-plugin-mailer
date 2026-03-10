import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { invalidateMailerCache } from "../../../../subscribers/mailer-event-handler"

const MAILER_MODULE = "mailer"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const mailerModule = req.scope.resolve(MAILER_MODULE)

    const [mappings, count] = await (mailerModule as any).listAndCountMailerEventMappings(
        {},
        {
            take: Number(req.query.limit) || 50,
            skip: Number(req.query.offset) || 0,
            order: { created_at: "DESC" },
        }
    )

    res.json({ mappings, count })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const mailerModule = req.scope.resolve(MAILER_MODULE)
    const body = req.body as Record<string, any>

    const { event_name, template_name, sender_index, subject, template_variables, recipient_type, recipient_email, active } = body

    if (!event_name || !template_name) {
        return res.status(400).json({ message: "event_name and template_name are required" })
    }

    const mapping = await (mailerModule as any).createMailerEventMappings({
        event_name,
        template_name,
        sender_index: sender_index || 1,
        subject: subject || "",
        template_variables: template_variables || {},
        recipient_type: recipient_type || "customer_email",
        recipient_email: recipient_type === "custom" ? recipient_email : null,
        active: active !== undefined ? active : true,
    })

    invalidateMailerCache()

    res.status(201).json({ mapping })
}
