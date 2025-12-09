import { FieldType } from '@prisma/client'
import {
  Type,
  FileText,
  Hash,
  Calendar,
  List,
  ListChecks,
  CheckSquare,
  Table,
  BarChart3,
  Grid3x3,
  LucideIcon,
} from 'lucide-react'

export type FieldCategory = 'text' | 'selection' | 'date-time' | 'numeric' | 'scoring' | 'complex'

export interface FieldTypeConfig {
  label: string
  description: string
  icon: LucideIcon
  category: FieldCategory
  enabled?: boolean
  defaultProps?: Record<string, unknown>
}

export const FIELD_CATEGORY_LABELS: Record<FieldCategory, string> = {
  'text': 'Text',
  'selection': 'Selection',
  'date-time': 'Date & Time',
  'numeric': 'Numeric',
  'scoring': 'Scoring',
  'complex': 'Advanced',
}

export const FIELD_TYPE_CONFIG: Record<FieldType, FieldTypeConfig> = {
  SHORT_TEXT: {
    label: 'Short Text',
    description: 'Single line text input for short responses.',
    icon: Type,
    category: 'text',
    defaultProps: {
      placeholder: '',
      maxLength: 255,
    },
  },
  LONG_TEXT: {
    label: 'Long Text',
    description: 'Multi-line textarea suited for longer answers.',
    icon: FileText,
    category: 'text',
    defaultProps: {
      placeholder: '',
      rows: 4,
    },
  },
  INTEGER: {
    label: 'Integer',
    description: 'Whole number input with optional min/max constraints.',
    icon: Hash,
    category: 'numeric',
    defaultProps: {
      min: null,
      max: null,
      step: 1,
    },
  },
  SINGLE_SELECT: {
    label: 'Dropdown',
    description: 'Choose a single option from a dropdown list.',
    icon: List,
    category: 'selection',
  },
  MULTI_SELECT: {
    label: 'Multi-Select',
    description: 'Select multiple options from a searchable list.',
    icon: ListChecks,
    category: 'selection',
    enabled: false,
  },
  CHECKBOX_GROUP: {
    label: 'Checkbox Group',
    description: 'Display checkboxes for multi-choice selections.',
    icon: CheckSquare,
    category: 'selection',
  },
  DATE: {
    label: 'Date',
    description: 'Date picker with calendar input.',
    icon: Calendar,
    category: 'date-time',
  },
  REPEATABLE_GROUP: {
    label: 'Data Table',
    description: 'Structured rows of related fields; users can add multiple entries.',
    icon: Table,
    category: 'complex',
  },
  DATA_TABLE_SELECTOR: {
    label: 'Data Table with Selector',
    description: 'Predefined rows with checkbox selector and notes field.',
    icon: CheckSquare,
    category: 'complex',
  },
  SCORING_0_3: {
    label: 'Scoring (0-3)',
    description: 'Fixed four point scale for quick evaluations.',
    icon: BarChart3,
    category: 'scoring',
  },
  SCORING_MATRIX: {
    label: 'Scoring Matrix',
    description: 'Matrix style scoring across multiple dimensions.',
    icon: Grid3x3,
    category: 'scoring',
  },
}

const CATEGORY_ORDER: FieldCategory[] = ['text', 'selection', 'date-time', 'numeric', 'scoring', 'complex']

export function getFieldTypeConfig(type: FieldType) {
  return FIELD_TYPE_CONFIG[type]
}

export function getEnabledFieldTypes() {
  return Object.entries(FIELD_TYPE_CONFIG)
    .filter(([, config]) => config.enabled !== false)
    .map(([type]) => type as FieldType)
}

export function getFieldTypesByCategory(options: { includeDisabled?: boolean } = {}) {
  const { includeDisabled = false } = options

  return CATEGORY_ORDER.map((category) => {
    const types = (Object.entries(FIELD_TYPE_CONFIG) as Array<[FieldType, FieldTypeConfig]>)
      .filter(([, config]) => config.category === category)
      .filter(([, config]) => includeDisabled || config.enabled !== false)
      .map(([type]) => type)

    return {
      category,
      label: FIELD_CATEGORY_LABELS[category],
      types,
    }
  }).filter(({ types }) => types.length > 0)
}

export const FIELD_TYPE_LIST = Object.keys(FIELD_TYPE_CONFIG) as FieldType[]
