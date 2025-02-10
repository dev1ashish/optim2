import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { ApiSettings } from "@/components/settings/api-settings";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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
      {!apiKeysSet && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="container max-w-2xl mx-auto py-16">
            <ApiSettings onApiKeysSet={() => setApiKeysSet(true)} />
          </div>
        </div>
      )}
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;