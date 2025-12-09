import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Hammer, Home, ArrowLeft, BookOpen } from 'lucide-react'
import { getTemplateDetail } from '../actions'
import { PreviewMode } from '@/components/form-builder/PreviewMode'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface BuilderEditorPageProps {
  params: Promise<{
    templateId: string
  }> | {
    templateId: string
  }
  searchParams?: Record<string, string | string[] | undefined>
}

const navButtonClass =
  'px-3 py-1.5 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,_-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]'

export default async function BuilderEditorPage({ params, searchParams }: BuilderEditorPageProps) {
  const resolvedParams = await params
  const template = await getTemplateDetail(resolvedParams.templateId)

  if (!template) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <nav className="bg-[#e0e5ec] border-0 shadow-none">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-4 max-w-6xl">
          <div className="flex items-center gap-2">
            <Link href="/" className={navButtonClass}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
            <Link href="/dynamic-form" className={navButtonClass}>
              <FileText className="mr-2 h-4 w-4" />
              Dynamic Form
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dynamic-form/builder" className={navButtonClass}>
              <Hammer className="mr-2 h-4 w-4" />
              All Templates
            </Link>
            <Link href="/dynamic-form/library" className={navButtonClass}>
              <BookOpen className="mr-2 h-4 w-4" />
              Library
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-2 text-sm text-[#6b7280]">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dynamic-form/builder" className="hover:text-[#353535]">
              Templates
            </Link>
            <span>/</span>
            <span className="truncate font-medium text-[#353535]" title={template.name}>
              {template.name}
            </span>
          </div>
          <Button asChild variant="outline" size="sm" className="shadow-sm">
            <Link href="/dynamic-form/builder" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to templates
            </Link>
          </Button>
        </div>

        <PreviewMode initialTemplate={template} searchParams={searchParams} />
      </div>
    </div>
  )
}
