import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { messagingService } from '../../services/messagingService';
import { relationshipService } from '../../services/relationshipService';
import { Conversation, Message, Profile } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  MessageSquare,
  Send,
  User,
  Plus,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const MessagingPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New Chat Modal State
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [availableRecipients, setAvailableRecipients] = useState<Profile[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [initialChatMessage, setInitialChatMessage] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [startChatError, setStartChatError] = useState<string | null>(null);

  // Mobile View Toggle: 'list' or 'chat'
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const convs = await messagingService.getUserConversations(user.id);
      setConversations(convs);
      if (convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when active conversation changes
  const loadMessages = useCallback(async (convId: string) => {
    if (!user?.id) return;
    try {
      setLoadingMessages(true);
      setSendError(null);
      const msgs = await messagingService.getConversationMessages(convId, user.id);
      setMessages(msgs);
      await messagingService.markConversationRead(convId, user.id);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !activeConvId || !newMessageText.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const sent = await messagingService.sendMessage(activeConvId, user.id, newMessageText.trim());
      setMessages((prev) => [...prev, sent]);
      setNewMessageText('');
      await loadConversations();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setSendError(err.message || 'Mesaj gönderilemedi. Lütfen bağlantınızı kontrol edin.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenNewChat = async () => {
    setNewChatModalOpen(true);
    setStartChatError(null);
    try {
      if (!user?.id) return;
      let recipients: Profile[] = [];
      if (user.role === 'coach') {
        const assigned = await relationshipService.getCoachAssignedStudents(user.id);
        const all = await relationshipService.getAllUsersAdmin();
        const otherEligible = all.filter((u) => u.id !== user.id && !assigned.some((a) => a.id === u.id));
        recipients = [...assigned, ...otherEligible];
      } else if (user.role === 'student') {
        const all = await relationshipService.getAllUsersAdmin();
        const coachesAndTeachers = all.filter((u) => u.id !== user.id && (u.role === 'coach' || u.role === 'teacher'));
        const others = all.filter((u) => u.id !== user.id && u.role !== 'coach' && u.role !== 'teacher');
        recipients = [...coachesAndTeachers, ...others];
      } else {
        const all = await relationshipService.getAllUsersAdmin();
        recipients = all.filter((u) => u.id !== user.id);
      }
      setAvailableRecipients(recipients);
      if (recipients.length > 0) setSelectedRecipientId(recipients[0].id);
    } catch (err) {
      console.error('Error loading potential chat partners:', err);
    }
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedRecipientId) return;
    setStartingChat(true);
    setStartChatError(null);
    try {
      const convId = await messagingService.startConversation(
        user.id,
        selectedRecipientId,
        initialChatMessage.trim() || undefined
      );
      setNewChatModalOpen(false);
      setInitialChatMessage('');
      setActiveConvId(convId);
      setMobileView('chat');
      await loadConversations();
      await loadMessages(convId);
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      setStartChatError(err.message || 'Sohbet başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setStartingChat(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const otherParticipant = activeConversation?.participants?.find((p) => p.id !== user?.id);

  if (loading) {
    return <LoadingState message="Güvenli mesajlaşma kanalı yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Doğrudan İletişim & Danışma
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Akademik Mesajlaşma Merkezi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğretmenleriniz, danışmanlarınız ve sınıf arkadaşlarınızla güvenli uçtan uca iletişim.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenNewChat}
        >
          Yeni Sohbet Başlat
        </Button>
      </div>

      {/* Main Messaging Container (Responsive split layout) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 min-h-[550px] max-h-[700px]">
        {/* Left Panel: Conversation List (Visible on mobile if mobileView === 'list') */}
        <div
          className={`md:col-span-4 lg:col-span-4 border-r border-zinc-800 flex flex-col ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Sohbetler ({conversations.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-850">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                Henüz aktif bir sohbetiniz bulunmuyor.
              </div>
            ) : (
              conversations.map((conv) => {
                const partner = conv.participants?.find((p) => p.id !== user?.id);
                const isActive = conv.id === activeConvId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setMobileView('chat');
                    }}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isActive
                        ? 'bg-zinc-800/80 border-l-4 border-amber-500'
                        : 'hover:bg-zinc-850/50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0 overflow-hidden">
                      {partner?.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        partner?.first_name?.charAt(0) || 'M'
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-100 truncate">
                          {partner
                            ? `${partner.first_name} ${partner.last_name}`
                            : conv.title || 'Sohbet'}
                        </span>
                        {conv.last_message && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(conv.last_message.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] text-zinc-400 truncate">
                          {conv.last_message?.content || 'Mesajlaşma başlatıldı'}
                        </p>
                        {partner?.role && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 capitalize font-mono shrink-0 ml-2">
                            {partner.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Conversation Stream (Visible on mobile if mobileView === 'chat') */}
        <div
          className={`md:col-span-8 lg:col-span-8 flex flex-col bg-zinc-950/40 ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1 text-zinc-400 hover:text-zinc-100 mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0 overflow-hidden">
                    {otherParticipant?.avatar_url ? (
                      <img
                        src={otherParticipant.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      otherParticipant?.first_name?.charAt(0) || 'M'
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-zinc-100">
                      {otherParticipant
                        ? `${otherParticipant.first_name} ${otherParticipant.last_name}`
                        : activeConversation.title || 'Sohbet'}
                    </h3>
                    <span className="text-[10px] text-zinc-500 capitalize">
                      {otherParticipant?.role || 'Üye'} &bull; Mahfaza Doğrulanmış İletişim
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="hidden sm:inline">Uçtan Uca Şifreli</span>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="text-center py-12 text-xs text-zinc-500">
                    Mesaj geçmişi yükleniyor...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500">
                    Bu sohbette henüz mesaj bulunmuyor. İlk mesajı yazarak iletişime geçin.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3.5 py-2.5 text-xs ${
                            isMine
                              ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-xs'
                              : 'bg-zinc-800 text-zinc-100 rounded-tl-xs border border-zinc-700/60'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <div
                            className={`text-[9px] font-mono mt-1 text-right ${
                              isMine ? 'text-zinc-900/80' : 'text-zinc-400'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Error Alert */}
              {sendError && (
                <div className="px-3 py-1.5 bg-rose-950/40 border-t border-rose-900/50 text-[11px] text-rose-300 flex items-center justify-between">
                  <span>{sendError}</span>
                  <button type="button" onClick={() => setSendError(null)} className="text-rose-400 hover:text-rose-200 ml-2">×</button>
                </div>
              )}

              {/* Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Mesajınızı yazın..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newMessageText.trim() || sending}
                  isLoading={sending}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Gönder
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <MessageSquare className="w-12 h-12 mb-3 text-zinc-700" />
              <h3 className="text-sm font-semibold text-zinc-300">Bir Sohbet Seçin</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Görüşmelerinizi incelemek veya yeni bir mesaj başlatmak için sol listeden seçim yapın.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setNewChatModalOpen(false)}
          title="Yeni Sohbet Başlat"
          maxWidth="md"
        >
          <form onSubmit={handleStartChat} className="space-y-4">
            {startChatError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded text-xs text-rose-300">
                {startChatError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Kişi Seçin
              </label>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
              >
                {availableRecipients.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.first_name} {rec.last_name} ({rec.role}) &bull; {rec.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                İlk Mesaj (İsteğe bağlı)
              </label>
              <textarea
                rows={3}
                value={initialChatMessage}
                onChange={(e) => setInitialChatMessage(e.target.value)}
                placeholder="Merhaba, bir konu hakkında danışmak istiyordum..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setNewChatModalOpen(false)}
              >
                İptal
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={startingChat}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Sohbeti Başlat
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
