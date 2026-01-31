import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMonitorSchema, type InsertMonitor } from "@shared/schema";
import { useCreateMonitor } from "@/hooks/use-monitors";
import { SiRoblox, SiDiscord } from "react-icons/si";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";

export function CreateMonitorDialog() {
  const [open, setOpen] = useState(false);
  const createMonitor = useCreateMonitor();

  const form = useForm<InsertMonitor>({
    resolver: zodResolver(insertMonitorSchema),
    defaultValues: {
      name: "",
      robloxGroupId: "",
      discordChannelId: "",
      isActive: true,
    },
  });

  const onSubmit = (data: InsertMonitor) => {
    createMonitor.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg shadow-green-900/20 transition-all hover:scale-105 active:scale-100">
          <Plus className="w-5 h-5" />
          Add Monitor
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#36393f] border-[#202225] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Create Monitor</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure a new Roblox group to track rank changes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Monitor Name</FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="e.g. Main Army Group" 
                        {...field} 
                        className="bg-[#202225] border-none text-white focus-visible:ring-primary/50 h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="robloxGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                    <SiRoblox className="text-white" />
                    Roblox Group ID
                  </FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="1234567" 
                        {...field} 
                        className="bg-[#202225] border-none text-white focus-visible:ring-primary/50 h-11"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground/60">
                    The numeric ID from the Roblox group URL.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discordChannelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                    <SiDiscord className="text-primary" />
                    Discord Channel ID
                  </FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="9876543210..." 
                        {...field} 
                        className="bg-[#202225] border-none text-white focus-visible:ring-primary/50 h-11"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground/60">
                    Enable Developer Mode in Discord to copy Channel IDs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11"
                disabled={createMonitor.isPending}
            >
              {createMonitor.isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                </>
              ) : (
                "Create Monitor"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
