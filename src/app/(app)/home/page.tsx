
import CommunityChat from '@/components/community/community-chat';
import { HomeIcon } from 'lucide-react'; // Changed icon to HomeIcon for semantic clarity if page is "Home"

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen"> {/* Ensure full height for chat layout */}
      {/* Header for mobile, could be part of AppLayout if consistent */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background p-4">
        <h1 className="text-xl font-semibold flex items-center">
          <HomeIcon className="mr-2 h-6 w-6 text-primary" /> Home Feed
        </h1>
      </header>
      {/* CommunityChat is the main content for this new Home page */}
      <CommunityChat />
    </div>
  );
}
