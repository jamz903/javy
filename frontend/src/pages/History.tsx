import React, { useState } from 'react';
import { MessageSquare, Search, Calendar, Trash2, MoreVertical, Star, StarOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [chats, setChats] = useState([
    {
      id: 1,
      title: 'Sentinel-2 imagery over Amazon rainforest',
      preview: 'Can you help me find high-resolution Sentinel-2 imagery covering the Amazon rainforest from the past 3 months?',
      date: '2024-10-03',
      timestamp: '2:30 PM',
      messages: 12,
      starred: true,
      tags: ['Sentinel-2', 'Amazon']
    },
    {
      id: 2,
      title: 'MODIS vegetation index analysis',
      preview: 'I need to calculate NDVI from MODIS data for agricultural monitoring in Kenya...',
      date: '2024-10-02',
      timestamp: '11:15 AM',
      messages: 8,
      starred: false,
      tags: ['MODIS', 'NDVI']
    },
    {
      id: 3,
      title: 'Landsat change detection',
      preview: 'How can I perform change detection using Landsat 8 imagery to track urban expansion?',
      date: '2024-10-01',
      timestamp: '4:45 PM',
      messages: 15,
      starred: true,
      tags: ['Landsat', 'Urban']
    },
    {
      id: 4,
      title: 'SAR interferometry tutorial',
      preview: 'Could you explain how to create an interferogram using Sentinel-1 SAR data?',
      date: '2024-09-30',
      timestamp: '9:20 AM',
      messages: 20,
      starred: false,
      tags: ['SAR', 'InSAR']
    },
    {
      id: 5,
      title: 'Planet Labs API integration',
      preview: 'I want to integrate Planet Labs API into my application for daily imagery updates...',
      date: '2024-09-29',
      timestamp: '3:10 PM',
      messages: 6,
      starred: false,
      tags: ['Planet Labs', 'API']
    },
    {
      id: 6,
      title: 'Cloud masking techniques',
      preview: 'What are the best practices for cloud masking in optical satellite imagery?',
      date: '2024-09-28',
      timestamp: '1:55 PM',
      messages: 10,
      starred: true,
      tags: ['Cloud Masking', 'Processing']
    },
    {
      id: 7,
      title: 'Time series analysis',
      preview: 'Help me set up a time series analysis workflow for monitoring crop health...',
      date: '2024-09-27',
      timestamp: '10:30 AM',
      messages: 18,
      starred: false,
      tags: ['Time Series', 'Agriculture']
    },
    {
      id: 8,
      title: 'Download Sentinel-2 bands',
      preview: 'How do I download specific bands from Sentinel-2 scenes?',
      date: '2024-09-26',
      timestamp: '5:20 PM',
      messages: 5,
      starred: false,
      tags: ['Sentinel-2', 'Download']
    }
  ]);

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

  const toggleStar = (id) => {
    setChats(chats.map(chat =>
      chat.id === id ? { ...chat, starred: !chat.starred } : chat
    ));
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
  };

  const deleteChat = () => {
    setChats(chats.filter(chat => chat.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Chat History</h1>
          </div>
          <p className="text-slate-600">View and manage your past conversations</p>
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
                Try adjusting your search or start a new conversation
              </p>
              <Button>Start New Chat</Button>
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
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleStar(chat.id)}>
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
                              onClick={() => confirmDelete(chat.id)}
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
