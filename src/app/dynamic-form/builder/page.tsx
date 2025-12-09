import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  getTemplates,
  createTemplateAction,
  deleteTemplateAction,
  cloneTemplateAction,
  TemplateListItem,
} from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Activity,
  CalendarClock,
  Copy,
  FileText,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react'
import { AppNavBar } from '@/components/navigation'

const containerCardClass = 'bg-[#e0e5ec] border-0 shadow-none rounded-3xl'
const innerCardClass =
  'bg-white border-0 rounded-3xl [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)]'

type BuilderPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>
}

type BannerMessage = {
  variant: 'success' | 'error'
  title: string
  description: string
}

const STATUS_MESSAGES: Record<string, BannerMessage> = {
  created: {
    variant: 'success',
    title: 'Template created',
    description: 'Your new template is ready for editing.',
  },
  deleted: {
    variant: 'success',
    title: 'Template deleted',
    description: 'The template and its sections were removed.',
  },
  cloned: {
    variant: 'success',
    title: 'Template cloned',
    description: 'We duplicated the template as a new draft.',
  },
}

const ERROR_MESSAGES: Record<string, BannerMessage> = {
  'invalid-template-data': {
    variant: 'error',
    title: 'Check the template details',
    description: 'Template name is required before creation.',
  },
  'missing-template-id': {
    variant: 'error',
    title: 'Unable to identify template',
    description: 'Try the action again from the templates list.',
  },
  'template-not-found': {
    variant: 'error',
    title: 'Template not found',
    description: 'The selected template no longer exists.',
  },
  'create-failed': {
    variant: 'error',
    title: 'Could not create template',
    description: 'Please try again or check the server logs for details.',
  },
  'delete-failed': {
    variant: 'error',
    title: 'Could not delete template',
    description: 'Ensure no other processes are locking this template and retry.',
  },
  'clone-failed': {
    variant: 'error',
    title: 'Could not clone template',
    description: 'We hit a problem copying the template. Try again shortly.',
  },
}

function resolveBanner(statusKey?: string, errorKey?: string): BannerMessage | null {
  if (errorKey && ERROR_MESSAGES[errorKey]) {
    return ERROR_MESSAGES[errorKey]
  }

  if (statusKey && STATUS_MESSAGES[statusKey]) {
    return STATUS_MESSAGES[statusKey]
  }

  return null
}

export const dynamic = 'force-dynamic'

export default async function BuilderLandingPage({ searchParams }: BuilderPageProps) {
  const templates = await getTemplates()
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const statusParam = Array.isArray(resolvedSearchParams?.status)
    ? resolvedSearchParams?.status[0]
    : resolvedSearchParams?.status
  const errorParam = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams?.error[0]
    : resolvedSearchParams?.error
  const bannerMessage = resolveBanner(statusParam, errorParam)

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <AppNavBar />

      <main className="container mx-auto max-w-6xl space-y-6 px-4 py-10">
        <Card className={containerCardClass}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-[#353535]">Form Builder</h1>
              <p className="text-[#6b7280]">
                Manage templates for the dynamic form system. Create new drafts or maintain existing ones.
              </p>
            </div>
          </CardContent>
        </Card>

        {bannerMessage && (
          <Card
            className={`${containerCardClass} ${
              bannerMessage.variant === 'success'
                ? 'border border-green-200/40 bg-green-50/90'
                : 'border border-red-200/40 bg-red-50/90'
            }`}
          >
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-[#1f2937]">{bannerMessage.title}</h2>
              <p className="text-sm text-[#4b5563]">{bannerMessage.description}</p>
            </CardContent>
          </Card>
        )}

        <CreateTemplateForm />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#353535]">Existing Templates</h2>
            <Badge variant="outline">Total: {templates.length}</Badge>
          </div>

          {templates.length === 0 ? (
            <Card className={`${innerCardClass} text-center`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center text-[#353535]">
                  <FileText className="h-5 w-5 text-primary" />
                  No templates yet
                </CardTitle>
                <CardDescription className="text-[#6b7280]">
                  Create your first template to start using the dynamic form builder.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function CreateTemplateForm() {
  return (
    <Card className={`${innerCardClass} max-w-3xl`}>
      <CardHeader>
        <CardTitle className="text-[#353535]">Create a new template</CardTitle>
        <CardDescription className="text-[#6b7280]">
          Set up a blank template that you can populate with sections and fields.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createTemplateAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              name="name"
              placeholder="e.g. Technology Intake Form"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              name="description"
              placeholder="Optional short summary for teammates"
              rows={3}
            />
          </div>
          <Button type="submit" className="shadow-sm">
            <Plus className="h-4 w-4" />
            Create template
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function TemplateCard({ template }: { template: TemplateListItem }) {
  const lastUpdated = formatDistanceToNow(template.updatedAt, { addSuffix: true })

  return (
    <Card className={`${innerCardClass} transition-transform hover:-translate-y-1`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl text-[#353535]">
              <FileText className="h-5 w-5 text-primary" />
              {template.name}
            </CardTitle>
            <CardDescription className="text-[#6b7280]">
              {template.description?.trim() || 'No description added yet.'}
            </CardDescription>
          </div>
          <Badge variant={template.isActive ? 'default' : 'secondary'}>
            {template.isActive ? 'Active' : 'Draft'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-[#6b7280]">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            {template._count.sections} sections
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            {template._count.submissions} submissions
          </span>
          <span className="flex items-center gap-1">
            <CalendarClock className="h-4 w-4" />
            Updated {lastUpdated}
          </span>
        </div>
        <p>Version {template.version}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" className="shadow-sm">
          <Link href={`/dynamic-form/builder/${template.id}`}>Edit</Link>
        </Button>
        <form action={cloneTemplateAction} className="inline">
          <input type="hidden" name="templateId" value={template.id} />
          <Button type="submit" variant="outline" size="sm" className="shadow-sm">
            <Copy className="h-4 w-4" />
            Clone
          </Button>
        </form>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete template?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the template and all sections. Submissions already captured will stay intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteTemplateAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <AlertDialogAction
                  type="submit"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
