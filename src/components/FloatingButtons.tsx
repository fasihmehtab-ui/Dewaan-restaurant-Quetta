import React from 'react';

export default function FloatingButtons() {
  const handleChatbotClick = () => {
    // 1. Check Botpress v2 API (window.botpress.open or toggle)
    const bp = (window as any).botpress;
    if (bp) {
      if (typeof bp.open === 'function') {
        bp.open();
        return;
      }
      if (typeof bp.toggle === 'function') {
        bp.toggle();
        return;
      }
    }

    // 2. Check Botpress WebChat API
    const bpWebChat = (window as any).botpressWebChat;
    if (bpWebChat && typeof bpWebChat.sendEvent === 'function') {
      bpWebChat.sendEvent({ type: 'show' });
      return;
    }

    // 3. Fallback: Find any Botpress injected launcher button or iframe in DOM and click it
    const bpLauncher = document.querySelector(
      'button[aria-label*="chat" i], button[aria-label*="botpress" i], .bp-widget-button, #bp-web-widget'
    ) as HTMLElement | null;

    if (bpLauncher) {
      bpLauncher.click();
      return;
    }

    // 4. Retry if still initializing
    setTimeout(() => {
      const retryBp = (window as any).botpress;
      if (retryBp?.open) {
        retryBp.open();
      }
    }, 400);
  };

  return (
    <button 
      type="button"
      onClick={handleChatbotClick}
      aria-label="Dewaan Chatbot"
      className="fixed bottom-6 left-6 w-14 h-14 bg-white rounded-full shadow-lg z-50 flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
    >
      💬
    </button>
  );
}
