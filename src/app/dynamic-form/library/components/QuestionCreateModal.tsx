'use client';

import { useState, useTransition } from 'react';
import { FieldType, DataSource } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  getFieldTypesByCategory,
  FIELD_TYPE_CONFIG,
  FIELD_CATEGORY_LABELS,
} from '@/lib/form-builder/field-type-config';
import { FieldTypeIcon } from '@/components/form-builder/FieldTypeIcon';
import { cn } from '@/lib/utils';
import { createQuestion } from '../actions';

interface QuestionCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OptionState {
  id: string;
  label: string;
  value: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)+/g, '');

export function QuestionCreateModal({
  open,
  onOpenChange,
  onSuccess,
}: QuestionCreateModalProps) {
  const [step, setStep] = useState<'type' | 'metadata' | 'options'>('type');
  const [pending, startTransition] = useTransition();

  // Form state
  const [fieldType, setFieldType] = useState<FieldType | null>(null);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [helpText, setHelpText] = useState('');
  const [bindingPath, setBindingPath] = useState('');
  const [dataSource, setDataSource] = useState<DataSource>('TECHNOLOGY');
  const [options, setOptions] = useState<OptionState[]>([]);

  const categories = getFieldTypesByCategory();

  const supportsOptions =
    fieldType === 'SINGLE_SELECT' ||
    fieldType === 'MULTI_SELECT' ||
    fieldType === 'CHECKBOX_GROUP';

  const resetForm = () => {
    setStep('type');
    setFieldType(null);
    setKey('');
    setLabel('');
    setHelpText('');
    setBindingPath('');
    setDataSource('TECHNOLOGY');
    setOptions([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleTypeSelect = (type: FieldType) => {
    setFieldType(type);
    setStep('metadata');
  };

  const handleMetadataNext = () => {
    // Validate
    if (!key.trim()) {
      toast.error('Key is required');
      return;
    }
    if (!/^[a-z]+\.[a-zA-Z0-9]+$/.test(key)) {
      toast.error('Key must be in format "prefix.fieldName" (e.g., tech.myField)');
      return;
    }
    if (!label.trim()) {
      toast.error('Label is required');
      return;
    }
    if (!bindingPath.trim()) {
      toast.error('Binding path is required');
      return;
    }

    if (supportsOptions) {
      // Initialize with one empty option
      if (options.length === 0) {
        setOptions([{ id: crypto.randomUUID(), label: '', value: '' }]);
      }
      setStep('options');
    } else {
      handleSubmit();
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), label: '', value: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
  };

  const handleOptionChange = (id: string, field: 'label' | 'value', value: string) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== id) return opt;
        if (field === 'label') {
          return {
            ...opt,
            label: value,
            // Auto-generate value from label if value is empty or was auto-generated
            value: opt.value === '' || opt.value === slugify(opt.label) ? slugify(value) : opt.value,
          };
        }
        return { ...opt, [field]: value };
      })
    );
  };

  const handleSubmit = () => {
    startTransition(async () => {
      // Validate options if needed
      let cleanedOptions: Array<{ label: string; value: string }> | undefined;
      if (supportsOptions) {
        cleanedOptions = options
          .map((opt) => ({
            label: opt.label.trim(),
            value: (opt.value || slugify(opt.label)).trim(),
          }))
          .filter((opt) => opt.label.length > 0);

        if (cleanedOptions.length === 0) {
          toast.error('Add at least one option');
          return;
        }
      }

      const result = await createQuestion({
        key: key.trim(),
        label: label.trim(),
        helpText: helpText.trim() || undefined,
        bindingPath: bindingPath.trim(),
        dataSource,
        options: cleanedOptions,
      });

      if (result.success) {
        toast.success('Question created');
        handleClose();
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to create question');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' && 'Select Field Type'}
            {step === 'metadata' && 'Question Details'}
            {step === 'options' && 'Configure Options'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Field Type Selection */}
        {step === 'type' && (
          <Tabs defaultValue={categories[0]?.category ?? ''} className="mt-4">
            <TabsList className="grid grid-cols-3 gap-2 bg-transparent p-0">
              {categories.map(({ category, label }) => (
                <TabsTrigger key={category} value={category} className="w-full">
                  {FIELD_CATEGORY_LABELS[category] ?? label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(({ category, types }) => (
              <TabsContent key={category} value={category} className="mt-4">
                <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                  {types.map((type) => {
                    const config = FIELD_TYPE_CONFIG[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        className={cn(
                          'rounded-2xl border-0 bg-[#e0e5ec] p-5 text-left transition-all',
                          '[box-shadow:6px_6px_12px_rgba(163,177,198,0.35),-6px_-6px_12px_rgba(255,255,255,0.8)]',
                          'hover:[box-shadow:inset_4px_4px_8px_rgba(163,177,198,0.25),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]',
                          'focus-visible:outline-none focus-visible:ring-0'
                        )}
                        onClick={() => handleTypeSelect(type)}
                      >
                        <FieldTypeIcon type={type} size="md" />
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-semibold text-foreground">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Step 2: Metadata */}
        {step === 'metadata' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">
                Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g., tech.myField or triage.newScore"
              />
              <p className="text-xs text-muted-foreground">
                Format: prefix.fieldName (e.g., tech.techId, triage.missionAlignmentScore)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">
                Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Technology ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">Help Text</Label>
              <Textarea
                id="helpText"
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                placeholder="Optional guidance for users filling out this field"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bindingPath">
                Binding Path <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bindingPath"
                value={bindingPath}
                onChange={(e) => setBindingPath(e.target.value)}
                placeholder="e.g., technology.techId or triageStage.missionAlignmentScore"
              />
              <p className="text-xs text-muted-foreground">
                The entity field path where this value is stored
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataSource">Data Source</Label>
              <Select value={dataSource} onValueChange={(v) => setDataSource(v as DataSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                  <SelectItem value="STAGE_SUPPLEMENT">Stage Supplement</SelectItem>
                  <SelectItem value="CALCULATED">Calculated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Options */}
        {step === 'options' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Add options for this {FIELD_TYPE_CONFIG[fieldType!]?.label.toLowerCase()} field.
            </p>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <span className="w-6 text-sm text-muted-foreground">{index + 1}.</span>
                  <Input
                    value={option.label}
                    onChange={(e) => handleOptionChange(option.id, 'label', e.target.value)}
                    placeholder="Label"
                    className="flex-1"
                  />
                  <Input
                    value={option.value}
                    onChange={(e) => handleOptionChange(option.id, 'value', e.target.value)}
                    placeholder="Value (auto-generated)"
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(option.id)}
                    disabled={options.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step !== 'type' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step === 'options' ? 'metadata' : 'type')}
              disabled={pending}
            >
              Back
            </Button>
          )}
          {step === 'metadata' && (
            <Button type="button" onClick={handleMetadataNext} disabled={pending}>
              {supportsOptions ? 'Next' : pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          )}
          {step === 'options' && (
            <Button type="button" onClick={handleSubmit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
