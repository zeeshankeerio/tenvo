'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { Bot, Sparkles, Send, X, Trash2, Loader2, User, HelpCircle } from 'lucide-react';
import { askBusinessAnalystAction } from '@/lib/actions/premium/ai/agentic';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const AgenticFloatingChatbot = memo(function AgenticFloatingChatbot({ 
    businessId, 
    businessName, 
    businessCategory 
}: { 
    businessId: string; 
    businessName?: string; 
    businessCategory?: string; 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { 
            role: 'assistant', 
            content: `Hello! I'm your Intelligent Business Analyst. Ask me anything about your inventory, sales, or financial health.`, 
            timestamp: new Date() 
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    if (!businessId) return null; // Safe guard for tenant scoping

    const handleSend = async (textToSend?: string) => {
        const queryText = (textToSend || input).trim();
        if (!queryText || loading) return;

        if (!textToSend) setInput('');
        
        setMessages(prev => [...prev, { role: 'user', content: queryText, timestamp: new Date() }]);
        setLoading(true);

        try {
            const res = await askBusinessAnalystAction(businessId, queryText);
            if (res.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: (res as any).data as string, timestamp: new Date() }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error accessing your tenant database. Please try again.", timestamp: new Date() }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Make sure your local server is online.", timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    };

    const suggestedPrompts = [
        { label: 'Low Stock Alert', query: 'Analyze my low-stock items and warn about replenishment' },
        { label: 'Sales Anomaly Scan', query: 'Scan recent sales invoices for anomalies or potential pricing errors' },
        { label: 'Revenue Overview', query: 'Show me today\'s revenue trends and profit estimations' }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: 'spring', duration: 0.4 }}
                        className="mb-4 w-96 h-[520px] bg-white rounded-3xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Chat Header */}
                        <div className="bg-brand-primary p-4 text-white flex items-center justify-between shadow-sm relative overflow-hidden">
                            {/* Decorative Sparkle Backdrop */}
                            <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-2 -translate-y-2">
                                <Sparkles className="w-24 h-24" />
                            </div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-black tracking-wide uppercase flex items-center gap-1.5">
                                        AI Business Copilot
                                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    </h3>
                                    <span className="text-[9px] text-white/80 font-bold uppercase tracking-wider">
                                        {businessName || 'Active Workspace'} · {businessCategory || 'General'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 relative z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMessages([{ role: 'assistant', content: 'What can I analyze for you today?', timestamp: new Date() }])}
                                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
                                    title="Clear Chat History"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Message Log */}
                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-thin"
                        >
                            {messages.map((m, idx) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "flex items-start gap-2.5 max-w-[85%]",
                                        m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                                        m.role === 'user' ? "bg-brand-primary text-white" : "bg-white border border-slate-100 text-brand-primary"
                                    )}>
                                        {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-[12px] leading-relaxed shadow-sm border",
                                        m.role === 'user' 
                                            ? "bg-brand-primary text-white border-brand-primary rounded-tr-none" 
                                            : "bg-white text-gray-800 border-slate-100 rounded-tl-none"
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
                                <div className="flex items-start gap-2.5 max-w-[85%]">
                                    <div className="w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                                        <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white border border-slate-100 rounded-tl-none shadow-sm flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Running Analytics RAG</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Prompts Panel */}
                        {messages.length === 1 && (
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-col gap-1.5">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3 text-gray-400" />
                                    Quick Analytics Prompts
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {suggestedPrompts.map((p, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(p.query)}
                                            className="text-[10px] font-bold text-gray-600 hover:text-brand-primary hover:border-brand-primary/40 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 transition-all text-left truncate max-w-full shadow-sm"
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input Panel */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Query sales, stock, or scan anomalies..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 py-3.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all group-hover:bg-white text-gray-800"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || loading}
                                    className={cn(
                                        "absolute right-2 top-1.5 p-2 rounded-xl transition-all",
                                        input.trim() && !loading 
                                            ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95" 
                                            : "bg-slate-100 text-gray-400"
                                    )}
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 px-1 justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-brand-primary animate-pulse" />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        Secure Tenant Scoped
                                    </span>
                                </div>
                                <span className="text-[8px] font-bold text-slate-300 uppercase">
                                    v2026.1
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pulsing Floating Button Trigger */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl relative transition-all duration-300",
                    isOpen 
                        ? "bg-slate-900 text-white shadow-slate-950/20" 
                        : "bg-brand-primary text-white shadow-brand-primary/30 hover:shadow-brand-primary/45"
                )}
            >
                {isOpen ? (
                    <X className="w-6 h-6 animate-in spin-in-12 duration-200" />
                ) : (
                    <>
                        {/* Outer Pulse Indicator */}
                        <div className="absolute inset-0 rounded-full bg-brand-primary/25 animate-ping opacity-75" />
                        
                        <div className="relative flex items-center justify-center">
                            <Bot className="w-6 h-6 animate-in fade-in zoom-in-50 duration-300" />
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1.5 -right-1.5 animate-pulse" />
                        </div>
                    </>
                )}
            </motion.button>
        </div>
    );
});
