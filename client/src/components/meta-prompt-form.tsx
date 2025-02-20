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
import { Label } from "@/components/ui/label";

interface MetaPromptFormProps {
  onSubmit: (data: MetaPromptInput) => void;
  isLoading?: boolean;
}

export function MetaPromptForm({ onSubmit, isLoading }: MetaPromptFormProps) {
  const form = useForm<MetaPromptInput>({
    resolver: zodResolver(metaPromptSchema),
    defaultValues: {
      baseInput: "",
    }
  });

  return (
    <div className="space-y-4">
      <Label className="text-base">eg: i want an empathetic chatbot</Label>
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
            {isLoading ? "Generating..." : "Generate Meta Prompt"}
          </Button>
        </form>
      </Form>
    </div>
  );
}