import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { metaPromptSchema, type MetaPromptInput } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";
import { Label } from "@/components/ui/label";

interface MetaPromptFormProps {
  onSubmit: (data: MetaPromptInput) => void;
  modelConfig: ModelConfig;
  onModelConfigChange: (config: ModelConfig) => void;
  isLoading?: boolean;
}

export function MetaPromptForm({ 
  onSubmit, 
  modelConfig, 
  onModelConfigChange,
  isLoading 
}: MetaPromptFormProps) {
  const form = useForm<MetaPromptInput>({
    resolver: zodResolver(metaPromptSchema),
    defaultValues: {
      baseInput: "",
    }
  });

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <Label className="text-lg">What kind of AI assistant do you want?</Label>
        <ModelSettingsSection
          title="Meta Prompt Settings"
          description="Configure the model for generating the meta prompt"
          config={modelConfig}
          onChange={onModelConfigChange}
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="baseInput"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea 
                    placeholder='e.g., "I want an AI that helps with writing blog posts"'
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </form>
      </Form>
    </Card>
  );
}