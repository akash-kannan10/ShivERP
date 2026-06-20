import { useState, useRef, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { 
  Bot, Send, Sparkles, HelpCircle, Layers, TrendingUp, AlertOctagon, Terminal
} from 'lucide-react';

interface Message {
  sender: 'user' | 'copilot';
  text: string;
  sections?: {
    whatHappened: string;
    whyItHappened: string;
    businessImpact: string;
    recommendedAction: string;
  };
  rawData?: any;
}

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'copilot',
      text: "Hello! I am your AI Business Copilot. I analyze live inventory levels, procurement cycles, order delays, and product margins to help you optimize Shiv Furniture Works. Ask me any question or use one of the templates below."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRawData, setSelectedRawData] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText: string) => {
    if (!questionText.trim()) return;
    setLoading(true);
    setInput('');
    setSelectedRawData(null);

    // Append user message
    setMessages(prev => [...prev, { sender: 'user', text: questionText }]);

    try {
      const res = await apiCall('/copilot/query', {
        method: 'POST',
        body: JSON.stringify({ question: questionText })
      });

      setMessages(prev => [...prev, {
        sender: 'copilot',
        text: 'Analysis Completed.',
        sections: {
          whatHappened: res.whatHappened,
          whyItHappened: res.whyItHappened,
          businessImpact: res.businessImpact,
          recommendedAction: res.recommendedAction
        },
        rawData: res.rawData
      }]);

      if (res.rawData) {
        setSelectedRawData(res.rawData);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'copilot',
        text: `Error: ${err.message || 'Failed to query Copilot API'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const templates = [
    { title: 'CEO Biggest Problem', query: 'What is our biggest problem today?' },
    { title: 'Low Stock Intelligence', query: 'Show all active low stock alerts on raw materials' },
    { title: 'Delay Root Cause', query: 'Which sales or manufacturing orders are delayed and why?' },
    { title: 'Daily morning Brief', query: 'Generate a daily morning business brief' },
    { title: 'Profitability Audit', query: 'Which products have the highest markup margins?' },
    { title: 'Blocked MOs Detect', query: 'Detect which Manufacturing Orders are blocked by component shortages' }
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* Left Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden h-full shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200">AI Business Analyst Copilot</h3>
              <span className="text-[9px] text-indigo-400 font-semibold uppercase tracking-widest">Real-time context</span>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg, idx) => {
            const isCopilot = msg.sender === 'copilot';
            return (
              <div key={idx} className={`flex gap-3 ${isCopilot ? 'justify-start' : 'justify-end'}`}>
                {isCopilot && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                  isCopilot 
                    ? 'bg-slate-950/40 border border-slate-800 text-slate-300' 
                    : 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10'
                }`}>
                  {msg.sections ? (
                    /* Structured Response Layout */
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] bg-slate-900 text-indigo-400 border border-slate-800 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                          What Happened
                        </span>
                        <p className="mt-2 text-slate-200">{msg.sections.whatHappened}</p>
                      </div>

                      <div>
                        <span className="text-[9px] bg-slate-900 text-amber-400 border border-slate-800 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                          Why It Happened
                        </span>
                        <p className="mt-2 text-slate-200">{msg.sections.whyItHappened}</p>
                      </div>

                      <div>
                        <span className="text-[9px] bg-slate-900 text-rose-400 border border-slate-800 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                          Business Impact
                        </span>
                        <p className="mt-2 text-slate-200">{msg.sections.businessImpact}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-900">
                        <span className="text-[9px] bg-slate-900 text-emerald-400 border border-slate-800 px-2 py-0.5 rounded uppercase font-bold tracking-wider font-extrabold">
                          Recommended Action
                        </span>
                        <p className="mt-2 text-slate-200 font-semibold">{msg.sections.recommendedAction}</p>
                      </div>

                      {msg.rawData && (
                        <button
                          onClick={() => setSelectedRawData(msg.rawData)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 mt-4"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Inspect Query Context Details</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          {/* Quick-Click Template Suggestions */}
          <div className="flex gap-2 overflow-x-auto pb-2 pr-2 scrollbar-none">
            {templates.map((temp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(temp.query)}
                disabled={loading}
                className="py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg text-[10px] font-bold text-slate-400 shrink-0 transition-colors"
              >
                {temp.title}
              </button>
            ))}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask a question about stocks, blockages, delay chains, or margins..."
              className="flex-1 bg-slate-900/60 border border-slate-800 focus:outline-none focus:border-indigo-500 rounded-lg px-4 py-3 text-xs text-slate-200 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Data Inspector Panel */}
      {selectedRawData && (
        <div className="w-80 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Query SQL Context Inspector</span>
            <button onClick={() => setSelectedRawData(null)} className="text-[10px] text-slate-500 hover:text-white font-bold">Clear</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto text-[10px] font-mono text-slate-400 bg-slate-950/80">
            <pre className="whitespace-pre-wrap">{JSON.stringify(selectedRawData, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
