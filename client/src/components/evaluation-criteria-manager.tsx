import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { evaluationCriterionSchema, type EvaluationCriterion } from "@shared/schema";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";
import { Settings2, Plus, Trash2, Edit2 } from "lucide-react";

interface EvaluationCriteriaManagerProps {
  criteria: EvaluationCriterion[];
  onAddCriterion: (criterion: EvaluationCriterion) => void;
  onUpdateCriterion: (id: string, criterion: EvaluationCriterion) => void;
  onRemoveCriterion: (id: string) => void;
  defaultModelConfig: ModelConfig;
}

export function EvaluationCriteriaManager({
  criteria,
  onAddCriterion,
  onUpdateCriterion,
  onRemoveCriterion,
  defaultModelConfig
}: EvaluationCriteriaManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<EvaluationCriterion>({
    resolver: zodResolver(evaluationCriterionSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      systemPrompt: "",
      weight: 1,
      modelConfig: defaultModelConfig
    }
  });

  const onSubmit = (data: EvaluationCriterion) => {
    if (editingId) {
      onUpdateCriterion(editingId, data);
      setEditingId(null);
    } else {
      onAddCriterion({
        ...data,
        id: crypto.randomUUID()
      });
    }
    setShowForm(false);
    form.reset();
  };

  const handleEdit = (criterion: EvaluationCriterion) => {
    form.reset(criterion);
    setEditingId(criterion.id);
    setShowForm(true);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Label className="text-lg">Evaluation Criteria</Label>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Criterion
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Evaluation Criterion" : "Add Evaluation Criterion"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label>Name</Label>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Empathy" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <Label>Description</Label>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe what this criterion evaluates..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <Label>System Prompt</Label>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter the system prompt for evaluation..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <Label>Weight (0-1)</Label>
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

              <FormField
                control={form.control}
                name="modelConfig"
                render={({ field }) => (
                  <FormItem>
                    <ModelSettingsSection
                      title="Model Settings"
                      description="Configure the model for this evaluation criterion"
                      config={field.value || defaultModelConfig}
                      onChange={field.onChange}
                      defaultConfig={defaultModelConfig}
                      useDefaultSettings={!field.value}
                      onUseDefaultSettingsChange={(use) => {
                        if (use) {
                          field.onChange(undefined);
                        } else {
                          field.onChange(defaultModelConfig);
                        }
                      }}
                    />
                  </FormItem>
                )}
              />

              <Button type="submit">
                {editingId ? "Update Criterion" : "Add Criterion"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {criteria.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criteria.map((criterion) => (
              <TableRow key={criterion.id}>
                <TableCell>{criterion.name}</TableCell>
                <TableCell>{criterion.description}</TableCell>
                <TableCell>{criterion.weight}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(criterion)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveCriterion(criterion.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
