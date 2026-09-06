import React, { useState, useEffect, useRef } from 'react';
import { AuctionProperty } from '../types.ts';
import { 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  HelpCircle, 
  Building2, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatAssistantProps {
  auctions: AuctionProperty[];
  selectedAuctionId: string | null;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export default function ChatAssistant({ auctions, selectedAuctionId }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Olá! Sou o seu Assistente de Leilões. Escolha um imóvel de referência abaixo ou faça uma pergunta geral sobre viabilidade, preços de ITBI municipal e riscos para começar!',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedPropId, setSelectedPropId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with main app selection
  useEffect(() => {
    if (selectedAuctionId) {
      setSelectedPropId(selectedAuctionId);
    }
  }, [selectedAuctionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          propertyId: selectedPropId || null,
          history: messages.slice(-10).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com o servidor de chat.');
      }

      const data = await response.json();
      const botMsg: Message = {
        sender: 'bot',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
      console.error(e);
      const errorMsg: Message = {
        sender: 'bot',
        text: 'Desculpe, ocorreu uma falha de conexão com o painel de Inteligência Artificial. Verifique o servidor local e tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const selectedProperty = auctions.find(a => a.id === selectedPropId);

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNewNotification(false);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 border border-blue-400/20"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        
        {/* Animated Notification Dot */}
        {hasNewNotification && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[10px] text-white font-bold items-center justify-center">1</span>
          </span>
        )}
      </motion.button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-18 right-0 w-96 h-[520px] bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header Panel */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 shrink-0 flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">Chat do Investidor</h3>
                    <span className="text-[9px] text-slate-400 font-medium">Powered by Gemini AI</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Context Selector Dropdown */}
              <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full text-[10.5px] bg-transparent text-white focus:outline-none font-medium border-0 cursor-pointer"
                >
                  <option value="" className="bg-slate-800 text-white">Análise Geral (Todos os Imóveis)</option>
                  {auctions.map(auc => (
                    <option key={auc.id} value={auc.id} className="bg-slate-800 text-white truncate">
                      {auc.neighborhood} - {auc.propertyType} ({auc.sizeSqm}m²)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
              {messages.map((msg, index) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div 
                    key={index} 
                    className={`flex items-start space-x-2 ${!isBot ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    {isBot && (
                      <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                    )}
                    <div className="flex flex-col max-w-[80%]">
                      <div className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                        isBot 
                          ? 'bg-white text-slate-800 border border-slate-200/60 rounded-tl-none' 
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}>
                        {/* Basic line break rendering */}
                        {msg.text.split('\n').map((line, i) => (
                          <p key={i} className={line === '' ? 'h-2' : 'mb-0.5'}>
                            {line}
                          </p>
                        ))}
                      </div>
                      <span className={`text-[8.5px] text-gray-400 mt-1 ${!isBot ? 'text-right' : ''}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start space-x-2">
                  <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-xs flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Panel */}
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex flex-wrap gap-1.5 shrink-0">
              {selectedPropId ? (
                <>
                  <button 
                    onClick={() => handleQuickQuestion('Qual o lucro e ROI estimado deste imóvel?')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    💰 Lucro & ROI
                  </button>
                  <button 
                    onClick={() => handleQuickQuestion('Este imóvel é viável com base no ITBI médio do bairro?')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    ⚖️ Viabilidade ITBI
                  </button>
                  <button 
                    onClick={() => handleQuickQuestion('Quais os principais riscos de dívidas ou ocupação?')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    ⚠️ Riscos do Lote
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleQuickQuestion('Quais bairros têm melhor margem de retorno de ITBI?')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    📈 Melhores Margens
                  </button>
                  <button 
                    onClick={() => handleQuickQuestion('Como funciona o cálculo de ROI de caixa na planilha?')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    🧮 Explicação de ROI
                  </button>
                </>
              )}
            </div>

            {/* Input Form Footer */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Faça uma pergunta sobre o leilão..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 text-xs border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
