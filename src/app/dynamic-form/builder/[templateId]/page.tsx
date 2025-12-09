import { notFound } from 'next/navigation'
import { getTemplateDetail } from '../actions'
import { TemplateEditorLayout } from '@/components/form-builder/TemplateEditorLayout'

export const dynamic = 'force-dynamic'

interface BuilderEditorPageProps {
  params: Promise<{
    templateId: string
  }> | {
    templateId: string
  }
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function BuilderEditorPage({ params, searchParams }: BuilderEditorPageProps) {
  const resolvedParams = await params
  const template = await getTemplateDetail(resolvedParams.templateId)

  if (!template) {
    notFound()
  }

  return <TemplateEditorLayout initialTemplate={template} searchParams={searchParams} />
}
