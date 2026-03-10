import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
    sendEventEmailsStep,
    type SendEventEmailsStepInput,
} from "./steps/send-event-emails"

export const sendEventEmailsWorkflow = createWorkflow(
    "send-event-emails",
    (input: SendEventEmailsStepInput) => {
        const result = sendEventEmailsStep(input)

        return new WorkflowResponse(result)
    }
)
