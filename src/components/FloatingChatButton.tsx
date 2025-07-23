"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MessageSquare, Sparkle, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { MessageRenderer } from "./MessageRenderer";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAIAssistantPage = pathname?.endsWith("/ai-assistant");

  if (isAIAssistantPage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !session?.user?.id) return;

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
          chatId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process query");
      }

      // Update chat ID if this is a new chat
      if (!chatId && data.chatId) {
        setChatId(data.chatId);
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

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
          <Button
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
              "bg-primary hover:bg-primary/90",
              "flex items-center justify-center",
                      "hover:shadow-xl",
                      "relative",
                      "border-2 border-primary-foreground/10",
                      messages.length > 0 && "after:absolute after:top-0 after:right-0 after:h-4 after:w-4 after:rounded-full after:bg-red-500 after:content-[''] after:border-2 after:border-background"
            )}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-primary-foreground" />
            ) : (
                      <Sparkle className="h-6 w-6 text-primary-foreground" />
            )}
          </Button>
                </motion.div>
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-[400px] sm:w-[540px] p-0 flex flex-col h-screen"
        >
                <SheetTitle className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>AI Assistant</span>
                    <Badge variant="secondary" className="text-xs ml-2">Beta</Badge>
                  </div>
                </SheetTitle>
                
                <div className="flex-1 flex flex-col h-[calc(100vh-8rem)]">
                  <ScrollArea className="flex-1 overflow-hidden">
                    <div className="flex flex-col h-[calc(100vh-10rem)]">
                      {messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-4">
                          <div className="text-center text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Ask me anything about properties, market trends, or wealth analysis.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-end p-4">
                          <div className="space-y-4">
                            {messages.map((message) => (
                              <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${
                                  message.role === "user" ? "justify-end" : "justify-start"
                                }`}
                              >
                                {message.role === "assistant" && (
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      <MessageSquare className="h-4 w-4" />
                                    </AvatarFallback>
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
                                    <AvatarFallback>
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </motion.div>
                            ))}
                            {loading && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-3"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="/images/bot-avatar.png" alt="AI Assistant" />
                                  <AvatarFallback>AI</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-lg p-3">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about properties, market trends..."
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !query.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
          </div>
        </SheetContent>
      </Sheet>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-primary text-primary-foreground">
            <p>Chat with AI Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 