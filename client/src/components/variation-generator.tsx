import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface VariationGeneratorProps {
  metaPrompt: string;
  onGenerate: (count: number) => void;
  variations: string[];
  isLoading?: boolean;
}

export function VariationGenerator({
  metaPrompt,
  onGenerate,
  variations,
  isLoading
}: VariationGeneratorProps) {
  const [count, setCount] = useState("3");

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Label className="text-lg">Generate Variations</Label>
      </div>

      <div>
        <Label>Original Meta Prompt</Label>
        <Textarea
          value={metaPrompt}
          readOnly
          className="mt-2"
        />
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label>Number of Variations</Label>
          <Select
            value={count}
            onValueChange={setCount}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 variations</SelectItem>
              <SelectItem value="3">3 variations</SelectItem>
              <SelectItem value="4">4 variations</SelectItem>
              <SelectItem value="5">5 variations</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => onGenerate(parseInt(count))}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Variations"}
        </Button>
      </div>

      {variations.length > 0 && (
        <div className="space-y-4">
          <Label>Generated Variations</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variations.map((variation, index) => (
              <Card key={index} className="p-4">
                <div className="mb-2">
                  <Label className="text-sm font-medium">Variation {index + 1}</Label>
                </div>
                <Textarea
                  value={variation}
                  readOnly
                  className="min-h-[200px] bg-secondary"
                />
              </Card>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}