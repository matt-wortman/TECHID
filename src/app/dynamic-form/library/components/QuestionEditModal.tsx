'use client';

import { useState, useEffect, useTransition } from 'react';
import { DataSource } from '@prisma/client';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { updateQuestion, type QuestionDictionaryEntry } from '../actions';

interface QuestionEditModalProps {
  question: QuestionDictionaryEntry;
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

export function QuestionEditModal({
  question,
  open,
  onOpenChange,
  onSuccess,
}: QuestionEditModalProps) {
  const [pending, startTransition] = useTransition();

  // Form state
  const [label, setLabel] = useState(question.label);
  const [helpText, setHelpText] = useState(question.helpText || '');
  const [bindingPath, setBindingPath] = useState(question.bindingPath);
  const [dataSource, setDataSource] = useState<DataSource>(question.dataSource);
  const [options, setOptions] = useState<OptionState[]>([]);

  // Check if question has options (from the stored JSON)
  const hasOptions = Array.isArray(question.options) && question.options.length > 0;

  // Initialize options from question data
  useEffect(() => {
    if (hasOptions) {
      const existingOptions = question.options as Array<{ label: string; value: string }>;
      setOptions(
        existingOptions.map((opt) => ({
          id: crypto.randomUUID(),
          label: opt.label,
          value: opt.value,
        }))
      );
    }
  }, [question.options, hasOptions]);

  const handleClose = () => {
    onOpenChange(false);
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
    // Validate
    if (!label.trim()) {
      toast.error('Label is required');
      return;
    }
    if (!bindingPath.trim()) {
      toast.error('Binding path is required');
      return;
    }

    startTransition(async () => {
      // Clean options if present
      let cleanedOptions: Array<{ label: string; value: string }> | null = null;
      if (hasOptions || options.length > 0) {
        cleanedOptions = options
          .map((opt) => ({
            label: opt.label.trim(),
            value: (opt.value || slugify(opt.label)).trim(),
          }))
          .filter((opt) => opt.label.length > 0);

        if (cleanedOptions.length === 0 && hasOptions) {
          toast.error('Add at least one option');
          return;
        }
      }

      const result = await updateQuestion(question.key, {
        label: label.trim(),
        helpText: helpText.trim() || null,
        bindingPath: bindingPath.trim(),
        dataSource,
        options: cleanedOptions,
      });

      if (result.success) {
        toast.success('Question updated');
        handleClose();
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to update question');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Key (read-only) */}
          <div className="space-y-2">
            <Label>Key</Label>
            <Input value={question.key} disabled className="font-mono bg-muted" />
            <p className="text-xs text-muted-foreground">Key cannot be changed after creation</p>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="edit-label">
              Label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Technology ID"
            />
          </div>

          {/* Help Text */}
          <div className="space-y-2">
            <Label htmlFor="edit-helpText">Help Text</Label>
            <Textarea
              id="edit-helpText"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Optional guidance for users filling out this field"
              rows={2}
            />
          </div>

          {/* Binding Path */}
          <div className="space-y-2">
            <Label htmlFor="edit-bindingPath">
              Binding Path <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-bindingPath"
              value={bindingPath}
              onChange={(e) => setBindingPath(e.target.value)}
              placeholder="e.g., technology.techId or triageStage.missionAlignmentScore"
            />
          </div>

          {/* Data Source */}
          <div className="space-y-2">
            <Label htmlFor="edit-dataSource">Data Source</Label>
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

          {/* Options (if applicable) */}
          {(hasOptions || options.length > 0) && (
            <div className="space-y-3">
              <Label>Options</Label>
              <div className="space-y-2">
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
                      placeholder="Value"
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

          {/* Version info */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Current version: {question.currentVersion}. Saving will create version{' '}
              {question.currentVersion + 1}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
