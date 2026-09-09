import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, Send, Sparkles, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { voiceService } from '../services/voiceService';
import { sendCopilotMessage, CopilotResponse } from '../services/geminiService';
import { CopilotMessage, CalculatorState } from '../types';

interface VoiceCopilotProps {
  calculator: CalculatorState;
  onUpdateCalculator: (newCalc: Partial<CalculatorState>) => void;
  onNavigateTab: (tab: 'copilot' | 'radar' | 'calculator' | 'itbi') => void;
  onFilterRadar: (filter: { city?: string; maxPrice?: number; sortBy?: string }) => void;
}

export const VoiceCopilot: React.FC<VoiceCopilotProps> = ({
  calculator,
  onUpdateCalculator,
  onNavigateTab,
  onFilterRadar
}) => {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      text: 'Olá, Marcus! Sou seu copiloto de inteligência imobiliária com Google Gemini. Você pode falar comigo por voz para calcular leilões, buscar oportunidades na Caixa ou pesquisar o ITBI de qualquer bairro.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    voiceService.setCallbacks({
      onListeningStateChange: (listening) => setIsListening(listening),
      onTranscriptChange: (text, isFinal) => {
        setTranscript(text);
        if (isFinal && text.trim().length > 2) {
          handleSendMessage(text);
          setTranscript('');
          voiceService.stopListening();
        }
      },
      onAudioLevel: (level) => setAudioLevel(level)
    });

    return () => {
      voiceService.stopListening();
      voiceService.stopSpeaking();
    };
  }, [messages, calculator]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    setTranscript('');

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response: CopilotResponse = await sendCopilotMessage(text, messages, calculator);

      const geminiMsg: CopilotMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        text: response.replyText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        actionExecuted: response.action as any
      };

      setMessages((prev) => [...prev, geminiMsg]);

      // Execute action dispatched by Gemini
      if (response.action) {
        if (response.action.type === 'fill_calculator') {
          onUpdateCalculator({
            ...response.action.data,
            lastUpdatedByVoice: true
          });
        } else if (response.action.type === 'filter_radar') {
          onFilterRadar(response.action.data);
        } else if (response.action.type === 'switch_tab') {
          onNavigateTab(response.action.data.tab);
        }
      }

      // Voice back response if autoSpeak is active
      if (autoSpeak && response.replyText) {
        voiceService.speak(response.replyText);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'system',
          text: `Erro ao comunicar com o Copiloto: ${e.message}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      voiceService.stopListening();
    } else {
      voiceService.startListening();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-lg mx-auto w-full px-4 pt-2 pb-2">
      {/* Header & Voice Controls */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
            Copiloto Gemini AI
          </span>
        </div>
        <button
          onClick={() => {
            const nextState = !autoSpeak;
            setAutoSpeak(nextState);
            if (!nextState) voiceService.stopSpeaking();
          }}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
            autoSpeak
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800/60 text-slate-400 border-slate-700'
          }`}
        >
          {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{autoSpeak ? 'Voz Ativa' : 'Voz Muda'}</span>
        </button>
      </div>

      {/* Voice Visualizer Orb Section (Top Hero) */}
      <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-slate-900/80 to-slate-950/40 rounded-2xl border border-slate-800/60 mb-3 relative overflow-hidden shadow-lg">
        <div className="relative flex items-center justify-center">
          {/* Animated Glow Rings */}
          <motion.div
            animate={{
              scale: isListening ? 1 + audioLevel * 0.8 : 1,
              opacity: isListening ? 0.8 : 0.2
            }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            className="absolute w-28 h-28 rounded-full bg-amber-500/30 blur-xl pointer-events-none"
          />
          <motion.div
            animate={{
              scale: isListening ? 1 + audioLevel * 0.5 : [1, 1.05, 1],
              rotate: isListening ? [0, 90, 180, 270, 360] : 0
            }}
            transition={{
              scale: { type: 'spring', damping: 12 },
              rotate: { repeat: Infinity, duration: 8, ease: 'linear' }
            }}
            className="absolute w-20 h-20 rounded-full border-2 border-dashed border-amber-400/50 pointer-events-none"
          />

          {/* Central Interactive Voice Button */}
          <button
            onClick={toggleMic}
            className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
              isListening
                ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 text-slate-950 ring-4 ring-amber-400/50 shadow-amber-500/50'
                : 'bg-gradient-to-tr from-slate-800 via-slate-850 to-slate-800 text-amber-400 border border-amber-500/30 hover:border-amber-400/70 shadow-black'
            }`}
          >
            {isListening ? (
              <Mic className="w-8 h-8 animate-pulse text-slate-950" />
            ) : (
              <Mic className="w-7 h-7 text-amber-400" />
            )}
          </button>
        </div>

        {/* Live Audio Status Text */}
        <div className="mt-3 text-center px-4">
          <p className="text-xs font-bold text-slate-200">
            {isListening ? (
              <span className="text-amber-400 animate-pulse">Ouvindo você falar...</span>
            ) : isProcessing ? (
              <span className="text-sky-400 flex items-center justify-center space-x-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Gemini analisando e executando...</span>
              </span>
            ) : (
              <span className="text-slate-400">Toque no microfone para falar</span>
            )}
          </p>

          {transcript && (
            <p className="text-xs text-amber-300/90 font-mono mt-1 italic max-w-xs truncate">
              "{transcript}"
            </p>
          )}
        </div>

        {/* Quick Voice Suggestions */}
        {!isListening && messages.length <= 2 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 px-2">
            {[
              'Calcular 80m² em Icaraí por 200 mil',
              'Melhores da Caixa no Rio',
              'Valor m² em São Mateus JF'
            ].map((sug) => (
              <button
                key={sug}
                onClick={() => handleSendMessage(sug)}
                className="text-[10px] font-medium px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-full text-slate-300 transition-colors"
              >
                "{sug}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none shadow-amber-950/20'
                  : msg.sender === 'system'
                  ? 'bg-red-950/60 border border-red-500/30 text-red-200'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {/* Action Executed Badge */}
              {msg.actionExecuted && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{msg.actionExecuted.summary}</span>
                  </div>
                  {msg.actionExecuted.type === 'fill_calculator' && (
                    <button
                      onClick={() => onNavigateTab('calculator')}
                      className="ml-2 text-amber-400 hover:underline flex items-center space-x-0.5"
                    >
                      <span>Ver</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {msg.actionExecuted.type === 'filter_radar' && (
                    <button
                      onClick={() => onNavigateTab('radar')}
                      className="ml-2 text-amber-400 hover:underline flex items-center space-x-0.5"
                    >
                      <span>Ver Radar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">{msg.timestamp}</span>
          </motion.div>
        ))}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Gemini digitando e calculando...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Manual Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="mt-2 flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-full p-1.5 shadow-lg"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Digite ou fale com o Gemini..."
          className="flex-1 bg-transparent px-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center justify-center transition-all cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
