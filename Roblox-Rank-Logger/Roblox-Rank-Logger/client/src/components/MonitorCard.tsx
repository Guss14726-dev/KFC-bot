import { SiRoblox, SiDiscord } from "react-icons/si";
import { Trash2, Radio, PlayCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Monitor } from "@shared/schema";
import { useDeleteMonitor, useTestMonitor } from "@/hooks/use-monitors";
import { formatDistanceToNow } from "date-fns";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MonitorCardProps {
  monitor: Monitor;
}

export function MonitorCard({ monitor }: MonitorCardProps) {
  const deleteMonitor = useDeleteMonitor();
  const testMonitor = useTestMonitor();

  return (
    <div className="group relative bg-[#2f3136] rounded-xl p-6 border border-[#202225] hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-display font-bold text-xl text-white">{monitor.name}</h3>
            {monitor.isActive && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            Last activity: {monitor.lastLogDate ? formatDistanceToNow(new Date(monitor.lastLogDate), { addSuffix: true }) : 'Never'}
          </p>
        </div>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                onClick={() => testMonitor.mutate(monitor.id)}
                disabled={testMonitor.isPending}
                title="Send Test Message"
            >
                <PlayCircle className={`w-4 h-4 ${testMonitor.isPending ? 'animate-pulse' : ''}`} />
            </Button>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#36393f] border-[#202225] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Monitor?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            This will stop tracking ranks for this group. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-[#202225] hover:bg-[#202225] hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => deleteMonitor.mutate(monitor.id)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-[#202225] rounded-lg p-3 flex items-center justify-between group/item">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-md text-white">
                <SiRoblox className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Group ID</span>
              <span className="text-sm font-mono text-white/90">{monitor.robloxGroupId}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#202225] rounded-lg p-3 flex items-center justify-between group/item">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#5865F2]/10 rounded-md text-[#5865F2]">
                <SiDiscord className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Channel ID</span>
              <span className="text-sm font-mono text-white/90">{monitor.discordChannelId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
