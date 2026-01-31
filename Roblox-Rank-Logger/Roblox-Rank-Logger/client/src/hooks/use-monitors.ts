import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMonitor } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMonitors() {
  return useQuery({
    queryKey: [api.monitors.list.path],
    queryFn: async () => {
      const res = await fetch(api.monitors.list.path);
      if (!res.ok) throw new Error("Failed to fetch monitors");
      return api.monitors.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMonitor) => {
      const res = await fetch(api.monitors.create.path, {
        method: api.monitors.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create monitor");
      }
      return api.monitors.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monitors.list.path] });
      toast({
        title: "Success",
        description: "Monitor created successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.monitors.delete.path, { id });
      const res = await fetch(url, { method: api.monitors.delete.method });
      
      if (!res.ok) {
        throw new Error("Failed to delete monitor");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monitors.list.path] });
      toast({
        title: "Deleted",
        description: "Monitor removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useTestMonitor() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.monitors.test.path, { id });
      const res = await fetch(url, { method: api.monitors.test.method });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Test failed");
      }
      return api.monitors.test.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "Test Sent",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
