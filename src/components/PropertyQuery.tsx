"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Plus, Trash2, Pencil, Check, X, Menu } from "lucide-react";
import { MessageRenderer } from "./MessageRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// Helper function to generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function PropertyQuery() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchChats();
    }
  }, [session?.user?.id]);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      const data = await res.json();
      if (res.ok) {
        // Convert string dates to Date objects
        const processedChats = data.chats.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          }))
        }));
        setChats(processedChats);
        if (processedChats.length > 0) {
          setActiveChatId(processedChats[0].id);
          setMessages(processedChats[0].messages);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const data = await res.json();
      if (res.ok) {
        const newChat = {
          ...data.chat,
          createdAt: new Date(data.chat.createdAt),
          messages: []
        };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleEditTitle = async (chatId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (res.ok) {
        const { chat } = await res.json();
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title: chat.title } : c))
        );
        setEditingChatId(null);
      }
    } catch (err) {
      console.error("Failed to update chat title:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !activeChatId) return;

    const userMessage: Message = {
      id: generateUUID(),
      role: "user",
      content: query,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/property/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          query,
          chatId: activeChatId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process query");
      }

      const assistantMessage: Message = {
        id: generateUUID(),
        role: "assistant",
        content: data.response,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const ChatSidebar = () => (
    <div className="w-64 border-r bg-muted/50 h-full">
      <div className="p-4 border-b">
        <Button
          onClick={createNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-1.5">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "flex items-center justify-between p-1.5 rounded-md cursor-pointer hover:bg-muted",
                activeChatId === chat.id && "bg-muted"
              )}
              onClick={() => {
                if (editingChatId !== chat.id) {
                  setActiveChatId(chat.id);
                  setMessages(chat.messages);
                  setIsMobileSidebarOpen(false);
                }
              }}
            >
              {editingChatId === chat.id ? (
                <form
                  className="flex-1 flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEditTitle(chat.id, editingTitle);
                  }}
                >
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="h-6 text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-1">
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChatId(null);
                      }}
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="truncate flex-1">{chat.title}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChatId(chat.id);
                        setEditingTitle(chat.title);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-full w-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ChatSidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="md:hidden p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {chats.find(chat => chat.id === activeChatId)?.title || "New Chat"}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={createNewChat}
                className="h-8 w-8"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-7rem)] md:h-[calc(100vh-7rem)] overflow-hidden">
            <div className="flex flex-col">
              <div className="flex flex-col justify-end p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/images/bot-avatar.png" alt="AI Assistant" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <MessageRenderer content={message.content} />
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.createdAt.toLocaleTimeString()}
                        </span>
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/images/user-avatar.png" alt="User" />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/images/bot-avatar.png" alt="AI Assistant" />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about properties, market trends..."
                className="flex-1"
                disabled={!activeChatId}
              />
              <Button type="submit" disabled={loading || !query.trim() || !activeChatId}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Chat History</SheetTitle>
          </SheetHeader>
          <ChatSidebar />
        </SheetContent>
      </Sheet>
    </div>
  );
} 