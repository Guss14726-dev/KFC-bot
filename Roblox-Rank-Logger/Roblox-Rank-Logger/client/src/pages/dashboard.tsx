import { useMonitors } from "@/hooks/use-monitors";
import { Layout } from "@/components/layout";
import { CreateMonitorDialog } from "@/components/CreateMonitorDialog";
import { MonitorCard } from "@/components/MonitorCard";
import { motion } from "framer-motion";
import { Search, ServerCrash, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Dashboard() {
  const { data: monitors, isLoading, error } = useMonitors();
  const [search, setSearch] = useState("");

  const filteredMonitors = monitors?.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.robloxGroupId.includes(search)
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/30 animate-spin border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            </div>
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">Loading Dashboard...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center flex-col gap-4 text-center p-8">
          <div className="bg-destructive/10 p-6 rounded-full text-destructive mb-2">
            <ServerCrash className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-white">Connection Failed</h2>
          <p className="text-muted-foreground max-w-md">
            Unable to connect to the server. Please check your connection and try again.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold text-white tracking-tight">
              Rank Monitors
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Manage your active listeners for Roblox group changes.
            </p>
          </div>
          
          <CreateMonitorDialog />
        </div>

        {/* Filters Bar */}
        <div className="bg-[#2f3136] p-4 rounded-xl border border-[#202225] flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                    placeholder="Search monitors..." 
                    className="pl-10 bg-[#202225] border-none text-white focus-visible:ring-primary/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="ml-auto text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Radio className="w-4 h-4 text-green-500" />
                {filteredMonitors?.length || 0} Active Listeners
            </div>
        </div>

        {/* Grid Content */}
        {filteredMonitors && filteredMonitors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMonitors.map((monitor, index) => (
              <motion.div
                key={monitor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <MonitorCard monitor={monitor} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-[#2f3136] rounded-xl bg-[#202225]/30">
            <div className="bg-[#36393f] p-4 rounded-full mb-4 shadow-lg">
                <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No monitors found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              {search ? "No monitors match your search query." : "You haven't created any monitors yet. Start by adding one to track a group."}
            </p>
            {!search && <CreateMonitorDialog />}
          </div>
        )}
      </div>
    </Layout>
  );
}
