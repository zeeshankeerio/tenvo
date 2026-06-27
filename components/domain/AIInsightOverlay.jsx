'use client';

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, ShieldAlert, Lightbulb, ChevronRight, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDomainIndustryInsightsAction } from '@/lib/actions/premium/ai/analytics';

export function AIInsightOverlay({ domain, items, businessId }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!domain || items.length === 0) {
      setInsights([]);
      return;
    }

    const fetchInsights = async () => {
      setLoading(true);
      try {
        const res = await getDomainIndustryInsightsAction(businessId, domain);
        if (res.success) {
          // Filter or adapt insights based on current items
          setInsights(res.insights || []);
        }
      } catch (e) {
        console.error("Failed to fetch AI insights:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchInsights, 1500); // Debounce
    return () => clearTimeout(timer);
  }, [domain, items.length, businessId]);

  if (items.length === 0 && insights.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-24 right-8 z-50 transition-all duration-500 transform",
      minimized ? "translate-y-16 opacity-50 hover:opacity-100" : "translate-y-0"
    )}>
      <Card className="w-80 rounded-[2rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden bg-white/90 backdrop-blur-xl">
        <div 
          className="p-4 bg-brand-primary flex items-center justify-between cursor-pointer"
          onClick={() => setMinimized(!minimized)}
        >
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest italic">Domain Co-Pilot</span>
          </div>
          <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
            {loading ? 'Thinking...' : `${insights.length} Strategies`}
          </Badge>
        </div>
        
        {!minimized && (
          <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {insights.length === 0 && !loading ? (
              <div className="text-center py-6 space-y-2">
                <Lightbulb className="w-8 h-8 mx-auto text-gray-200" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Focusing on your {domain.replace('-', ' ')} workflows...</p>
              </div>
            ) : (
              insights.map((insight, idx) => (
                <div key={idx} className="group relative p-3 rounded-2xl bg-gray-50/50 hover:bg-white border border-transparent hover:border-brand-100 transition-all cursor-default">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg mt-0.5",
                      insight.type === 'opportunity' ? "bg-emerald-100 text-emerald-600" : 
                      insight.type === 'risk' ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
                    )}>
                      {insight.type === 'opportunity' ? <TrendingUp className="w-3 h-3" /> : 
                       insight.type === 'risk' ? <ShieldAlert className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-gray-900 leading-tight">{insight.title}</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              ))
            )}

            <div className="pt-2">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-black transition-all">
                <MessageSquare className="w-3 h-3" />
                Ask Co-Pilot
              </button>
            </div>
          </CardContent>
        )}
      </Card>
      
      {minimized && (
        <div 
          className="absolute -top-4 -right-4 w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer hover:scale-110 transition-all"
          onClick={() => setMinimized(false)}
        >
          <Sparkles className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
