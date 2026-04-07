import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
    buildRenderedMessage,
    createTransporter,
    getSmtpConfig,
} from "../../../../shared/mailer-runtime"
import { fail, isValidEmail, ok } from "../../../../shared/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    const body = req.body as Record<string, any>

    const { to, subject, template_name, sender_index, variables } = body

    if (!to || !template_name) {
        return fail(res, 400, "INVALID_PAYLOAD", "to and template_name are required")
    }

    if (!isValidEmail(to)) {
        return fail(res, 400, "INVALID_RECIPIENT", "to must be a valid email address")
    }

    // SMTP config from env
    const smtp = getSmtpConfig()

    if (!smtp.configured) {
        return fail(
            res,
            400,
            "SMTP_NOT_CONFIGURED",
            "SMTP is not configured. Set MAILER_SMTP_HOST, MAILER_SMTP_USER, and MAILER_SMTP_PASS env vars."
        )
    }

    // Resolve sender profile
    const idx = sender_index || 1
    const fromName = process.env[`MAILER_FROM_NAME_${idx}`] || process.env.MAILER_FROM_NAME_1 || "Mailer"
    const fromAddress = process.env[`MAILER_FROM_ADDRESS_${idx}`] || process.env.MAILER_FROM_ADDRESS_1 || smtp.user!

    const rendered = buildRenderedMessage({
        templateName: template_name,
        subject: subject || "",
        variables: variables || {},
        recipientEmail: to,
    })

    if (!rendered) {
        return fail(res, 400, "INVALID_TEMPLATE", `Template not found or invalid: ${template_name}`)
    }

    try {
        const transporter = createTransporter(smtp)
        if (!transporter) {
            return fail(res, 500, "SMTP_TRANSPORTER_ERROR", "Could not create SMTP transporter")
        }

        // Verify SMTP connection before attempting to send
        try {
            await transporter.verify()
        } catch (verifyErr: any) {
            logger.error(`[Mailer] SMTP connection failed: ${verifyErr.message}`)
            return fail(res, 500, "SMTP_VERIFY_FAILED", `SMTP connection failed: ${verifyErr.message}`)
        }

        const info: any = await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            sender: fromAddress,
            replyTo: fromAddress,
            to,
            envelope: {
                from: fromAddress,
                to: [to],
            },
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
        })

        logger.info(
            `[Mailer] Manual email sent to ${to} via ${smtp.host}:${smtp.port} (messageId: ${info.messageId}, response: ${info.response})`
        )

        return ok(res, {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
            envelope: info.envelope,
        })
    } catch (error: any) {
        logger.error(`[Mailer] Manual email error: ${error.message}`)
        return fail(res, 500, "SEND_FAILED", error.message)
    }
}
