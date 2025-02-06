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
import { testCaseSchema, type TestCase } from "@shared/schema";

interface TestCreatorProps {
  onAddTest: (test: TestCase) => void;
  testCases: TestCase[];
}

export function TestCreator({ onAddTest, testCases }: TestCreatorProps) {
  const [criteria, setCriteria] = useState<string[]>([
    "Clarity",
    "Relevance",
    "Completeness"
  ]);
  const [newCriterion, setNewCriterion] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TestCase>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: {
      input: "",
      criteria: Object.fromEntries(criteria.map(c => [c, 0]))
    }
  });

  const onSubmit = (data: TestCase) => {
    onAddTest(data);
    reset();
  };

  const addCriterion = () => {
    if (newCriterion && !criteria.includes(newCriterion)) {
      setCriteria([...criteria, newCriterion]);
      setNewCriterion("");
    }
  };

  return (
    <Card className="p-6 space-y-6">
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
            Add Criterion
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Test Input</Label>
            <Textarea
              {...register("input")}
              placeholder="Enter a test case..."
              className="mt-2"
            />
            {errors.input && (
              <p className="text-sm text-red-500 mt-1">{errors.input.message}</p>
            )}
          </div>

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
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      {...register(`criteria.${criterion}` as any)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button type="submit">Add Test Case</Button>
        </form>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Test Cases</h3>
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
    </Card>
  );
}
