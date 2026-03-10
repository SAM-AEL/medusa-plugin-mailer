import { MedusaService } from "@medusajs/framework/utils"
import MailerEventMapping from "./models/mailer_event_mapping"

class MailerModuleService extends MedusaService({
    MailerEventMapping,
}) { }

export default MailerModuleService
