import { Module } from "@medusajs/framework/utils"
import MailerModuleService from "./service"

export const MAILER_MODULE = "mailer"

export default Module(MAILER_MODULE, {
    service: MailerModuleService,
})
