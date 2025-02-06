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

      <div className="space-y-4">
        <Label>Generated Variations</Label>
        {variations.map((variation, index) => (
          <Textarea
            key={index}
            value={variation}
            readOnly
            className="mt-2"
          />
        ))}
      </div>
    </Card>
  );
}
