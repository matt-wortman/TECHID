'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/alert-dialog';
import {
  Home,
  FileText,
  Hammer,
  ClipboardList,
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DataSource } from '@prisma/client';

import {
  getQuestionDictionary,
  deleteQuestion,
  type QuestionDictionaryEntry,
} from './actions';
import { QuestionCreateModal } from './components/QuestionCreateModal';
import { QuestionEditModal } from './components/QuestionEditModal';

function dataSourceBadgeClasses(dataSource: DataSource): string {
  switch (dataSource) {
    case 'TECHNOLOGY':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'STAGE_SUPPLEMENT':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'CALCULATED':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function dataSourceLabel(dataSource: DataSource): string {
  switch (dataSource) {
    case 'TECHNOLOGY':
      return 'Technology';
    case 'STAGE_SUPPLEMENT':
      return 'Stage';
    case 'CALCULATED':
      return 'Calculated';
    default:
      return dataSource;
  }
}

export default function QuestionLibraryPage() {
  const [questions, setQuestions] = useState<QuestionDictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataSourceFilter, setDataSourceFilter] = useState<string>('all');
  const [editingQuestion, setEditingQuestion] = useState<QuestionDictionaryEntry | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const navButtonClass = 'h-10 px-5 rounded-full text-[15px] font-medium gap-2';
  const containerCardClass = 'bg-[#e0e5ec] border-0 shadow-none rounded-3xl';
  const innerCardClass =
    'bg-white border-0 rounded-3xl [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)]';

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getQuestionDictionary();
      if (result.success && result.questions) {
        setQuestions(result.questions);
      } else {
        toast.error(result.error || 'Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('An error occurred while loading questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const handleDelete = (question: QuestionDictionaryEntry) => {
    startTransition(async () => {
      const result = await deleteQuestion(question.key);
      if (result.success) {
        toast.success(`Deleted "${question.label}"`);
        void loadQuestions();
      } else {
        toast.error(result.error || 'Failed to delete question');
      }
    });
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    void loadQuestions();
  };

  const handleEditSuccess = () => {
    setEditingQuestion(null);
    void loadQuestions();
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      searchQuery === '' ||
      q.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.label.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDataSource =
      dataSourceFilter === 'all' || q.dataSource === dataSourceFilter;

    return matchesSearch && matchesDataSource;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center">
        <div className="text-center text-[#353535]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-[#6b7280]">Loading question library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      {/* Navigation */}
      <nav className="bg-[#e0e5ec] border-0 shadow-none">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className={navButtonClass}>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form">
                  <FileText className="h-4 w-4" />
                  Dynamic Form
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/builder">
                  <Hammer className="h-4 w-4" />
                  Builder
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/submissions">
                  <ClipboardList className="h-4 w-4" />
                  Submissions
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/library">
                  <BookOpen className="h-4 w-4" />
                  Library
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Header */}
        <Card className={containerCardClass}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-[#353535]">Question Library</h1>
              <p className="text-[#6b7280]">
                Manage canonical questions for form templates. Changes create new revisions for version tracking.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Search, Filter, and Add */}
        <Card className={innerCardClass}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                  <Input
                    placeholder="Search by key or label..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={dataSourceFilter} onValueChange={setDataSourceFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                    <SelectItem value="STAGE_SUPPLEMENT">Stage</SelectItem>
                    <SelectItem value="CALCULATED">Calculated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card className={innerCardClass}>
          <CardContent className="p-0">
            {filteredQuestions.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-[#94a3b8] mx-auto" />
                <h3 className="mt-4 text-xl font-semibold text-[#353535]">
                  {questions.length === 0 ? 'No questions yet' : 'No matching questions'}
                </h3>
                <p className="mt-2 text-[#6b7280]">
                  {questions.length === 0
                    ? 'Add your first question to the library.'
                    : 'Try adjusting your search or filters.'}
                </p>
                {questions.length === 0 && (
                  <Button onClick={() => setCreateModalOpen(true)} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Key</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-[120px]">Data Source</TableHead>
                    <TableHead className="w-[80px] text-center">Usage</TableHead>
                    <TableHead className="w-[80px] text-center">Version</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-mono text-sm">{question.key}</TableCell>
                      <TableCell>{question.label}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${dataSourceBadgeClasses(question.dataSource)}`}
                        >
                          {dataSourceLabel(question.dataSource)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {question._count.formQuestions}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          v{question.currentVersion}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingQuestion(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={question._count.formQuestions > 0 || pending}
                              >
                                {pending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Question</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{question.label}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(question)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="text-center text-sm text-[#6b7280]">
          Showing {filteredQuestions.length} of {questions.length} questions
        </div>
      </div>

      {/* Create Modal */}
      <QuestionCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Modal */}
      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion}
          open={!!editingQuestion}
          onOpenChange={(open) => !open && setEditingQuestion(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
