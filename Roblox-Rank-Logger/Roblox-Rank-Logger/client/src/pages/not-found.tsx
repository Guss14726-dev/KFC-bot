import { Link } from "wouter";
import { SiDiscord } from "react-icons/si";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#36393f] text-white p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
            <div className="w-24 h-24 bg-[#2f3136] rounded-3xl flex items-center justify-center shadow-xl rotate-12 transform transition-transform hover:rotate-0">
                <SiDiscord className="w-14 h-14 text-primary" />
            </div>
        </div>

        <div className="space-y-4">
            <h1 className="text-8xl font-display font-bold text-white/10 select-none">404</h1>
            <h2 className="text-3xl font-bold">Page Not Found</h2>
            <p className="text-muted-foreground">
                The page you are looking for has been moved, deleted, or possibly never existed.
            </p>
        </div>

        <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow-lg shadow-primary/25">
          Return Home
        </Link>
      </div>
    </div>
  );
}
