import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
    buildRenderedMessage,
    createTransporter,
    fetchEntityData,
    getSmtpConfig,
    resolveDataPath,
    resolveEmail,
} from "../../shared/mailer-runtime"
import { isValidEmail } from "../../shared/http"

const MAILER_MODULE = "mailer"

export type SendEventEmailsStepInput = {
    event_name: string
    event_data: Record<string, any>
}

type SendEventEmailsStepOutput = {
    sent: number
    skipped: number
}

type MappingRecord = {
    event_name: string
    template_name: string
    sender_index?: number | null
    subject?: string | null
    template_variables?: Record<string, string> | string | null
    recipient_type?: string | null
    recipient_email?: string | null
}

export const sendEventEmailsStep = createStep<
    SendEventEmailsStepInput,
    SendEventEmailsStepOutput,
    void
>(
    "send-event-emails",
    async (input: SendEventEmailsStepInput, { container }) => {
        const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const mailerModule = container.resolve(MAILER_MODULE)

        const smtp = getSmtpConfig()
        if (!smtp.configured) {
            logger.warn(`[Mailer] SMTP not configured, skipping event ${input.event_name}`)
            return new StepResponse({ sent: 0, skipped: 0 }, undefined)
        }

        const [mappings] = await (mailerModule as any).listAndCountMailerEventMappings(
            { active: true, event_name: input.event_name },
            { take: 1000 }
        )

        if (!mappings?.length) {
            return new StepResponse({ sent: 0, skipped: 0 }, undefined)
        }

        const enrichedData = await fetchEntityData(
            input.event_data,
            input.event_name,
            query,
            logger
        )

        const transporter = createTransporter(smtp)
        if (!transporter) {
            logger.warn(`[Mailer] Could not create transporter for event ${input.event_name}`)
            return new StepResponse({ sent: 0, skipped: mappings.length }, undefined)
        }

        let sent = 0
        let skipped = 0
        const safeMappings = mappings as MappingRecord[]
        const concurrency = Math.max(
            1,
            Math.min(10, Number(process.env.MAILER_SEND_CONCURRENCY || 2))
        )

        let index = 0
        const runNext = async (): Promise<void> => {
            if (index >= safeMappings.length) {
                return
            }

            const mapping = safeMappings[index++]
            const recipientEmail = resolveEmail(
                enrichedData,
                input.event_name,
                mapping.recipient_type || "customer_email",
                mapping.recipient_email
            )

            if (!recipientEmail) {
                skipped += 1
                logger.warn(
                    `[Mailer] No email found for event ${input.event_name} (recipient_type: ${mapping.recipient_type})`
                )
                return runNext()
            }

            if (!isValidEmail(recipientEmail)) {
                skipped += 1
                logger.warn(`[Mailer] Invalid recipient email for event ${input.event_name}`)
                return runNext()
            }

            let templateVars: Record<string, string> = {}
            if (mapping.template_variables) {
                if (typeof mapping.template_variables === "string") {
                    try {
                        templateVars = JSON.parse(mapping.template_variables)
                    } catch {
                        templateVars = {}
                    }
                } else {
                    templateVars = mapping.template_variables
                }
            }

            const resolvedVars: Record<string, string> = {}
            for (const [key, dataPath] of Object.entries(templateVars)) {
                resolvedVars[key] = String(
                    resolveDataPath(enrichedData, dataPath as string) ?? ""
                )
            }

            const rendered = buildRenderedMessage({
                templateName: mapping.template_name,
                subject: mapping.subject || "",
                variables: resolvedVars,
                recipientEmail,
            })

            if (!rendered) {
                skipped += 1
                logger.error(
                    `[Mailer] Template not found or invalid for event ${input.event_name}: ${mapping.template_name}`
                )
                return runNext()
            }

            const idx = mapping.sender_index || 1
            const fromName =
                process.env[`MAILER_FROM_NAME_${idx}`] ||
                process.env.MAILER_FROM_NAME_1 ||
                "Mailer"
            const fromAddress =
                process.env[`MAILER_FROM_ADDRESS_${idx}`] ||
                process.env.MAILER_FROM_ADDRESS_1 ||
                smtp.user!

            try {
                const info: any = await transporter.sendMail({
                    from: `"${fromName}" <${fromAddress}>`,
                    sender: fromAddress,
                    replyTo: fromAddress,
                    to: recipientEmail,
                    envelope: {
                        from: fromAddress,
                        to: [recipientEmail],
                    },
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text,
                })

                sent += 1
                logger.info(
                    `[Mailer] Sent "${mapping.template_name}" to ${recipientEmail} for event ${input.event_name} (messageId: ${info.messageId}, response: ${info.response})`
                )
            } catch (err: any) {
                skipped += 1
                logger.error(
                    `[Mailer] Error sending email for event ${input.event_name}: ${err.message}`
                )
            } finally {
                await runNext()
            }
        }

        await Promise.all(
            Array.from({ length: Math.min(concurrency, safeMappings.length) }, () => runNext())
        )

        return new StepResponse({ sent, skipped }, undefined)
    }
)
