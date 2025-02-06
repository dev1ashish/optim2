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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MetaPromptFormProps {
  onSubmit: (data: MetaPromptInput) => void;
  isLoading?: boolean;
}

export function MetaPromptForm({ onSubmit, isLoading }: MetaPromptFormProps) {
  const form = useForm<MetaPromptInput>({
    resolver: zodResolver(metaPromptSchema),
    defaultValues: {
      baseInput: "",
      aiRole: "",
      tone: "",
      functionality: "",
      constraints: "",
      edgeCases: ""
    }
  });

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="baseInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Input</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter your base prompt..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="aiRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Role</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Career Coach, Writing Assistant" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tone & Style</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Professional, Friendly, Technical" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="functionality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Functionality</FormLabel>
                <FormControl>
                  <Textarea placeholder="What should the AI do?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="constraints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Constraints</FormLabel>
                <FormControl>
                  <Textarea placeholder="What limitations should be enforced?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="edgeCases"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Edge Cases</FormLabel>
                <FormControl>
                  <Textarea placeholder="What special cases should be handled?" {...field} />
                </FormControl>
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
