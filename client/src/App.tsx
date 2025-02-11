import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { ApiSettings } from "@/components/settings/api-settings";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { toast } = useToast();
  const [apiKeysSet, setApiKeysSet] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);

  // Check if API keys are set on initial load
  useEffect(() => {
    const storedKeys = localStorage.getItem('api_keys');
    if (storedKeys) {
      const keys = JSON.parse(storedKeys);
      const hasRequiredKeys = Object.values(keys).some(key => key);
      setApiKeysSet(hasRequiredKeys);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* API Settings Button */}
      <Dialog open={isApiSettingsOpen || !apiKeysSet} onOpenChange={setIsApiSettingsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="fixed top-4 right-4 z-50"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Settings</DialogTitle>
            <DialogDescription>
              Manage your API keys for all AI providers in one place.
            </DialogDescription>
          </DialogHeader>
          <ApiSettings 
            onApiKeysSet={() => {
              setApiKeysSet(true);
              setIsApiSettingsOpen(false);
            }} 
          />
        </DialogContent>
      </Dialog>

      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;