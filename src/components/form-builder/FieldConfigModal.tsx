"use client"

import { ChangeEvent, useEffect, useMemo, useState, useTransition } from 'react'
import { FieldType } from '@prisma/client'
import { TemplateDetail, updateField, FieldUpdateInput } from '@/app/dynamic-form/builder/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MAX_DROPDOWN_OPTIONS, MAX_DATA_TABLE_COLUMNS, MAX_DATA_TABLE_ROWS } from '@/lib/form-builder/builder-limits'
import { FieldTypeIcon } from './FieldTypeIcon'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { parseRepeatableGroupConfig } from '@/lib/form-engine/json-utils'

interface FieldConfigModalProps {
  field: TemplateDetail['sections'][number]['questions'][number]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface OptionState {
  id?: string
  label: string
  value: string
  key: string
}

type TableColumnType = 'text' | 'textarea' | 'number' | 'checkbox'

interface TableColumnState {
  id: string
  label: string
  key: string
  type: TableColumnType
  required: boolean
}

interface SelectorRowState {
  id: string
  label: string
}

const COLUMN_TYPE_OPTIONS: Array<{ value: TableColumnType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Paragraph' },
  { value: 'number', label: 'Number' },
]

const selectionTypes = new Set<FieldType>([
  FieldType.SINGLE_SELECT,
  FieldType.CHECKBOX_GROUP,
  FieldType.MULTI_SELECT,
])

const DEFAULT_SELECTOR_ROW_COUNT = 3

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)+/g, '')

const newOption = (): OptionState => ({
  key: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
  label: '',
  value: '',
})

const createColumnState = (label: string, existing: TableColumnState[] = []): TableColumnState => {
  const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
  const baseKey = slugify(label || `column_${existing.length + 1}`)
  return {
    id,
    label,
    key: ensureUniqueColumnKey(baseKey, existing, id),
    type: 'text',
    required: false,
  }
}

function ensureUniqueColumnKey(baseKey: string, columns: TableColumnState[], currentId?: string) {
  const sanitized = baseKey || 'column'
  const usedKeys = new Set(columns.filter((col) => col.id !== currentId).map((col) => col.key))
  if (!usedKeys.has(sanitized)) {
    return sanitized
  }

  let counter = 2
  let candidate = `${sanitized}_${counter}`
  while (usedKeys.has(candidate)) {
    counter += 1
    candidate = `${sanitized}_${counter}`
  }
  return candidate
}

export function FieldConfigModal({ field, open, onOpenChange, onSaved }: FieldConfigModalProps) {
  const [labelValue, setLabelValue] = useState(field.label)
  const [helpTextValue, setHelpTextValue] = useState(field.helpText ?? '')
  const [placeholderValue, setPlaceholderValue] = useState(field.placeholder ?? '')
  const [isRequired, setIsRequired] = useState(field.isRequired)
  const [options, setOptions] = useState<OptionState[]>([])
  const [tableColumns, setTableColumns] = useState<TableColumnState[]>([])
  const [tableMinRows, setTableMinRows] = useState<string>('0')
  const [tableMaxRows, setTableMaxRows] = useState<string>('')
  const [selectorRows, setSelectorRows] = useState<SelectorRowState[]>([])
  const [selectorRowHeader, setSelectorRowHeader] = useState('Stakeholder')
  const [selectorIncludeLabel, setSelectorIncludeLabel] = useState('Include?')
  const [selectorNoteLabel, setSelectorNoteLabel] = useState('How do they benefit?')
  const [requireNoteOnSelect, setRequireNoteOnSelect] = useState(true)
  const [pending, startTransition] = useTransition()

  const supportsOptions = useMemo(() => selectionTypes.has(field.type), [field.type])
  const isDataTable = field.type === FieldType.REPEATABLE_GROUP
  const isSelectorDataTable = field.type === FieldType.DATA_TABLE_SELECTOR

  useEffect(() => {
    if (!open) return

    setLabelValue(field.label)
    setHelpTextValue(field.helpText ?? '')
    setPlaceholderValue(field.placeholder ?? '')
    setIsRequired(field.isRequired)

    if (supportsOptions) {
      const nextOptions = field.options.length > 0
        ? field.options
            .sort((a, b) => a.order - b.order)
            .map((option) => ({
              id: option.id,
              label: option.label,
              value: option.value,
              key: option.id,
            }))
        : [newOption()]
      setOptions(nextOptions)
    } else {
      setOptions([])
    }

    if (isDataTable) {
      const parsedConfig = parseRepeatableGroupConfig(field.repeatableConfig)
      if (parsedConfig) {
        const nextColumns: TableColumnState[] = []
        parsedConfig.columns.forEach((column, index) => {
          const id = crypto.randomUUID?.() ?? `${column.key}-${index}`
          const baseKey = slugify(column.key || column.label || `column_${index + 1}`)
          const key = ensureUniqueColumnKey(baseKey, nextColumns, id)

          nextColumns.push({
            id,
            label: column.label,
            key,
            type: COLUMN_TYPE_OPTIONS.some((option) => option.value === column.type)
              ? column.type
              : 'text',
            required: Boolean(column.required),
          })
        })

        setTableColumns(nextColumns.length > 0 ? nextColumns : [createColumnState('', [])])
        setTableMinRows(
          typeof parsedConfig.minRows === 'number' ? String(parsedConfig.minRows) : '0'
        )
        setTableMaxRows(
          typeof parsedConfig.maxRows === 'number' ? String(parsedConfig.maxRows) : ''
        )
      } else {
        setTableColumns([createColumnState('', [])])
        setTableMinRows('0')
        setTableMaxRows('')
      }
    } else {
      setTableColumns([])
      setTableMinRows('0')
      setTableMaxRows('')
    }
    if (isSelectorDataTable) {
      const parsedConfig = parseRepeatableGroupConfig(field.repeatableConfig)
      if (parsedConfig?.mode === 'predefined') {
        const checkboxColumn = parsedConfig.columns.find((column) => column.type === 'checkbox')
        const noteColumn = parsedConfig.columns.find((column) => column.type !== 'checkbox')

        setSelectorIncludeLabel(checkboxColumn?.label ?? 'Include?')
        setSelectorNoteLabel(noteColumn?.label ?? 'How do they benefit?')
        setRequireNoteOnSelect(
          Boolean(
            noteColumn?.requiredWhenSelected || parsedConfig.requireOnSelect?.includes(noteColumn?.key ?? '')
          )
        )
        setSelectorRowHeader(parsedConfig.rowLabel ?? 'Stakeholder')

        if (parsedConfig.rows && parsedConfig.rows.length > 0) {
          setSelectorRows(
            parsedConfig.rows.map((row, index) => ({
              id: row.id || ensureUniqueColumnKey(`row_${index + 1}`, [], undefined),
              label: row.label,
            }))
          )
        } else {
          setSelectorRows(createDefaultSelectorRows())
        }

        // lock min/max rows to predefined length
        const totalRows = parsedConfig.rows?.length ?? DEFAULT_SELECTOR_ROW_COUNT
        setTableMinRows(String(totalRows))
        setTableMaxRows(String(totalRows))
      } else {
        setSelectorIncludeLabel('Include?')
        setSelectorNoteLabel('How do they benefit?')
        setRequireNoteOnSelect(true)
        setSelectorRowHeader('Stakeholder')
        setSelectorRows(createDefaultSelectorRows())
      }
    } else {
      setSelectorIncludeLabel('Include?')
      setSelectorNoteLabel('How do they benefit?')
      setRequireNoteOnSelect(true)
      setSelectorRowHeader('Stakeholder')
      setSelectorRows([])
    }
  }, [field, open, supportsOptions, isDataTable, isSelectorDataTable])

  const handleOptionChange = (index: number, key: keyof OptionState, value: string) => {
    setOptions((prev) => {
      const next = [...prev]
      const item = { ...next[index] }

      if (key === 'label') {
        const prevLabel = item.label
        item.label = value
        const prevSlug = slugify(prevLabel)
        const normalizedValue = (item.value ?? '').replace(/-/g, '_')
        if (!item.value || normalizedValue === prevSlug) {
          item.value = slugify(value)
        }
      } else {
        item[key] = value
      }

      next[index] = item
      return next
    })
  }

  const handleAddOption = () => {
    setOptions((prev) => {
      if (prev.length >= MAX_DROPDOWN_OPTIONS) {
        toast.error(`Limit dropdown options to ${MAX_DROPDOWN_OPTIONS}`)
        return prev
      }
      return [...prev, newOption()]
    })
  }

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleColumnLabelChange = (id: string, value: string) => {
    setTableColumns((prev) => {
      const next = prev.map((column) => {
        if (column.id !== id) {
          return column
        }

        const baseKey = slugify(value || `column_${prev.indexOf(column) + 1}`)
        return {
          ...column,
          label: value,
          key: ensureUniqueColumnKey(baseKey, prev, id),
        }
      })

      return next
    })
  }

  const handleColumnTypeChange = (id: string, nextType: TableColumnType) => {
    setTableColumns((prev) =>
      prev.map((column) => (column.id === id ? { ...column, type: nextType } : column))
    )
  }

  const handleColumnRequiredChange = (id: string, required: boolean) => {
    setTableColumns((prev) =>
      prev.map((column) => (column.id === id ? { ...column, required } : column))
    )
  }

  const handleAddColumn = () => {
    setTableColumns((prev) => {
      if (prev.length >= MAX_DATA_TABLE_COLUMNS) {
        toast.error(`Limit data table columns to ${MAX_DATA_TABLE_COLUMNS}`)
        return prev
      }

      return [...prev, createColumnState('', prev)]
    })
  }

  const handleRemoveColumn = (id: string) => {
    setTableColumns((prev) => {
      if (prev.length <= 1) {
        toast.error('A data table needs at least one column')
        return prev
      }
      return prev.filter((column) => column.id !== id)
    })
  }

  const handleMinRowsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (value === '') {
      setTableMinRows('0')
      return
    }

    const digits = value.replace(/[^0-9]/g, '')
    if (digits === '') {
      setTableMinRows('0')
      return
    }

    const numeric = Math.min(Number.parseInt(digits, 10) || 0, MAX_DATA_TABLE_ROWS)
    setTableMinRows(String(numeric))
  }

  const createSelectorRowState = (label: string, existing: SelectorRowState[] = []): SelectorRowState => {
    const baseKey = slugify(label || `row_${existing.length + 1}`)
    const uniqueKey = ensureUniqueSelectorKey(baseKey, existing)
    return {
      id: uniqueKey,
      label,
    }
  }

  const ensureUniqueSelectorKey = (baseKey: string, rows: SelectorRowState[]): string => {
    const sanitized = baseKey || 'row'
    const used = new Set(rows.map((row) => row.id))
    if (!used.has(sanitized)) {
      return sanitized
    }

    let counter = 2
    let candidate = `${sanitized}_${counter}`
    while (used.has(candidate)) {
      counter += 1
      candidate = `${sanitized}_${counter}`
    }
    return candidate
  }

  const createDefaultSelectorRows = (): SelectorRowState[] => [
    { id: 'patients', label: 'Patients' },
    { id: 'caregivers', label: 'Caregivers' },
    { id: 'clinicians', label: 'Clinicians' },
  ]

  const handleSelectorRowLabelChange = (id: string, value: string) => {
    setSelectorRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, label: value } : row))
    )
  }

  const handleAddSelectorRow = () => {
    setSelectorRows((prev) => {
      if (prev.length >= MAX_DATA_TABLE_ROWS) {
        toast.error(`Limit data table rows to ${MAX_DATA_TABLE_ROWS}`)
        return prev
      }
      const nextRow = createSelectorRowState('', prev)
      return [...prev, nextRow]
    })
  }

  const handleRemoveSelectorRow = (id: string) => {
    setSelectorRows((prev) => {
      if (prev.length <= 1) {
        toast.error('A data table needs at least one row')
        return prev
      }
      return prev.filter((row) => row.id !== id)
    })
  }

  const handleMaxRowsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (value === '') {
      setTableMaxRows('')
      return
    }

    const digits = value.replace(/[^0-9]/g, '')
    if (digits === '') {
      setTableMaxRows('')
      return
    }

    const numeric = Math.min(Math.max(Number.parseInt(digits, 10) || 1, 1), MAX_DATA_TABLE_ROWS)
    setTableMaxRows(String(numeric))
  }

  const handleSave = () => {
    if (!labelValue.trim()) {
      toast.error('Field label is required')
      return
    }

    let optionPayload: FieldUpdateInput['options'] | undefined
    if (supportsOptions) {
      const cleanedOptions = options
        .map((option) => ({
          id: option.id,
          label: option.label.trim(),
          value: (option.value || slugify(option.label)).trim(),
        }))
        .filter((option) => option.label.length > 0)

      if (cleanedOptions.length === 0) {
        toast.error('Add at least one option for this field')
        return
      }

      optionPayload = cleanedOptions
    }

    let repeatablePayload: FieldUpdateInput['repeatableConfig'] | undefined
    if (isSelectorDataTable) {
      const usedRowIds = new Set<string>()
      const cleanedRows = selectorRows
        .map((row, index) => {
          const label = row.label.trim()
          if (!label) {
            return null
          }

          const baseId = row.id.trim() || slugify(label) || `row_${index + 1}`
          let candidateId = baseId
          let counter = 2
          while (usedRowIds.has(candidateId)) {
            candidateId = `${baseId}_${counter}`
            counter += 1
          }
          usedRowIds.add(candidateId)

          return {
            id: candidateId,
            label,
          }
        })
        .filter((row): row is { id: string; label: string } => row !== null)

      if (cleanedRows.length === 0) {
        toast.error('Add at least one stakeholder row')
        return
      }

      const includeLabel = selectorIncludeLabel.trim() || 'Include?'
      const noteLabel = selectorNoteLabel.trim() || 'How do they benefit?'
      const rowHeader = selectorRowHeader.trim() || 'Stakeholder'

      repeatablePayload = {
        mode: 'predefined',
        rowLabel: rowHeader,
        rows: cleanedRows,
        selectorColumnKey: 'include',
        requireOnSelect: requireNoteOnSelect ? ['benefit'] : [],
        columns: [
          {
            key: 'include',
            label: includeLabel,
            type: 'checkbox',
          },
          {
            key: 'benefit',
            label: noteLabel,
            type: 'textarea',
            requiredWhenSelected: requireNoteOnSelect,
          },
        ],
      }
    } else if (isDataTable) {
      const seenKeys = new Set<string>()
      const cleanedColumns = tableColumns
        .map((column, index) => {
          const label = column.label.trim()
          if (!label) {
            return null
          }

          const baseKey = slugify(column.key || label || `column_${index + 1}`)
          let keyCandidate = baseKey || `column_${index + 1}`
          let counter = 2
          while (seenKeys.has(keyCandidate)) {
            keyCandidate = `${baseKey || 'column'}_${counter}`
            counter += 1
          }
          seenKeys.add(keyCandidate)

          return {
            key: keyCandidate,
            label,
            type: column.type,
            required: column.required ?? false,
          }
        })
        .filter((column): column is NonNullable<typeof column> => column !== null)

      if (cleanedColumns.length === 0) {
        toast.error('Add at least one column with a label')
        return
      }

      if (cleanedColumns.length > MAX_DATA_TABLE_COLUMNS) {
        toast.error(`Limit data table columns to ${MAX_DATA_TABLE_COLUMNS}`)
        return
      }

      const parsedMinRows = Number.parseInt(tableMinRows, 10)
      const minRows = Number.isNaN(parsedMinRows)
        ? 0
        : Math.min(Math.max(parsedMinRows, 0), MAX_DATA_TABLE_ROWS)

      const trimmedMaxRows = tableMaxRows.trim()
      let maxRows: number | undefined
      if (trimmedMaxRows !== '') {
        const parsedMaxRows = Number.parseInt(trimmedMaxRows, 10)
        if (Number.isNaN(parsedMaxRows)) {
          toast.error('Maximum rows must be a number')
          return
        }
        maxRows = Math.min(Math.max(parsedMaxRows, 1), MAX_DATA_TABLE_ROWS)
      }

      if (typeof maxRows === 'number' && maxRows < minRows) {
        toast.error('Maximum rows must be greater than or equal to minimum rows')
        return
      }

      repeatablePayload = {
        columns: cleanedColumns,
      }

      if (minRows > 0) {
        repeatablePayload.minRows = minRows
      }

      if (typeof maxRows === 'number') {
        repeatablePayload.maxRows = maxRows
      }
    }

    startTransition(async () => {
      try {
        const result = await updateField(field.id, {
          label: labelValue.trim(),
          helpText: helpTextValue.trim() || undefined,
          placeholder: placeholderValue.trim() || undefined,
          isRequired,
          options: optionPayload,
          repeatableConfig: repeatablePayload,
        })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Field updated')
        onSaved()
      } catch (error) {
        console.error('Failed to update field', error)
        toast.error('Unable to update field')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configure field</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          <div className="flex items-center gap-3 rounded-2xl border-0 bg-[#f1f4f9] p-4 [box-shadow:inset_6px_6px_12px_rgba(163,177,198,0.2),inset_-6px_-6px_12px_rgba(255,255,255,0.85)]">
            <FieldTypeIcon type={field.type} size="md" />
            <div>
              <p className="text-sm font-semibold text-foreground">{labelValue || field.label}</p>
              <p className="text-xs text-muted-foreground capitalize">{field.type.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor={`field-label-${field.id}`}>Label</Label>
              <Input
                id={`field-label-${field.id}`}
                value={labelValue}
                onChange={(event) => setLabelValue(event.target.value)}
                placeholder="Field label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`field-help-${field.id}`}>Help text</Label>
              <Textarea
                id={`field-help-${field.id}`}
                value={helpTextValue}
                onChange={(event) => setHelpTextValue(event.target.value)}
                placeholder="Optional guidance for end users"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`field-placeholder-${field.id}`}>Placeholder</Label>
              <Input
                id={`field-placeholder-${field.id}`}
                value={placeholderValue}
                onChange={(event) => setPlaceholderValue(event.target.value)}
                placeholder="Placeholder text"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch id={`field-required-${field.id}`} checked={isRequired} onCheckedChange={setIsRequired} />
              <Label htmlFor={`field-required-${field.id}`}>Required</Label>
            </div>
          </div>

          {supportsOptions && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Options</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={options.length >= MAX_DROPDOWN_OPTIONS}
                >
                  Add option
                </Button>
              </div>
              <div className="space-y-3">
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-2 sm:px-1">
                  <span className="text-xs font-medium text-muted-foreground">Drop-down value</span>
                  <span className="text-xs font-medium text-muted-foreground">Database field</span>
                  <span className="text-xs font-medium text-muted-foreground text-right">Actions</span>
                </div>
                {options.map((option, index) => (
                  <div
                    key={option.key}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <Input
                      className="flex-1"
                      placeholder={`Option ${index + 1} label`}
                      value={option.label}
                      aria-label={`Option ${index + 1} drop-down value`}
                      onChange={(event) => handleOptionChange(index, 'label', event.target.value)}
                    />
                    <Input
                      className="flex-1 bg-muted text-muted-foreground"
                      placeholder="Value"
                      value={option.value}
                      aria-label="Database field"
                      readOnly
                      tabIndex={-1}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      disabled={options.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {options.length === 0 && (
                  <p className="text-xs text-muted-foreground">No options yet. Add at least one before saving.</p>
                )}
                {options.length >= MAX_DROPDOWN_OPTIONS && (
                  <p className="text-xs text-muted-foreground">
                    Maximum of {MAX_DROPDOWN_OPTIONS} options reached.
                  </p>
                )}
              </div>
            </div>
          )}

          {isSelectorDataTable && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="selector-row-header">Row header label</Label>
                  <Input
                    id="selector-row-header"
                    value={selectorRowHeader}
                    onChange={(event) => setSelectorRowHeader(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selector-include-label">Checkbox header</Label>
                  <Input
                    id="selector-include-label"
                    value={selectorIncludeLabel}
                    onChange={(event) => setSelectorIncludeLabel(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selector-note-label">Notes header</Label>
                  <Input
                    id="selector-note-label"
                    value={selectorNoteLabel}
                    onChange={(event) => setSelectorNoteLabel(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Stakeholder rows</h3>
                  <Button variant="outline" size="sm" onClick={handleAddSelectorRow}>
                    Add stakeholder
                  </Button>
                </div>
                {selectorRows.map((row, index) => (
                  <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <Input
                      placeholder={`Stakeholder ${index + 1}`}
                      value={row.label}
                      onChange={(event) => handleSelectorRowLabelChange(row.id, event.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSelectorRow(row.id)}
                        disabled={selectorRows.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {selectorRows.length >= MAX_DATA_TABLE_ROWS && (
                  <p className="text-xs text-muted-foreground">
                    Maximum of {MAX_DATA_TABLE_ROWS} rows reached.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="selector-require-note"
                  checked={requireNoteOnSelect}
                  onCheckedChange={(checked) => setRequireNoteOnSelect(Boolean(checked))}
                />
                <Label htmlFor="selector-require-note">Require notes when a stakeholder is selected</Label>
              </div>

              <p className="text-xs text-muted-foreground">
                Stakeholders appear in a fixed table. Users check the box for relevant entries and add a note describing the benefit.
              </p>
            </div>
          )}

          {isDataTable && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Data table structure</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddColumn}
                  disabled={tableColumns.length >= MAX_DATA_TABLE_COLUMNS}
                >
                  Add column
                </Button>
              </div>
              <div className="space-y-3">
                {tableColumns.map((column, index) => {
                  const labelId = `table-column-label-${column.id}`
                  const keyId = `table-column-key-${column.id}`
                  const typeId = `table-column-type-${column.id}`
                  const requiredId = `table-column-required-${column.id}`

                  return (
                    <div key={column.id} className="space-y-3 rounded-2xl border-0 bg-white p-5 [box-shadow:5px_5px_12px_rgba(163,177,198,0.3),-5px_-5px_12px_rgba(255,255,255,0.75)]">
                      <div className="space-y-2">
                        <Label htmlFor={labelId}>Column label</Label>
                        <Input
                          id={labelId}
                          placeholder={`Column ${index + 1} label`}
                          value={column.label}
                          onChange={(event) => handleColumnLabelChange(column.id, event.target.value)}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                        <div className="space-y-1">
                          <Label htmlFor={keyId}>Database field</Label>
                          <Input id={keyId} value={column.key} readOnly tabIndex={-1} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={typeId}>Input type</Label>
                          <Select
                            value={column.type}
                            onValueChange={(value) => handleColumnTypeChange(column.id, value as TableColumnType)}
                          >
                            <SelectTrigger id={typeId}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {COLUMN_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Required</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={requiredId}
                              checked={column.required}
                              onCheckedChange={(checked) => handleColumnRequiredChange(column.id, checked)}
                            />
                            <Label htmlFor={requiredId}>Required</Label>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveColumn(column.id)}
                            disabled={tableColumns.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {tableColumns.length >= MAX_DATA_TABLE_COLUMNS && (
                  <p className="text-xs text-muted-foreground">
                    Maximum of {MAX_DATA_TABLE_COLUMNS} columns per data table.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="data-table-min-rows">Minimum rows</Label>
                  <Input
                    id="data-table-min-rows"
                    type="number"
                    min={0}
                    max={MAX_DATA_TABLE_ROWS}
                    value={tableMinRows}
                    onChange={handleMinRowsChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Users can remove rows down to this number.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data-table-max-rows">Maximum rows</Label>
                  <Input
                    id="data-table-max-rows"
                    type="number"
                    min={1}
                    max={MAX_DATA_TABLE_ROWS}
                    value={tableMaxRows}
                    onChange={handleMaxRowsChange}
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank for unlimited rows (up to {MAX_DATA_TABLE_ROWS}).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? 'Saving…' : 'Save field'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
