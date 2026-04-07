import { model } from "@medusajs/framework/utils"

const MailerEventMapping = model.define("mailer_event_mapping", {
    id: model.id().primaryKey(),
    event_name: model.text().index("IDX_mailer_event_mapping_event_name"),
    template_name: model.text(),
    sender_index: model.number().default(1),
    subject: model.text().default(""),
    template_variables: model.json().default({}),
    recipient_type: model.text().default("customer_email"),
    recipient_email: model.text().nullable(),
    active: model.boolean().default(true),
})

export default MailerEventMapping
