import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { messagingService } from '../../services/messagingService';
import { relationshipService } from '../../services/relationshipService';
import { Conversation, Message, Profile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
import {
  MessageSquare,
  Send,
  Plus,
  ArrowLeft,
  ShieldCheck,
  Search,
  CheckCheck,
} from 'lucide-react';

export const MessagingPage: React.FC = () => {
  const { user, role, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
      const userRole = role || profile?.role || 'student';

      if (userRole === 'coach' || userRole === 'head_coach') {
        const assigned = await relationshipService.getCoachAssignedStudents(user.id);
        const all = await relationshipService.getAllUsersAdmin();
        const otherEligible = all.filter((u) => u.id !== user.id && !assigned.some((a) => a.id === u.id));
        recipients = [...assigned, ...otherEligible];
      } else if (userRole === 'student') {
        const assignedCoach = await relationshipService.getStudentAssignedCoach(user.id);
        const allCoaches = await relationshipService.getProfilesByRole('coach');
        const allTeachers = await relationshipService.getProfilesByRole('teacher');

        const pool: Profile[] = [];
        if (assignedCoach) pool.push(assignedCoach);
        pool.push(...allCoaches);
        pool.push(...allTeachers);

        const seen = new Set<string>();
        recipients = pool.filter((p) => {
          if (!p || seen.has(p.id) || p.id === user.id) return false;
          seen.add(p.id);
          return true;
        });
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

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const partner = c.participants?.find((p) => p.id !== user?.id);
    const partnerName = partner
      ? `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || partner.full_name || partner.name || partner.email
      : '';
    return partnerName.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  if (loading) {
    return <LoadingState message="Güvenli mesajlaşma kanalı yükleniyor..." />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Uçtan Uca Güvenli İletişim
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Canlı Mesajlaşma Odası
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Öğretmenleriniz, danışmanlarınız ve koçunuzla WhatsApp Web akışında anlık iletişim kurun.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenNewChat}
        >
          Yeni Sohbet Başlat
        </Button>
      </div>

      {sendError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {sendError}
        </div>
      )}

      {/* WhatsApp Web Split Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row h-[680px]">
        {/* Left Column: 340px conversation list */}
        <div
          className={`w-full md:w-[340px] border-r border-slate-200 flex flex-col h-full bg-white shrink-0 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* WhatsApp Style Left Header */}
          <div className="p-3.5 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-800 font-bold flex items-center justify-center text-xs">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile?.first_name?.charAt(0) || 'M'
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {profile?.full_name || 'Sohbetlerim'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {conversations.length} aktif görüşme
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenNewChat}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-full transition-colors"
              title="Yeni Sohbet"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-2.5 bg-white border-b border-slate-100">
            <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Sohbet veya kişi ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none placeholder:text-slate-400 text-xs"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Henüz aktif bir sohbet bulunamadı.</p>
                <button
                  onClick={handleOpenNewChat}
                  className="mt-3 text-emerald-600 hover:underline font-semibold cursor-pointer"
                >
                  Yeni bir sohbet başlatın &rarr;
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const partner = conv.participants?.find((p) => p.id !== user?.id);
                const isActive = conv.id === activeConvId;
                const partnerName = partner
                  ? `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || partner.full_name || partner.name || partner.email
                  : 'Sohbet';

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setMobileView('chat');
                    }}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-[#f0f2f5] border-l-4 border-[#00a884]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                      {partner?.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        partnerName.charAt(0) || 'U'
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {partnerName}
                        </span>
                        {conv.last_message && (
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(conv.last_message.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] text-slate-500 truncate flex-1">
                          {conv.last_message?.content || 'Sohbet başlatıldı'}
                        </p>
                        {partner?.role && (
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 uppercase shrink-0">
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

        {/* Right Column: WhatsApp Web Active Chat Area */}
        <div
          className={`flex-1 flex flex-col h-full bg-[#efeae2] relative ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
          style={{
            backgroundImage: `radial-gradient(#d5cdc4 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        >
          {activeConversation && otherParticipant ? (
            <>
              {/* WhatsApp Active Chat Header */}
              <div className="px-4 py-3 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg"
                    title="Geri"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-800 shrink-0">
                    {otherParticipant.avatar_url ? (
                      <img
                        src={otherParticipant.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      otherParticipant.first_name?.charAt(0) || otherParticipant.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {otherParticipant.first_name
                        ? `${otherParticipant.first_name} ${otherParticipant.last_name || ''}`.trim()
                        : otherParticipant.full_name || otherParticipant.name || otherParticipant.email}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      <span>Çevrimiçi • {otherParticipant.role?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message History List */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
                {/* Security Info Pill */}
                <div className="text-center my-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-100/80 border border-amber-200 text-[11px] text-amber-900 font-medium shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Mesajlar Mahfaza.co korumalı altyapısında uçtan uca saklanmaktadır.
                  </span>
                </div>

                {loadingMessages ? (
                  <div className="text-center text-xs text-slate-500 py-10 font-mono">
                    Mesajlar yükleniyor...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-12">
                    Henüz mesaj bulunmuyor. İlk mesajı yazarak iletişime başlayın!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed relative ${
                            isMine
                              ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs shadow-xs'
                              : 'bg-white text-slate-900 rounded-tl-xs shadow-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>

                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-mono`}
                          >
                            <span>
                              {new Date(m.created_at).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMine && (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-600 inline-block" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* WhatsApp Web Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="bg-[#f0f2f5] px-4 py-3 border-t border-slate-200 flex items-center gap-2.5 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Bir mesaj yazın..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                />

                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white p-2.5 rounded-full shadow-xs transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                  title="Gönder"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="w-16 h-16 rounded-full bg-slate-200/80 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="font-bold text-base text-slate-800">WhatsApp Web Mesajlaşma Odası</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Sohbet etmek için sol taraftaki listeden bir konuşma seçin veya yeni bir sohbet başlatın.
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenNewChat}
                >
                  Yeni Sohbet Başlat
                </Button>
              </div>
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
          maxWidth="sm"
        >
          <form onSubmit={handleStartChat} className="space-y-4">
            {startChatError && (
              <div className="p-3 rounded-xl text-xs bg-rose-50 border border-rose-200 text-rose-800">
                {startChatError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kişi Seçin
              </label>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {availableRecipients.length === 0 ? (
                  <option value="">İletişim kurulabilecek kullanıcı bulunamadı</option>
                ) : (
                  availableRecipients.map((rec) => {
                    const displayName =
                      rec.full_name ||
                      rec.name ||
                      `${rec.first_name || ''} ${rec.last_name || ''}`.trim() ||
                      rec.email;
                    return (
                      <option key={rec.id} value={rec.id}>
                        {displayName} ({rec.role?.toUpperCase()})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                İlk Mesaj (İsteğe bağlı)
              </label>
              <textarea
                rows={3}
                placeholder="Merhaba, bir konu hakkında danışmak istiyordum..."
                value={initialChatMessage}
                onChange={(e) => setInitialChatMessage(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                disabled={!selectedRecipientId || startingChat}
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