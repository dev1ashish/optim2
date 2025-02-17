import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import { ModelSelector } from "./model-selector";

interface ModelArenaDialogProps {
  testCase: string;
  promptVariation: string;
  promptVariationIndex: number;
  modelConfigs: ModelConfig[];
  onStartComparison: (configs: ModelConfig[]) => Promise<void>;
}

export function ModelArenaDialog({
  testCase,
  promptVariation,
  promptVariationIndex,
  modelConfigs,
  onStartComparison,
}: ModelArenaDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Models</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Prompt Variation {promptVariationIndex + 1}</Label>
            <p className="text-sm text-muted-foreground font-mono">{promptVariation}</p>
          </div>

          <div className="space-y-2">
            <Label>Test Case</Label>
            <p className="text-sm text-muted-foreground">{testCase}</p>
          </div>

          <ModelSelector onModelConfigsChange={onStartComparison} />
        </div>
      </DialogContent>
    </Dialog>
  );
}