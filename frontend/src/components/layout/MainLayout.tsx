// AI was used to help write this function to validate logic and suggest improvements
import { Menu, MessageSquare, Zap, Users, CirclePlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Outlet, useNavigate } from 'react-router';
import { useState, type JSX } from 'react';

export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false)

  const darkBackgroundRoutes = ['/'];
  const isDarkBackground = darkBackgroundRoutes.includes(location.pathname);

  const handleNavigation = (path: string): void => {
    navigate(path);
    setIsOpen(false);
  };
  const handleNewChat = (): void => {
    handleNavigation('/')
  }
  const handleHistory = (): void => {
    handleNavigation('/history')
  }
  const handleAboutUs = (): void => {
    handleNavigation('/about')
  }
  const handleCurrentAPIs = (): void => {
    handleNavigation('/documentation')
  }

  const buttonStyles = isDarkBackground
    ? "bg-white/10 backdrop-blur-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 shadow-lg shadow-white/10"
    : "bg-slate-200/50 backdrop-blur-xl border-2 border-slate-300 hover:bg-slate-300/70 hover:border-slate-400/80 shadow-md shadow-slate-600/30";

  const iconStyles = isDarkBackground ? "text-white" : "text-slate-900";

  return (
    <div className="relative w-full min-h-screen">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-10 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Hamburger Menu */}
      <div className="absolute top-6 right-6 z-20">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className={`rounded-xl h-12 w-12 transition-all duration-300 ${buttonStyles}`}
            >
              <Menu className={`h-6 w-6 ${iconStyles}`} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-gradient-to-b from-blue-950 to-slate-950 border-purple-500/30 text-white w-80 transition-all animate-slide-in-right duration-300 
            [&>button]:hover:bg-white/20 
            [&>button]:hover:scale-120 
            [&>button]:transition-all 
            [&>button]:duration-200"
          >
            <SheetHeader className='pr-[140px]'>
              <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent cursor-pointer" onClick={handleNewChat}>
                <div className='flex items-center gap-2 group'>
                  <Sparkles className="w-6 h-6 text-blue-400 transition-transform duration-200 group-hover:scale-105 group-hover:rotate-12 group-hover:translate-x-1" />
                  <p className='group-hover:translate-x-1 group-hover:scale-105 transition-all duration-200'>leona</p>
                </div>

              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 space-y-4">
              <button
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-700 to-violet-600 hover:from-blue-600 hover:to-violet-500 transition-all duration-200 border-2 border-blue-400/50 hover:border-blue-300/70 hover:shadow-md hover:shadow-blue-500/50 group"
                onClick={handleNewChat}
              >
                <CirclePlus className="w-5 h-5 text-white group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-left font-semibold">New Chat</span>
              </button>

              <button
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-blue-500/20 hover:border-blue-400/50 group"
                onClick={handleHistory}
              >
                <MessageSquare className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-left">Chats</span>
              </button>

              <button
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-purple-500/20 hover:border-purple-400/50 group"
                onClick={handleAboutUs}
              >
                <Users className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-left">Who are we?</span>
              </button>

              <button
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-pink-500/20 hover:border-pink-400/50 group"
                onClick={handleCurrentAPIs}
              >
                <Zap className="w-5 h-5 text-pink-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                <span className="text-left">Current APIs</span>
              </button>

            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Page Content */}
      <Outlet />
    </div>
  );
}
