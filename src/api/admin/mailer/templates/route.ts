import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from "fs"
import * as path from "path"
import { resolveTemplatesDir, resolveTemplatePath } from "../../../../shared/template-utils"
import { fail, ok } from "../../../../shared/http"

const BUILT_IN_VARS = ["RecipientEmail", "StoreName", "StoreURL", "SiteURL", "Subject"]

/**
 * Extract all {{ .VarName }} placeholders from an HTML template
 */
function extractVariables(html: string): string[] {
    const regex = /\{\{\s*\.(\w+)\s*\}\}/g
    const vars = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = regex.exec(html)) !== null) {
        const varName = match[1]
        // Filter out built-in variables that are automatically provided by the engine
        if (!BUILT_IN_VARS.includes(varName)) {
            vars.add(varName)
        }
    }
    return Array.from(vars).sort()
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const resolvedDir = resolveTemplatesDir()
    const envDir = process.env.MAILER_TEMPLATES_DIR
    const usingFallback = !envDir || path.resolve(
        path.isAbsolute(envDir) ? envDir : path.resolve(process.cwd(), envDir)
    ) !== resolvedDir

    try {
        if (!fs.existsSync(resolvedDir)) {
            return ok(res, {
                templates: [],
                message: "No templates directory found.",
                using_fallback: usingFallback,
            })
        }

        const files = fs.readdirSync(resolvedDir).filter((f) => f.endsWith(".html")).sort()

        // For each template, extract its variables
        const templates = files.map((filename) => {
            const filePath = resolveTemplatePath(filename) || path.join(resolvedDir, filename)
            const html = fs.readFileSync(filePath, "utf-8")
            const variables = extractVariables(html)
            return { filename, variables }
        })

        return ok(res, {
            templates,
            directory: resolvedDir,
            using_fallback: usingFallback,
            ...(usingFallback && {
                message: "Using bundled default templates. Set MAILER_TEMPLATES_DIR env var to use your own templates.",
            }),
        })
    } catch (error: any) {
        return fail(res, 500, "TEMPLATE_READ_FAILED", "Failed to load templates", {
            templates: [],
            reason: error.message,
        })
    }
}
