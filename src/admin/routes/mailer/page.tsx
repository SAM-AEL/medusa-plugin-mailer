declare const __BACKEND_URL__: string | undefined

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EnvelopeSolid, EllipsisHorizontal } from "@medusajs/icons"
import { Container, Heading, Button, Input, Label, Switch, Table, Badge, Text, Select, Toaster, toast, FocusModal } from "@medusajs/ui"
import { useState, useEffect, useCallback } from "react"
import { getSuggestedDataPathsForEvent, MAILER_EVENTS } from "../../../shared/mailer-fields"

const BACKEND_URL = __BACKEND_URL__ ?? ""

async function api(path: string, options?: RequestInit) {
    const res = await fetch(`${BACKEND_URL}/admin/mailer${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    })
    return res.json()
}

// ─── Configuration Section ─────────────────────────────────────
function ConfigSection() {
    const [loading, setLoading] = useState(true)
    const [smtp, setSmtp] = useState<any>(null)
    const [senders, setSenders] = useState<any[]>([])

    const loadConfig = useCallback(async () => {
        setLoading(true)
        const data = await api("/config")
        setSmtp(data.smtp || null)
        setSenders(data.senders || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadConfig() }, [loadConfig])

    if (loading) return <Text>Loading configuration...</Text>

    return (
        <Container className="p-6">
            <Heading level="h2" className="mb-4">SMTP Configuration</Heading>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <Label>Host</Label>
                    <Text size="small" className="text-ui-fg-muted mt-1">
                        {smtp?.host || <span className="text-ui-fg-disabled">Not set</span>}
                    </Text>
                </div>
                <div>
                    <Label>Port</Label>
                    <Text size="small" className="text-ui-fg-muted mt-1">
                        {smtp?.port || <span className="text-ui-fg-disabled">Not set</span>}
                    </Text>
                </div>
                <div>
                    <Label>User</Label>
                    <Text size="small" className="text-ui-fg-muted mt-1">
                        {smtp?.user || <span className="text-ui-fg-disabled">Not set</span>}
                    </Text>
                </div>
                <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                        <Badge color={smtp?.configured ? "green" : "red"}>
                            {smtp?.configured ? "Configured" : "Not Configured"}
                        </Badge>
                    </div>
                </div>
            </div>

            {senders.length > 0 && (
                <>
                    <Heading level="h3" className="mb-2 mt-4">Sender Profiles</Heading>
                    <Table>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>#</Table.HeaderCell>
                                <Table.HeaderCell>Name</Table.HeaderCell>
                                <Table.HeaderCell>Address</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {senders.map((s: any) => (
                                <Table.Row key={s.index}>
                                    <Table.Cell><Badge>{s.index}</Badge></Table.Cell>
                                    <Table.Cell>{s.name}</Table.Cell>
                                    <Table.Cell>{s.address}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                </>
            )}
        </Container>
    )
}

// ─── Event Mappings Section ─────────────────────────────────────
const RECIPIENT_OPTIONS = [
    { value: "customer_email", label: "Customer email" },
    { value: "order_email", label: "Order email" },
    { value: "custom", label: "Custom email address" },
]

function formatFieldLabel(path: string) {
    return path
        .split(".")
        .map((part) => part.replace(/_/g, " "))
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" -> ")
}

type TemplateInfo = { filename: string; variables: string[] }
type TemplateVar = { name: string; path: string }
const EMPTY_VAR: TemplateVar = { name: "", path: "" }
const MAX_VARS = 10

function MappingsSection() {
    const [mappings, setMappings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [templateVars, setTemplateVars] = useState<TemplateVar[]>([{ ...EMPTY_VAR }])
    const [templates, setTemplates] = useState<TemplateInfo[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(false)
    const [senders, setSenders] = useState<any[]>([])
    const [form, setForm] = useState({
        event_name: MAILER_EVENTS[0],
        template_name: "",
        sender_index: 1,
        subject: "",
        recipient_type: "customer_email",
        recipient_email: "",
        active: true,
    })

    const loadMappings = useCallback(async () => {
        setLoading(true)
        const data = await api("/mappings")
        setMappings(data.mappings || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadMappings() }, [loadMappings])

    // Fetch templates + senders when form opens
    useEffect(() => {
        if (showForm && templates.length === 0) {
            setLoadingTemplates(true)
            api("/templates").then((data) => {
                setTemplates(data.templates || [])
                setLoadingTemplates(false)
            }).catch(() => setLoadingTemplates(false))
        }
        if (showForm && senders.length === 0) {
            api("/config").then((data) => {
                setSenders(data.senders || [])
            })
        }
    }, [showForm])

    // Auto-populate template variables when a template is selected (only when NOT editing)
    const onTemplateSelect = (filename: string) => {
        setForm((prev) => ({ ...prev, template_name: filename }))
        if (!editingId) {
            const tpl = templates.find((t) => t.filename === filename)
            if (tpl && tpl.variables.length > 0) {
                setTemplateVars(tpl.variables.map((v) => ({ name: v, path: "" })))
            }
        }
    }

    const resetForm = () => {
        setForm({
            event_name: MAILER_EVENTS[0], template_name: "", sender_index: 1,
            subject: "", recipient_type: "customer_email", recipient_email: "", active: true,
        })
        setTemplateVars([{ ...EMPTY_VAR }])
        setEditingId(null)
        setShowForm(false)
    }

    const updateVar = (index: number, field: keyof TemplateVar, value: string) => {
        setTemplateVars((prev) => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
    }
    const addVar = () => {
        if (templateVars.length < MAX_VARS) setTemplateVars((prev) => [...prev, { ...EMPTY_VAR }])
    }
    const removeVar = (index: number) => {
        setTemplateVars((prev) => prev.length <= 1 ? [{ ...EMPTY_VAR }] : prev.filter((_, i) => i !== index))
    }

    const saveMapping = async () => {
        const variables: Record<string, string> = {}
        templateVars.forEach((v, i) => {
            const name = v.name.trim() || String(i + 1)
            if (v.path.trim()) variables[name] = v.path.trim()
        })

        const payload = { ...form, template_variables: variables }

        if (editingId) {
            await api(`/mappings/${editingId}`, { method: "POST", body: JSON.stringify(payload) })
            toast.success("Mapping updated")
        } else {
            await api("/mappings", { method: "POST", body: JSON.stringify(payload) })
            toast.success("Mapping created")
        }

        resetForm()
        await loadMappings()
    }

    const deleteMapping = async (id: string) => {
        await api(`/mappings/${id}`, { method: "DELETE" })
        toast.success("Mapping deleted")
        await loadMappings()
    }

    const editMapping = (m: any) => {
        let vars: Record<string, string> = {}
        if (m.template_variables) {
            if (typeof m.template_variables === "string") {
                try { vars = JSON.parse(m.template_variables) } catch { /* ignore */ }
            } else {
                vars = m.template_variables
            }
        }
        const rows: TemplateVar[] = Object.entries(vars).map(([name, path]) => ({ name, path: path as string }))
        setTemplateVars(rows.length > 0 ? rows : [{ ...EMPTY_VAR }])
        setForm({
            event_name: m.event_name,
            template_name: m.template_name,
            sender_index: m.sender_index || 1,
            subject: m.subject || "",
            recipient_type: m.recipient_type || "customer_email",
            recipient_email: m.recipient_email || "",
            active: m.active,
        })
        setEditingId(m.id)
        setShowForm(true)
    }

    const recipientLabel = (type: string, email?: string) => {
        const opt = RECIPIENT_OPTIONS.find((o) => o.value === type)
        if (type === "custom" && email) return `Custom: ${email}`
        return opt?.label || type
    }

    const senderLabel = (index: number) => {
        const s = senders.find((s) => s.index === index)
        return s ? `${s.name} <${s.address}>` : `Profile #${index}`
    }

    return (
        <Container className="p-6">
            <div className="flex items-center justify-between mb-4">
                <Heading level="h2">Event → Template Mappings</Heading>
                <Button variant="secondary" onClick={() => { resetForm(); setShowForm(!showForm) }}>
                    {showForm ? "Cancel" : "Add Mapping"}
                </Button>
            </div>

            {showForm && (
                <div className="border rounded-lg p-4 mb-4 bg-ui-bg-subtle">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="event-name">Medusa Event</Label>
                            <Input
                                id="event-name"
                                list="medusa-events-list"
                                placeholder="Select or type a custom event..."
                                value={form.event_name}
                                onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                            />
                            <datalist id="medusa-events-list">
                                {MAILER_EVENTS.map((e) => (
                                    <option key={e} value={e} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <Label htmlFor="tpl-name">Email Template</Label>
                            {templates.length > 0 ? (
                                <Select value={form.template_name} onValueChange={onTemplateSelect}>
                                    <Select.Trigger>
                                        <Select.Value placeholder={loadingTemplates ? "Loading..." : "Select a template"} />
                                    </Select.Trigger>
                                    <Select.Content>
                                        {templates.map((t) => (
                                            <Select.Item key={t.filename} value={t.filename}>
                                                {t.filename} ({t.variables.length} vars)
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select>
                            ) : (
                                <Input
                                    id="tpl-name"
                                    placeholder={loadingTemplates ? "Loading templates..." : "e.g. order_confirmation.html"}
                                    value={form.template_name}
                                    onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                                />
                            )}
                            {!loadingTemplates && templates.length === 0 && (
                                <Text size="small" className="text-ui-fg-muted mt-1">
                                    Set MAILER_TEMPLATES_DIR env var and add .html templates
                                </Text>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                placeholder="e.g. Order {{ .display_id }} Confirmed"
                                value={form.subject}
                                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            />
                            <Text size="small" className="text-ui-fg-muted mt-1">
                                Supports {"{{ .VarName }}"} placeholders
                            </Text>
                        </div>
                        <div>
                            <Label htmlFor="sender-profile">Sender Profile</Label>
                            <Select value={String(form.sender_index)} onValueChange={(val) => setForm({ ...form, sender_index: Number(val) })}>
                                <Select.Trigger>
                                    <Select.Value placeholder="Select sender" />
                                </Select.Trigger>
                                <Select.Content>
                                    {(senders.length > 0 ? senders : [{ index: 1, name: "Default", address: "" }]).map((s: any) => (
                                        <Select.Item key={s.index} value={String(s.index)}>
                                            {s.name}{s.address ? ` <${s.address}>` : ""}
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="recipient-type">Send To</Label>
                            <Select value={form.recipient_type} onValueChange={(val) => setForm({ ...form, recipient_type: val })}>
                                <Select.Trigger>
                                    <Select.Value placeholder="Select recipient" />
                                </Select.Trigger>
                                <Select.Content>
                                    {RECIPIENT_OPTIONS.map((opt) => (
                                        <Select.Item key={opt.value} value={opt.value}>{opt.label}</Select.Item>
                                    ))}
                                </Select.Content>
                            </Select>
                        </div>
                        {form.recipient_type === "custom" && (
                            <div>
                                <Label htmlFor="recipient-email">Custom Email</Label>
                                <Input
                                    id="recipient-email"
                                    placeholder="e.g. admin@example.com"
                                    value={form.recipient_email}
                                    onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                                />
                            </div>
                        )}
                        <div className="flex items-end gap-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="mapping-active">Active</Label>
                                <Switch
                                    id="mapping-active"
                                    checked={form.active}
                                    onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label>Template Variables</Label>
                            {templateVars.length < MAX_VARS && (
                                <Button variant="secondary" size="small" onClick={addVar}>
                                    + Add Variable
                                </Button>
                            )}
                        </div>
                        <Text size="small" className="text-ui-fg-muted mb-2">
                            Map variable names (used as {"{{ .Name }}"} in template) to order/customer data paths.
                        </Text>
                        <div className="flex flex-col gap-2">
                            {templateVars.map((v, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-32 flex-shrink-0">
                                        <Input
                                            placeholder={`var_${i + 1}`}
                                            value={v.name}
                                            onChange={(e) => updateVar(i, "name", e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            list="event-data-paths"
                                            placeholder="Select or type a data path..."
                                            value={v.path}
                                            onChange={(e) => updateVar(i, "path", e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="small"
                                        onClick={() => removeVar(i)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <datalist id="event-data-paths">
                            {getSuggestedDataPathsForEvent(form.event_name).map((path) => (
                                <option key={path} value={path} label={formatFieldLabel(path)} />
                            ))}
                        </datalist>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <Button onClick={saveMapping}>
                            {editingId ? "Update Mapping" : "Create Mapping"}
                        </Button>
                    </div>
                </div>
            )}

            {loading ? (
                <Text>Loading mappings...</Text>
            ) : mappings.length === 0 ? (
                <Text className="text-ui-fg-muted">No event mappings configured. Add one to get started.</Text>
            ) : (
                <Table>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>Event</Table.HeaderCell>
                            <Table.HeaderCell>Template</Table.HeaderCell>
                            <Table.HeaderCell>Subject</Table.HeaderCell>
                            <Table.HeaderCell>Sender</Table.HeaderCell>
                            <Table.HeaderCell>Send To</Table.HeaderCell>
                            <Table.HeaderCell>Status</Table.HeaderCell>
                            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {mappings.map((m: any) => (
                            <Table.Row key={m.id}>
                                <Table.Cell>
                                    <Badge color="blue">{m.event_name}</Badge>
                                </Table.Cell>
                                <Table.Cell>{m.template_name}</Table.Cell>
                                <Table.Cell>
                                    <Text size="small">{m.subject || "—"}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge>#{m.sender_index || 1}</Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <Text size="small">{recipientLabel(m.recipient_type, m.recipient_email)}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge color={m.active ? "green" : "grey"}>
                                        {m.active ? "Active" : "Inactive"}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="secondary" size="small" onClick={() => editMapping(m)}>
                                            Edit
                                        </Button>
                                        <Button variant="danger" size="small" onClick={() => deleteMapping(m.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            )}
        </Container>
    )
}

// ─── Manual Send Modal ─────────────────────────────────────────
type ManualVar = { name: string; value: string }
const EMPTY_MANUAL_VAR: ManualVar = { name: "", value: "" }
const MAX_MANUAL_VARS = 10

function SendEmailModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [sending, setSending] = useState(false)
    const [templates, setTemplates] = useState<TemplateInfo[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(false)
    const [senders, setSenders] = useState<any[]>([])
    const [manualVars, setManualVars] = useState<ManualVar[]>([{ ...EMPTY_MANUAL_VAR }])
    const [form, setForm] = useState({
        to: "",
        subject: "",
        template_name: "",
        sender_index: 1,
    })

    const updateManualVar = (index: number, field: keyof ManualVar, value: string) => {
        setManualVars((prev) => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
    }
    const addManualVar = () => {
        if (manualVars.length < MAX_MANUAL_VARS) setManualVars((prev) => [...prev, { ...EMPTY_MANUAL_VAR }])
    }
    const removeManualVar = (index: number) => {
        setManualVars((prev) => prev.length <= 1 ? [{ ...EMPTY_MANUAL_VAR }] : prev.filter((_, i) => i !== index))
    }

    // Auto-populate variables when a template is selected in send modal
    const onModalTemplateSelect = (filename: string) => {
        setForm((prev) => ({ ...prev, template_name: filename }))
        const tpl = templates.find((t) => t.filename === filename)
        if (tpl && tpl.variables.length > 0) {
            setManualVars(tpl.variables.map((v) => ({ name: v, value: "" })))
        }
    }

    useEffect(() => {
        if (open) {
            setLoadingTemplates(true)
            Promise.all([
                api("/templates"),
                api("/config"),
            ]).then(([tplData, cfgData]) => {
                setTemplates(tplData.templates || [])
                setSenders(cfgData.senders || [])
                setLoadingTemplates(false)
            }).catch(() => setLoadingTemplates(false))
        }
    }, [open])

    const sendEmail = async () => {
        if (!form.to || !form.template_name) {
            toast.error("Email address and template are required")
            return
        }
        setSending(true)

        const variables: Record<string, string> = {}
        manualVars.forEach((v, i) => {
            const name = v.name.trim() || String(i + 1)
            if (v.value.trim()) variables[name] = v.value.trim()
        })

        const result = await api("/send", {
            method: "POST",
            body: JSON.stringify({ ...form, variables }),
        })

        if (result.success) {
            toast.success("Email sent!")
        } else {
            toast.error(`Failed: ${result.error || "Unknown error"}`)
        }
        setSending(false)
    }

    return (
        <FocusModal open={open} onOpenChange={onOpenChange}>
            <FocusModal.Content>
                <FocusModal.Header>
                    <FocusModal.Title>Send Email</FocusModal.Title>
                </FocusModal.Header>
                <FocusModal.Body className="p-6">
                    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                        <Text className="text-ui-fg-muted">
                            Send a manual email using an HTML template.
                        </Text>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="manual-to">To Email</Label>
                                <Input
                                    id="manual-to"
                                    placeholder="e.g. customer@example.com"
                                    value={form.to}
                                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="manual-subject">Subject</Label>
                                <Input
                                    id="manual-subject"
                                    placeholder="e.g. Your order confirmation"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="manual-tpl">Template</Label>
                                {templates.length > 0 ? (
                                    <Select value={form.template_name} onValueChange={onModalTemplateSelect}>
                                        <Select.Trigger>
                                            <Select.Value placeholder={loadingTemplates ? "Loading..." : "Select a template"} />
                                        </Select.Trigger>
                                        <Select.Content>
                                            {templates.map((t) => (
                                                <Select.Item key={t.filename} value={t.filename}>
                                                    {t.filename} ({t.variables.length} vars)
                                                </Select.Item>
                                            ))}
                                        </Select.Content>
                                    </Select>
                                ) : (
                                    <Input
                                        id="manual-tpl"
                                        placeholder={loadingTemplates ? "Loading..." : "e.g. welcome.html"}
                                        value={form.template_name}
                                        onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                                    />
                                )}
                            </div>
                            <div>
                                <Label htmlFor="manual-sender">Sender Profile</Label>
                                <Select value={String(form.sender_index)} onValueChange={(val) => setForm({ ...form, sender_index: Number(val) })}>
                                    <Select.Trigger>
                                        <Select.Value placeholder="Select sender" />
                                    </Select.Trigger>
                                    <Select.Content>
                                        {(senders.length > 0 ? senders : [{ index: 1, name: "Default", address: "" }]).map((s: any) => (
                                            <Select.Item key={s.index} value={String(s.index)}>
                                                {s.name}{s.address ? ` <${s.address}>` : ""}
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select>
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="flex items-center justify-between mb-2">
                                <Label>Template Variables</Label>
                                {manualVars.length < MAX_MANUAL_VARS && (
                                    <Button variant="secondary" size="small" onClick={addManualVar}>
                                        + Add Variable
                                    </Button>
                                )}
                            </div>
                            <Text size="small" className="text-ui-fg-muted mb-2">
                                Add variable names and values. Names are used as {"{{ .Name }}"} placeholders in the template.
                            </Text>
                            <div className="flex flex-col gap-2">
                                {manualVars.map((v, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-32 flex-shrink-0">
                                            <Input
                                                placeholder={`var_${i + 1}`}
                                                value={v.name}
                                                onChange={(e) => updateManualVar(i, "name", e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Variable value..."
                                                value={v.value}
                                                onChange={(e) => updateManualVar(i, "value", e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="small"
                                            onClick={() => removeManualVar(i)}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={sendEmail} isLoading={sending}>
                                Send Email
                            </Button>
                        </div>
                    </div>
                </FocusModal.Body>
            </FocusModal.Content>
        </FocusModal>
    )
}

// ─── Main Page ─────────────────────────────────────────────────
const MailerPage = () => {
    const [sendOpen, setSendOpen] = useState(false)

    return (
        <div className="flex flex-col gap-4">
            <Toaster />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <EnvelopeSolid />
                    <Heading level="h1">Email Mailer</Heading>
                </div>
                <Button variant="secondary" onClick={() => setSendOpen(true)}>
                    Send Email
                </Button>
            </div>
            <ConfigSection />
            <MappingsSection />
            <SendEmailModal open={sendOpen} onOpenChange={setSendOpen} />
        </div>
    )
}

export const config = defineRouteConfig({
    label: "Mailer",
    icon: EnvelopeSolid,
})

export default MailerPage
