"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  type Campaign,
  type CampaignPayload,
} from "@/lib/api/campaigns"
import { mapApiError } from "@/lib/api-client"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Search, Edit, Trash2, AlertTriangle, RefreshCcw, Send, Eye } from "lucide-react"
import { formatDate } from "@/lib/utils"

type CampaignForm = {
  name: string;
  subject: string;
  preheader: string;
  content: string;
  senderName: string;
  senderEmail: string;
  audience: Campaign["audience"];
  minOrders: string;
  minSpent: string;
  inactiveDays: string;
  customerEmails: string;
  scheduledAt: string;
}

const defaultForm: CampaignForm = {
  name: "",
  subject: "",
  preheader: "",
  content: "",
  senderName: "",
  senderEmail: "",
  audience: "all",
  minOrders: "",
  minSpent: "",
  inactiveDays: "",
  customerEmails: "",
  scheduledAt: "",
}

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sending: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  sent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

function CampaignFormFields({ form, onChange }: { form: CampaignForm; onChange: (f: CampaignForm) => void }) {
  const set = (key: keyof CampaignForm, value: DynamicValue) => onChange({ ...form, [key]: value })

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Campaign Info</h3>
        <div>
          <Label htmlFor="name">Campaign Name *</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Summer Sale 2026" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subject">Email Subject *</Label>
            <Input id="subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Don't miss our summer deals!" />
          </div>
          <div>
            <Label htmlFor="preheader">Preheader</Label>
            <Input id="preheader" value={form.preheader} onChange={(e) => set("preheader", e.target.value)} placeholder="Brief preview text" />
          </div>
        </div>
        <div>
          <Label htmlFor="content">Email Content (HTML) *</Label>
          <Textarea id="content" value={form.content} onChange={(e) => set("content", e.target.value)} rows={10} placeholder="<h1>Hello!</h1><p>Your email content here...</p>" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="senderName">Sender Name</Label>
            <Input id="senderName" value={form.senderName} onChange={(e) => set("senderName", e.target.value)} placeholder="OPPS Store" />
          </div>
          <div>
            <Label htmlFor="senderEmail">Sender Email</Label>
            <Input id="senderEmail" type="email" value={form.senderEmail} onChange={(e) => set("senderEmail", e.target.value)} placeholder="noreply@opps.com" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Audience</h3>
        <div>
          <Label htmlFor="audience">Target Audience</Label>
          <Select value={form.audience} onValueChange={(v: Campaign["audience"]) => set("audience", v)}>
            <SelectTrigger id="audience"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="new_customers">New Customers</SelectItem>
              <SelectItem value="returning">Returning Customers</SelectItem>
              <SelectItem value="high_value">High Value Customers</SelectItem>
              <SelectItem value="inactive">Inactive Customers</SelectItem>
              <SelectItem value="specific">Specific Customers (email list)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.audience === "high_value" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minOrders">Minimum Orders</Label>
              <Input id="minOrders" type="number" value={form.minOrders} onChange={(e) => set("minOrders", e.target.value)} min={1} />
            </div>
            <div>
              <Label htmlFor="minSpent">Minimum Total Spent</Label>
              <Input id="minSpent" type="number" value={form.minSpent} onChange={(e) => set("minSpent", e.target.value)} min={0} />
            </div>
          </div>
        )}
        {form.audience === "inactive" && (
          <div>
            <Label htmlFor="inactiveDays">Days Since Last Order</Label>
            <Input id="inactiveDays" type="number" value={form.inactiveDays} onChange={(e) => set("inactiveDays", e.target.value)} min={1} placeholder="e.g. 30" />
          </div>
        )}
        {form.audience === "specific" && (
          <div>
            <Label htmlFor="customerEmails">Customer Emails (comma-separated)</Label>
            <Textarea id="customerEmails" value={form.customerEmails} onChange={(e) => set("customerEmails", e.target.value)} placeholder="user1@email.com, user2@email.com" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h3>
        <div>
          <Label htmlFor="scheduledAt">Schedule Send (optional)</Label>
          <Input id="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Leave empty to send immediately when triggered.</p>
        </div>
      </div>
    </div>
  )
}

function formToDto(form: CampaignForm): CampaignPayload {
  const dto: CampaignPayload = {
    name: form.name,
    subject: form.subject,
    content: form.content,
    audience: form.audience,
  }
  if (form.preheader) dto.preheader = form.preheader
  if (form.senderName) dto.senderName = form.senderName
  if (form.senderEmail) dto.senderEmail = form.senderEmail
  if (form.scheduledAt) dto.scheduledAt = new Date(form.scheduledAt).toISOString()
  if (form.minOrders) dto.minOrders = Number(form.minOrders)
  if (form.minSpent) dto.minSpent = Number(form.minSpent)
  if (form.inactiveDays) dto.inactiveDays = Number(form.inactiveDays)
  if (form.customerEmails) dto.customerEmails = form.customerEmails.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  return dto
}

function campaignToForm(c: Campaign): CampaignForm {
  return {
    name: c.name,
    subject: c.subject,
    preheader: c.preheader || "",
    content: c.content,
    senderName: c.senderName || "",
    senderEmail: c.senderEmail || "",
    audience: c.audience || "all",
    minOrders: c.minOrders ? String(c.minOrders) : "",
    minSpent: c.minSpent ? String(c.minSpent) : "",
    inactiveDays: c.inactiveDays ? String(c.inactiveDays) : "",
    customerEmails: (c.customerEmails || []).join(", "),
    scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : "",
  }
}

export default function AdminCampaignsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null)
  const [sendConfirmId, setSendConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState<CampaignForm>(defaultForm)

  const { data: campaignsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-campaigns", page],
    queryFn: () => getCampaigns({ page, limit: 20, search: search || undefined }),
  })

  const campaigns = campaignsData?.data?.items ?? []
  const pagination = campaignsData?.data?.pagination

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] })
      toast.success("Campaign deleted")
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const createMutation = useMutation({
    mutationFn: (dto: CampaignPayload) => createCampaign(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] })
      toast.success("Campaign created")
      setCreateOpen(false)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CampaignPayload }) =>
      updateCampaign(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] })
      toast.success("Campaign updated")
      setEditOpen(false)
      setEditId(null)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] })
      toast.success("Campaign sent!")
      setSendConfirmId(null)
    },
    onError: (err) => toast.error(mapApiError(err).message),
  })

  function openEdit(campaign: Campaign) {
    setEditId(campaign.id)
    setForm(campaignToForm(campaign))
    setEditOpen(true)
  }

  function openView(campaign: Campaign) {
    setViewCampaign(campaign)
    setViewOpen(true)
  }

  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: "subject",
      header: "Subject",
      render: (c) => <span className="text-sm truncate max-w-[200px] block">{c.subject}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <Badge className={statusColors[c.status]} variant="secondary">
          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "audience",
      header: "Audience",
      render: (c) => {
        const labels: Record<string, string> = {
          all: "All",
          new_customers: "New",
          returning: "Returning",
          high_value: "High Value",
          inactive: "Inactive",
          specific: "Specific",
        }
        return <span className="text-sm text-muted-foreground">{labels[c.audience] || c.audience}</span>
      },
    },
    {
      key: "sent",
      header: "Sent/Failed",
      render: (c) => (
        <span className="text-sm">
          {c.sentCount}/{c.failedCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (c) => <span className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</span>,
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (c) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openView(c)} title="View details">
            <Eye className="h-4 w-4" />
          </Button>
          {c.status === "draft" && (
            <>
              <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-green-600"
                onClick={() => setSendConfirmId(c.id)}
                title="Send now"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => {
              if (confirm("Delete this campaign?")) deleteMutation.mutate(c.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground">Create and send email campaigns to targeted audiences.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Campaign</DialogTitle>
              <DialogDescription>Create an email campaign with audience targeting.</DialogDescription>
            </DialogHeader>
            <CampaignFormFields form={form} onChange={setForm} />
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(defaultForm) }}>
                Cancel
              </Button>
              <Button onClick={() => createMutation.mutate(formToDto(form))} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>

      <DataTable
        columns={columns}
        data={campaigns}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        emptyMessage="No campaigns found."
        emptyIcon={<Send className="h-12 w-12 text-muted-foreground" />}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">{mapApiError(error).message}</p>
          <Button variant="outline" className="mt-2" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditId(null); setForm(defaultForm) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update campaign settings and content.</DialogDescription>
          </DialogHeader>
          <CampaignFormFields form={form} onChange={setForm} />
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditId(null); setForm(defaultForm) }}>Cancel</Button>
            <Button onClick={() => editId && updateMutation.mutate({ id: editId, dto: formToDto(form) })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={(open) => { setViewOpen(open); if (!open) setViewCampaign(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewCampaign?.name}</DialogTitle>
          </DialogHeader>
          {viewCampaign && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={statusColors[viewCampaign.status]} variant="secondary">
                    {viewCampaign.status.charAt(0).toUpperCase() + viewCampaign.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Audience</p>
                  <p className="font-medium capitalize">{viewCampaign.audience.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Targeted</p>
                  <p className="font-medium">{viewCampaign.targetCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sent / Failed</p>
                  <p className="font-medium">{viewCampaign.sentCount} / {viewCampaign.failedCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Opens</p>
                  <p className="font-medium">{viewCampaign.openCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clicks</p>
                  <p className="font-medium">{viewCampaign.clickCount}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Subject</p>
                <p className="font-medium">{viewCampaign.subject}</p>
              </div>
              {viewCampaign.preheader && (
                <div>
                  <p className="text-muted-foreground">Preheader</p>
                  <p className="text-muted-foreground">{viewCampaign.preheader}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">Content Preview</p>
                <div className="rounded-lg border p-4 text-sm max-h-48 overflow-y-auto bg-muted" dangerouslySetInnerHTML={{ __html: viewCampaign.content }} />
              </div>
              {viewCampaign.sentAt && (
                <p className="text-xs text-muted-foreground">Sent at {formatDate(viewCampaign.sentAt)}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <Dialog open={!!sendConfirmId} onOpenChange={(open) => { if (!open) setSendConfirmId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Campaign?</DialogTitle>
            <DialogDescription>
              This will immediately send the campaign to all targeted recipients. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendConfirmId(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => sendConfirmId && sendMutation.mutate(sendConfirmId)}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? "Sending..." : "Send Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
