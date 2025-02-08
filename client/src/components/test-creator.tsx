import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Upload, Trash2, Edit2, Plus } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { testCaseSchema, type TestCase } from "@shared/schema";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";

interface TestCreatorProps {
  onAddTest: (test: TestCase) => void;
  onGenerateTests: () => Promise<void>;
  testCases: TestCase[];
  onRemoveTest: (index: number) => void;
  onUpdateTest: (index: number, test: TestCase) => void;
  modelConfig: ModelConfig;
  onModelConfigChange: (config: ModelConfig) => void;
  defaultConfig: ModelConfig;
  useDefaultSettings: boolean;
  onUseDefaultSettingsChange: (use: boolean) => void;
  isGenerating: boolean;
}

export function TestCreator({ 
  onAddTest,
  onGenerateTests,
  testCases,
  onRemoveTest,
  onUpdateTest,
  modelConfig,
  onModelConfigChange,
  defaultConfig,
  useDefaultSettings,
  onUseDefaultSettingsChange,
  isGenerating
}: TestCreatorProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<string[]>([
    "Clarity",
    "Relevance",
    "Completeness"
  ]);
  const [newCriterion, setNewCriterion] = useState("");

  const form = useForm<TestCase>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: {
      input: "",
      criteria: Object.fromEntries(criteria.map(c => [c, 0]))
    }
  });

  const onSubmit = (data: TestCase) => {
    if (editingIndex !== null) {
      onUpdateTest(editingIndex, data);
      setEditingIndex(null);
    } else {
      onAddTest(data);
    }
    form.reset();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const testCase: TestCase = {
            input: line,
            criteria: Object.fromEntries(criteria.map(c => [c, 0.5]))
          };
          onAddTest(testCase);
        });
      };
      reader.readAsText(file);
    }
  };

  const addCriterion = () => {
    if (newCriterion && !criteria.includes(newCriterion)) {
      setCriteria([...criteria, newCriterion]);
      setNewCriterion("");
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Label className="text-lg">Test Cases</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onGenerateTests()}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Test Cases"}
          </Button>
          <div className="relative">
            <Input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Case Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <ModelSettingsSection
                  title="Test Generation Settings"
                  description="Configure the model for generating test cases"
                  config={modelConfig}
                  onChange={onModelConfigChange}
                  defaultConfig={defaultConfig}
                  useDefaultSettings={useDefaultSettings}
                  onUseDefaultSettingsChange={onUseDefaultSettingsChange}
                />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>New Criterion</Label>
                    <Input
                      value={newCriterion}
                      onChange={(e) => setNewCriterion(e.target.value)}
                      placeholder="Enter new evaluation criterion"
                    />
                  </div>
                  <Button 
                    onClick={addCriterion}
                    className="mt-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                <div>
                  <Label>Current Criteria</Label>
                  <div className="mt-2 space-y-2">
                    {criteria.map((criterion) => (
                      <div key={criterion} className="flex items-center gap-2">
                        <span>{criterion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="input"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter a test case..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Label>Criteria Weights</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterion</TableHead>
                  <TableHead>Weight (0-1)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.map((criterion) => (
                  <TableRow key={criterion}>
                    <TableCell>{criterion}</TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`criteria.${criterion}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button type="submit">
            {editingIndex !== null ? "Update Test Case" : "Add Test Case"}
          </Button>
        </form>
      </Form>

      {testCases.length > 0 && (
        <div>
          <Label className="mb-4">Test Cases</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Input</TableHead>
                <TableHead>Criteria</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testCases.map((test, index) => (
                <TableRow key={index}>
                  <TableCell>{test.input}</TableCell>
                  <TableCell>
                    {Object.entries(test.criteria).map(([key, value]) => (
                      <div key={key}>
                        {key}: {value}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          form.reset(test);
                          setEditingIndex(index);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveTest(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}