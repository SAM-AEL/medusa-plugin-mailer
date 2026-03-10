import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { invalidateMailerCache } from "../../../../../subscribers/mailer-event-handler"

const MAILER_MODULE = "mailer"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    const mailerModule = req.scope.resolve(MAILER_MODULE)
    const { id } = req.params
    const body = req.body as Record<string, any>

    // Retrieve the existing mapping to merge with updates
    const [mappings] = await (mailerModule as any).listAndCountMailerEventMappings(
        { id },
        { take: 1 }
    )
    const existing = mappings?.[0]
    if (!existing) {
        return res.status(404).json({ message: "Mapping not found" })
    }

    // Merge existing data with incoming updates
    const mergedData: Record<string, any> = {
        event_name: body.event_name ?? existing.event_name,
        template_name: body.template_name ?? existing.template_name,
        sender_index: body.sender_index ?? existing.sender_index ?? 1,
        subject: body.subject ?? existing.subject ?? "",
        template_variables: body.template_variables ?? existing.template_variables ?? {},
        recipient_type: body.recipient_type ?? existing.recipient_type ?? "customer_email",
        recipient_email: (body.recipient_type ?? existing.recipient_type) === "custom"
            ? (body.recipient_email ?? existing.recipient_email)
            : null,
        active: body.active ?? existing.active,
    }

    // Workaround: MedusaJS v2 update() crashes on JSON columns with object values.
    // Delete + recreate instead.
    await (mailerModule as any).deleteMailerEventMappings(id)
    const mapping = await (mailerModule as any).createMailerEventMappings(mergedData)

    invalidateMailerCache()

    res.json({ mapping })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    const mailerModule = req.scope.resolve(MAILER_MODULE)
    const { id } = req.params

    await (mailerModule as any).deleteMailerEventMappings(id)

    invalidateMailerCache()

    res.json({ id, deleted: true })
}
