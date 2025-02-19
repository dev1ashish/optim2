import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface GlobalSettings {
  openaiKey?: string;
  anthropicKey?: string;
  groqKey?: string;
}

interface GlobalSettingsProps {
  settings: GlobalSettings;
  onSettingsChange: (settings: GlobalSettings) => void;
}

export function GlobalSettings({ settings, onSettingsChange }: GlobalSettingsProps) {
  const [open, setOpen] = useState(false);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey || "");
  const [anthropicKey, setAnthropicKey] = useState(settings.anthropicKey || "");
  const [groqKey, setGroqKey] = useState(settings.groqKey || "");
  const { toast } = useToast();

  const handleSave = () => {
    if (!openaiKey) {
      toast({
        title: "OpenAI API Key Required",
        description: "Please enter your OpenAI API key to continue",
        variant: "destructive"
      });
      return;
    }

    onSettingsChange({
      openaiKey,
      anthropicKey,
      groqKey
    });
    
    setOpen(false);
    toast({
      title: "Settings Saved",
      description: "Your API keys have been updated."
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="fixed top-4 right-4">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>
            Configure your API keys for different providers. OpenAI (GPT-4) is required for the main pipeline.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>OpenAI API Key (Required)</Label>
            <Input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
            />
          </div>

          <div className="grid gap-2">
            <Label>Anthropic API Key (Optional)</Label>
            <Input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="Enter your Anthropic API key"
            />
          </div>

          <div className="grid gap-2">
            <Label>Groq API Key (Optional)</Label>
            <Input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="Enter your Groq API key"
            />
          </div>

          <Button onClick={handleSave} className="mt-4">Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
