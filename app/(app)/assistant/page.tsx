"use client";

import { useState, useEffect } from "react";

interface Citation {
  ruleKey: string;
  source: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "simple" | "show_me" | "do_it_for_me";
  citations?: Citation[];
  fallbackToReferral?: boolean;
  requiresConfirmation?: boolean;
  rating?: "thumbs_up" | "thumbs_down";
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      role: "assistant",
      content: "Hello! I am your AI Business Operating System Assistant. Ask me anything about what your business needs to stay compliant, Vault documents, or business changes.",
      mode: "simple",
      citations: [],
    },
  ]);

  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<"simple" | "show_me" | "do_it_for_me">("simple");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  const handleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      content: input,
      mode: activeMode,
    };

    const textLower = input.toLowerCase();
    setInput("");

    setMessages((prev) => [...prev, userMsg]);

    // Simulate Assistant Response & Tool Execution
    setTimeout(() => {
      let botMsg: Message;

      if (textLower.includes("hired") || textLower.includes("new branch")) {
        botMsg = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: "I noticed you reported a business operational update. Would you like me to record this event and re-evaluate your compliance requirements (e.g. State PAYE & ITF filing requirements)?",
          mode: activeMode,
          requiresConfirmation: true,
        };
      } else if (textLower.includes("file anything") || textLower.includes("this month") || textLower.includes("due")) {
        botMsg = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: "Based on reviewed statutory regulations (CAMA 2020 s. 822 & CITA Cap C21):\n\n1. **CAC Annual Returns**: Due June 30 (CAC CAMA 2020 s. 822)\n2. **FIRS Companies Income Tax (CIT)**: Due June 30 (CITA Cap C21 LFN 2004)",
          mode: activeMode,
          citations: [
            { ruleKey: "CAC_ANNUAL_RETURNS", source: "CAMA 2020 s. 822" },
            { ruleKey: "FIRS_CIT_FILING", source: "Companies Income Tax Act (CITA) Cap C21 LFN 2004" },
          ],
        };
      } else {
        botMsg = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: "I don't have a reviewed statutory answer for that yet — here's who can help:\n\nWe recommend speaking with a verified legal or accounting professional on the AI Business Passport marketplace.",
          mode: activeMode,
          fallbackToReferral: true,
        };
      }

      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  const handleConfirmChange = (msgId: string) => {
    setActionNotice("Business change event confirmed and recorded! Statutory compliance rules re-evaluated.");
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, content: m.content + "\n\n✓ **Confirmed & Processed.**", requiresConfirmation: false } : m
      )
    );
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleRateMessage = (msgId: string, rating: "thumbs_up" | "thumbs_down") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, rating } : m))
    );
    setActionNotice(`Thank you for your feedback! (${rating === "thumbs_up" ? "👍" : "👎"})`);
    setTimeout(() => setActionNotice(null), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl flex flex-col h-[calc(100vh-5rem)] px-4 py-4 sm:px-6">
      {/* Top Header & Mode Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI Business Assistant</h1>
          <p className="text-xs text-gray-500">Grounded in verified statutory rules & your Business Brain</p>
        </div>

        {/* 3 Explicit Modes Switcher */}
        <div className="flex rounded-lg border bg-gray-100 p-1 text-xs">
          <button
            onClick={() => setActiveMode("simple")}
            className={`rounded px-3 py-1 font-bold transition-all ${
              activeMode === "simple" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
            }`}
          >
            Simple Answer
          </button>
          <button
            onClick={() => setActiveMode("show_me")}
            className={`rounded px-3 py-1 font-bold transition-all ${
              activeMode === "show_me" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
            }`}
          >
            Show Me
          </button>
          <button
            onClick={() => setActiveMode("do_it_for_me")}
            className={`rounded px-3 py-1 font-bold transition-all ${
              activeMode === "do_it_for_me" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
            }`}
          >
            Do It For Me
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="my-2 rounded-lg bg-green-50 p-2.5 text-xs font-semibold text-green-800 border border-green-200">
          ✓ {actionNotice}
        </div>
      )}

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col max-w-[85%] rounded-xl p-4 text-xs space-y-2.5 ${
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white rounded-br-none"
                : "mr-auto bg-white border border-gray-200 text-gray-900 shadow-sm rounded-bl-none"
            }`}
          >
            <div className="whitespace-pre-wrap">{m.content}</div>

            {/* Citations Pill List */}
            {m.citations && m.citations.length > 0 && (
              <div className="border-t pt-2 space-y-1 text-[11px]">
                <span className="font-bold text-gray-500 uppercase tracking-wider">Citations:</span>
                {m.citations.map((c, i) => (
                  <div key={i} className="rounded bg-blue-50 p-1.5 text-blue-800 font-mono">
                    [{c.ruleKey}] {c.source}
                  </div>
                ))}
              </div>
            )}

            {/* Fallback Referral Card */}
            {m.fallbackToReferral && (
              <div className="mt-2 rounded-lg bg-purple-50 p-3 border border-purple-200 space-y-2">
                <span className="font-bold text-purple-900 text-xs">Connect with a Marketplace Professional</span>
                <p className="text-[11px] text-purple-800">Speak with an accredited lawyer or accountant for unreviewed queries.</p>
                <a
                  href="/marketplace"
                  className="inline-block rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700"
                >
                  Find a Professional
                </a>
              </div>
            )}

            {/* Requires Confirmation Card */}
            {m.requiresConfirmation && (
              <div className="mt-2 rounded-lg bg-amber-50 p-3 border border-amber-200 space-y-2">
                <span className="font-bold text-amber-900 text-xs">Confirmation Required</span>
                <p className="text-[11px] text-amber-800">Recording this event will update your Business Brain and compliance obligations.</p>
                <button
                  onClick={() => handleConfirmChange(m.id)}
                  className="rounded bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-700"
                >
                  Confirm Business Change
                </button>
              </div>
            )}

            {/* Thumbs Up / Down Rating Buttons */}
            {m.role === "assistant" && (
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => handleRateMessage(m.id, "thumbs_up")}
                  className={`p-1 text-gray-400 hover:text-green-600 ${m.rating === "thumbs_up" ? "text-green-600 font-bold" : ""}`}
                >
                  👍
                </button>
                <button
                  onClick={() => handleRateMessage(m.id, "thumbs_down")}
                  className={`p-1 text-gray-400 hover:text-red-600 ${m.rating === "thumbs_down" ? "text-red-600 font-bold" : ""}`}
                >
                  👎
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Form Bar */}
      <div className="border-t pt-3 flex items-center gap-2">
        {speechSupported && (
          <button
            onClick={handleVoiceInput}
            className={`rounded-full p-2.5 border transition-colors ${
              isListening ? "bg-red-100 text-red-600 border-red-300 animate-pulse" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Voice Input (Web Speech API)"
          >
            🎤
          </button>
        )}

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={`Ask a question in ${activeMode.toUpperCase().replace(/_/g, " ")} mode...`}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <button
          onClick={handleSend}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
