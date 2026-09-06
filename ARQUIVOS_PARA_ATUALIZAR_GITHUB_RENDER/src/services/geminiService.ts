import { CopilotMessage, CalculatorState, AuctionProperty } from '../types';

export interface CopilotResponse {
  replyText: string;
  action?: {
    type: 'fill_calculator' | 'filter_radar' | 'itbi_lookup' | 'switch_tab';
    data: any;
    summary: string;
  };
}

export async function sendCopilotMessage(
  userText: string,
  history: CopilotMessage[],
  currentCalculator: CalculatorState
): Promise<CopilotResponse> {
  try {
    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: userText,
        history: history.slice(-6).map(h => ({
          role: h.sender === 'user' ? 'user' : 'model',
          text: h.text
        })),
        currentCalculator
      })
    });

    if (!res.ok) {
      throw new Error(`Erro na API Gemini: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to communicate with Gemini Copilot:', err);
    return {
      replyText: `Desculpe, não consegui processar no momento: ${err.message || 'Erro de conexão'}`
    };
  }
}
