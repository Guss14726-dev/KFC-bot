import { SiDiscord } from "react-icons/si";
import { Link, useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-body text-foreground">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#202225] p-6 flex flex-col border-r border-[#18191c]">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-primary/10 p-2.5 rounded-xl">
            <SiDiscord className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none">RankBot</h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Dashboard</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <Link href="/" className={`
            flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium
            ${location === "/" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:bg-[#36393f] hover:text-white"}
          `}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            Monitors
          </Link>
          
          {/* Placeholder for future links */}
          <div className="px-4 py-3 text-muted-foreground/50 flex items-center gap-3 cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.09a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.09a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Settings
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-[#36393f]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto h-screen bg-[#36393f] relative">
         {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="relative z-10 max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
