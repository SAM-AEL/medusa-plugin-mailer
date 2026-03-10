import * as fs from "fs"
import * as path from "path"

const BUNDLED_TEMPLATES_DIR = path.resolve(__dirname, "../../../../email_templates")

export function resolveTemplatesDir(): string {
    const envDir = process.env.MAILER_TEMPLATES_DIR

    if (envDir) {
        const resolved = path.isAbsolute(envDir)
            ? envDir
            : path.resolve(process.cwd(), envDir)

        if (fs.existsSync(resolved)) {
            return resolved
        }
    }

    return BUNDLED_TEMPLATES_DIR
}

export function resolveTemplatePath(templateName: string): string | null {
    if (!templateName || typeof templateName !== "string") {
        return null
    }

    const templatesDir = resolveTemplatesDir()
    const normalizedPath = path.resolve(templatesDir, templateName)
    const relativePath = path.relative(templatesDir, normalizedPath)

    if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath) ||
        path.extname(normalizedPath).toLowerCase() !== ".html"
    ) {
        return null
    }

    return normalizedPath
}

export function stripHtml(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

export function readTemplate(templateName: string): {
    html: string
    templatePath: string
    templatesDir: string
} | null {
    const templatePath = resolveTemplatePath(templateName)
    const templatesDir = resolveTemplatesDir()

    if (!templatePath || !fs.existsSync(templatePath)) {
        return null
    }

    return {
        html: fs.readFileSync(templatePath, "utf-8"),
        templatePath,
        templatesDir,
    }
}
