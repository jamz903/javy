// AI was used to help write this function to validate logic and suggest improvements
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Search, Calendar, Trash2, MoreVertical, Star, StarOff, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function History() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/chat-history');
        if (response.ok) {
          const data = await response.json();
          if (data.chats) {
            setChats(data.chats);
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  const handleChatClick = (chat) => {
    navigate('/chat', {
      state: {
        loadedChat: chat,
        chatId: chat.id
      }
    });
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedChats = filteredChats.reduce((groups, chat) => {
    const date = new Date(chat.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    let group;
    if (chat.date === today.toISOString().split('T')[0]) {
      group = 'Today';
    } else if (chat.date === yesterday.toISOString().split('T')[0]) {
      group = 'Yesterday';
    } else if (date >= lastWeek) {
      group = 'Last 7 Days';
    } else {
      group = 'Older';
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(chat);
    return groups;
  }, {});

  const toggleStar = async (id) => {
    // Update locally first for immediate feedback
    const updatedChats = chats.map(chat =>
      chat.id === id ? { ...chat, starred: !chat.starred } : chat
    );
    setChats(updatedChats);

    // Save to backend
    try {
      await fetch('http://localhost:8000/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chats: updatedChats })
      });
    } catch (error) {
      console.error('Error saving star status:', error);
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
  };

  const deleteChat = async () => {
    try {
      // Delete from backend
      const response = await fetch(`http://localhost:8000/api/chat-history/${deleteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Update local state
        setChats(chats.filter(chat => chat.id !== deleteId));
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-slate-900">Chat History</h1>
              </div>
              <p className="text-slate-600">View and manage your past conversations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search chats by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{chats.length}</div>
              <div className="text-sm text-slate-600">Total Chats</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {chats.filter(c => c.starred).length}
              </div>
              <div className="text-sm text-slate-600">Starred</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {groupedChats['Today']?.length || 0}
              </div>
              <div className="text-sm text-slate-600">Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {chats.reduce((sum, chat) => sum + chat.messages, 0)}
              </div>
              <div className="text-sm text-slate-600">Total Messages</div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Groups */}
        {Object.keys(groupedChats).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No chats found</h3>
              <p className="text-slate-600 mb-4">
                {chats.length === 0
                  ? 'Start a conversation to see your chat history here'
                  : 'Try adjusting your search terms'}
              </p>
              <Button onClick={() => window.location.href = '/'}>Start New Chat</Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedChats).map(([group, groupChats]) => (
            <div key={group} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-slate-500" />
                <h2 className="text-xl font-semibold text-slate-900">{group}</h2>
                <Badge variant="outline" className="ml-2">
                  {groupChats.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {groupChats.map((chat) => (
                  <Card
                    key={chat.id}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleChatClick(chat)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                              {chat.title}
                            </CardTitle>
                            {chat.starred && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <CardDescription className="line-clamp-2">
                            {chat.preview}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(chat.id);
                            }}>
                              {chat.starred ? (
                                <>
                                  <StarOff className="w-4 h-4 mr-2" />
                                  Remove Star
                                </>
                              ) : (
                                <>
                                  <Star className="w-4 h-4 mr-2" />
                                  Add Star
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(chat.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Chat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-4">
                          <span>{chat.timestamp}</span>
                          <span>•</span>
                          <span>{chat.messages} messages</span>
                        </div>
                        <div className="flex gap-2">
                          {chat.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteChat}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
