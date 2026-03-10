import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { MAILER_EVENTS } from "../shared/mailer-fields"
import { sendEventEmailsWorkflow } from "../workflows"

export function invalidateMailerCache() {}

// ─── Main event handler ────────────────────────────────────────
export default async function mailerEventHandler({
    event: { name, data },
    container,
}: SubscriberArgs<Record<string, any>>) {
    const logger = container.resolve("logger")

    try {
        await sendEventEmailsWorkflow(container).run({
            input: {
                event_name: name,
                event_data: data,
            },
        })
    } catch (error: any) {
        logger.error(`[Mailer] Subscriber workflow error for ${name}: ${error.message}`)
    }
}

export const config: SubscriberConfig = {
    event: MAILER_EVENTS,
}
