import { useEffect, useMemo, useRef, useState } from 'react';
import useChatSocket from '../hooks/useChatSocket.js';
import { getMessages, sendMessage } from '../services/chatService';

const TYPING_STOP_DELAY_MS = 2000;

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatClosesAt(isoString) {
  if (!isoString) return '';
  const hoursLeft = Math.max(0, Math.round((new Date(isoString) - Date.now()) / (60 * 60 * 1000)));
  return hoursLeft <= 1 ? 'closes within the hour' : `closes in about ${hoursLeft}h`;
}

function ChatPanel({
  appointmentId,
  title,
  token,
  currentUserId,
  chatOpen: initialChatOpen,
  chatClosesAt: initialChatClosesAt,
  onClose,
  onMessagesRead,
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(initialChatOpen);
  const [chatClosesAt, setChatClosesAt] = useState(initialChatClosesAt);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  function appendMessage(message) {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  const { emitTyping } = useChatSocket(appointmentId, token, {
    onMessage: (message) => {
      appendMessage(message);
      if (message.sender !== currentUserId) setOtherIsTyping(false);
    },
    onTyping: (payload) => {
      if (payload.userId !== currentUserId) setOtherIsTyping(Boolean(payload.isTyping));
    },
    onRead: (payload) => {
      if (payload.readBy !== currentUserId) setOtherReadAt(payload.readAt);
    },
  });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError('');

    getMessages(appointmentId, token)
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages);
        setChatOpen(data.chatOpen);
        setChatClosesAt(data.chatClosesAt);
        onMessagesRead?.();
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, token, onMessagesRead]);

  // If a message arrives from the other participant while this panel is
  // open, tell the server it's been read (GET .../messages does the
  // marking) so unread badges elsewhere clear without the user reopening
  // the panel.
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.sender === currentUserId || last.readAt) return;

    getMessages(appointmentId, token)
      .then(() => onMessagesRead?.())
      .catch(() => {});
  }, [messages, appointmentId, token, currentUserId, onMessagesRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    },
    [],
  );

  function handleDraftChange(event) {
    setDraft(event.target.value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(false);
    }, TYPING_STOP_DELAY_MS);
  }

  async function handleSend(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setIsSending(true);
    setSendError('');
    try {
      const { message } = await sendMessage(appointmentId, body, token);
      appendMessage(message);
      setDraft('');
      isTypingRef.current = false;
      emitTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setIsSending(false);
    }
  }

  const lastOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === currentUserId) return messages[i].id;
    }
    return null;
  }, [messages, currentUserId]);

  const lastOwnMessageSeen = useMemo(() => {
    if (!lastOwnMessageId || !otherReadAt) return false;
    const lastOwn = messages.find((m) => m.id === lastOwnMessageId);
    return lastOwn && new Date(otherReadAt) >= new Date(lastOwn.createdAt);
  }, [lastOwnMessageId, otherReadAt, messages]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-panel-title"
        className="flex h-[32rem] w-full max-w-md flex-col rounded-lg bg-white shadow-xl dark:bg-stone-900"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <div>
            <h2 id="chat-panel-title" className="font-semibold text-stone-900 dark:text-white">
              {title}
            </h2>
            {chatOpen && chatClosesAt ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {formatClosesAt(chatClosesAt)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-md p-1 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Loading conversation…</p>
          ) : loadError ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {loadError}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No messages yet. Say hello.
            </p>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender === currentUserId;
              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isOwn
                        ? 'bg-teal-600 text-white'
                        : 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p
                      className={`mt-1 text-right text-[11px] ${
                        isOwn ? 'text-teal-100' : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      {formatTime(message.createdAt)}
                      {isOwn && message.id === lastOwnMessageId && lastOwnMessageSeen
                        ? ' · Seen'
                        : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {otherIsTyping ? (
            <p className="text-xs italic text-stone-500 dark:text-stone-400">Typing…</p>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {sendError ? (
          <p role="alert" className="px-4 text-sm text-red-600 dark:text-red-400">
            {sendError}
          </p>
        ) : null}

        {chatOpen ? (
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-stone-200 p-3 dark:border-stone-800">
            <label htmlFor="chat-message-input" className="sr-only">
              Message
            </label>
            <input
              id="chat-message-input"
              type="text"
              value={draft}
              onChange={handleDraftChange}
              placeholder="Type a message…"
              maxLength={2000}
              className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-white"
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        ) : (
          <div className="border-t border-stone-200 px-4 py-3 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
            This conversation is closed.
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPanel;
export { formatClosesAt };
