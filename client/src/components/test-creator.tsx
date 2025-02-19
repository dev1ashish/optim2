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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Upload, Trash2, Edit2 } from "lucide-react";
import { z } from "zod";

// Define schema for test cases including criteria
const testCaseSchema = z.object({
  input: z.string().min(1, "Test input is required"),
  criteria: z.record(z.number().min(0).max(1)).default({})
});

type TestCase = z.infer<typeof testCaseSchema>;

interface TestCreatorProps {
  onAddTest: (test: TestCase) => void;
  onGenerateTests: () => Promise<void>;
  testCases: TestCase[];
  onRemoveTest: (index: number) => void;
  onUpdateTest: (index: number, test: TestCase) => void;
  isGenerating: boolean;
}

export function TestCreator({ 
  onAddTest,
  onGenerateTests,
  testCases,
  onRemoveTest,
  onUpdateTest,
  isGenerating
}: TestCreatorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const form = useForm<TestCase>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: {
      input: "",
      criteria: {}
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
            criteria: {}
          };
          onAddTest(testCase);
        });
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card className="p-6 space-y-6 bg-card">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">Test Cases</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onGenerateTests()}
            disabled={isGenerating}
            className="hover:bg-primary/20"
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
              className="hover:bg-primary/20"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Test Cases
            </Button>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="input"
            render={({ field }) => (
              <FormItem>
                <Label>Test Case Input</Label>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter a test case..."
                    className="bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
            {editingIndex !== null ? "Update Test Case" : "Add Test Case"}
          </Button>
        </form>
      </Form>

      {testCases.length > 0 && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Input</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testCases.map((test, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">{test.input}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          form.reset(test);
                          setEditingIndex(index);
                        }}
                        className="hover:bg-primary/20"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveTest(index)}
                        className="hover:bg-primary/20"
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