import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TestCase } from "@shared/schema";

interface TestCasesDisplayProps {
  testCases: TestCase[];
}

export function TestCasesDisplay({ testCases }: TestCasesDisplayProps) {
  return (
    <Card className="p-6 space-y-4">
      <Label className="text-lg">Generated Test Cases</Label>
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
              <TableCell className="whitespace-pre-wrap">{test.input}</TableCell>
              <TableCell>
                {Object.entries(test.criteria).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span>{key}:</span>
                    <span className="font-medium">{value.toFixed(2)}</span>
                  </div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
