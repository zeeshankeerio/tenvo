'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { Portlet } from '@/components/ui/portlet';
import { Send, Sparkles, User, Bot, Loader2, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { askBusinessAnalystAction } from '@/lib/actions/premium/ai/agentic';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const AgenticAnalystChat = memo(function AgenticAnalystChat({ businessId }: { businessId: string }) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your Agentic AI Analyst. Ask me anything about your inventory, sales trends, or financial health.", timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
        setLoading(true);

        try {
            const res = await askBusinessAnalystAction(businessId, userMsg);
            if (res.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: (res as any).data as string, timestamp: new Date() }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error while processing your request. Please try again.", timestamp: new Date() }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Please check your connection.", timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn(
            "transition-all duration-300 ease-in-out",
            isExpanded ? "fixed inset-4 z-50 bg-white rounded-3xl shadow-2xl border flex flex-col" : "h-[450px] relative"
        )}>
            <Portlet
                title="AI Business Analyst"
                description="Natural language intelligence"
                className={isExpanded ? "h-full" : "h-[450px]"}
                headerActions={
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => setMessages([{ role: 'assistant', content: "How can I help you today?", timestamp: new Date() }])}
                        >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col h-full bg-slate-50/50">
                    {/* Chat Area */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4"
                    >
                        {messages.map((m, idx) => (
                            <div key={idx} className={cn(
                                "flex items-start gap-3 max-w-[85%]",
                                m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}>
                                <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                                    m.role === 'user' ? "bg-brand-primary text-white" : "bg-white border text-wine"
                                )}>
                                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-[12px] leading-relaxed",
                                    m.role === 'user' 
                                        ? "bg-brand-primary text-white rounded-tr-none shadow-sm shadow-brand-primary/20" 
                                        : "bg-white text-gray-800 border border-slate-100 rounded-tl-none shadow-sm"
                                )}>
                                    {m.content}
                                    <div className={cn(
                                        "text-[8px] mt-1 opacity-50 font-bold uppercase",
                                        m.role === 'user' ? "text-white" : "text-gray-400"
                                    )}>
                                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-start gap-3 max-w-[85%]">
                                <div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center shrink-0">
                                    <Loader2 className="w-4 h-4 text-wine animate-spin" />
                                </div>
                                <div className="p-3 rounded-2xl bg-white border border-slate-100 rounded-tl-none shadow-sm flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Thinking</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about sales, stock, or anomalies..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 py-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all group-hover:bg-white"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className={cn(
                                    "absolute right-2 top-1.5 p-2 rounded-xl transition-all",
                                    input.trim() && !loading ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30" : "bg-gray-100 text-gray-400"
                                )}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2 px-1">
                            <Sparkles className="w-3 h-3 text-wine" />
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Powered by Neural Enterprise AI</span>
                        </div>
                    </div>
                </div>
            </Portlet>
        </div>
    );
});
