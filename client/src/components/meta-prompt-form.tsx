import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { metaPromptSchema, type MetaPromptInput } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MetaPromptFormProps {
  onSubmit: (data: MetaPromptInput) => void;
  isLoading?: boolean;
  autoSubmit?: boolean;
}

export function MetaPromptForm({ onSubmit, isLoading, autoSubmit = true }: MetaPromptFormProps) {
  const form = useForm<MetaPromptInput>({
    resolver: zodResolver(metaPromptSchema),
    defaultValues: {
      baseInput: "",
    }
  });

  // Auto-submit with a default task if autoSubmit is true
  if (autoSubmit && !form.getValues().baseInput) {
    setTimeout(() => {
      form.setValue("baseInput", "I want an AI that helps with general task assistance");
      form.handleSubmit(onSubmit)();
    }, 0);
  }

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="baseInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What kind of AI assistant do you want?</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='Enter your request (e.g., "I want an AI that helps with writing blog posts")' 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  The system will automatically generate a detailed prompt structure based on your input.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate Meta Prompt"}
          </Button>
        </form>
      </Form>
    </Card>
  );
}