import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { invalidateMailerCache } from "../../../../subscribers/mailer-event-handler"
import { fail, normalizeTemplateVariables, ok, parsePagination } from "../../../../shared/http"

const MAILER_MODULE = "mailer"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const mailerModule = req.scope.resolve(MAILER_MODULE)
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>)

    const [mappings, count] = await (mailerModule as any).listAndCountMailerEventMappings(
        {},
        {
            take: limit,
            skip: offset,
            order: { created_at: "DESC" },
        }
    )

    return ok(res, { mappings, count })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const mailerModule = req.scope.resolve(MAILER_MODULE)
    const body = req.body as Record<string, any>

    const { event_name, template_name, sender_index, subject, template_variables, recipient_type, recipient_email, active } = body

    if (!event_name || !template_name) {
        return fail(res, 400, "INVALID_PAYLOAD", "event_name and template_name are required")
    }

    if (recipient_type === "custom" && (!recipient_email || typeof recipient_email !== "string")) {
        return fail(res, 400, "INVALID_PAYLOAD", "recipient_email is required when recipient_type is custom")
    }

    const mapping = await (mailerModule as any).createMailerEventMappings({
        event_name,
        template_name,
        sender_index: sender_index || 1,
        subject: subject || "",
        template_variables: normalizeTemplateVariables(template_variables),
        recipient_type: recipient_type || "customer_email",
        recipient_email: recipient_type === "custom" ? recipient_email : null,
        active: active !== undefined ? active : true,
    })

    invalidateMailerCache()

    return ok(res, { mapping }, 201)
}
