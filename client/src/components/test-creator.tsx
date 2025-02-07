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
import { Settings2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { testCaseSchema, type TestCase } from "@shared/schema";

interface TestCreatorProps {
  onAddTest: (test: TestCase) => void;
  testCases: TestCase[];
}

export function TestCreator({ onAddTest, testCases }: TestCreatorProps) {
  const [showSettings, setShowSettings] = useState(false);
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
    onAddTest(data);
    form.reset();
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

          <Button type="submit">Add Test Case</Button>
        </form>
      </Form>

      {testCases.length > 0 && (
        <div>
          <Label className="mb-4">Existing Test Cases</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Input</TableHead>
                <TableHead>Criteria</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}