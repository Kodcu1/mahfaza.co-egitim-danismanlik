import { supabase } from '../lib/supabase';
import { Conversation, Message, Profile } from '../types';

export const messagingService = {
  /**
   * Fetch conversations the user is a participant of (based on real Supabase messages table)
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      // Find all messages where user is either sender or receiver
      const { data: allMsgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error || !allMsgs || allMsgs.length === 0) {
        return [];
      }

      // Group by chat partner
      const partnerIds = new Set<string>();
      const partnerLastMsg = new Map<string, any>();
      const partnerUnread = new Map<string, number>();

      for (const m of allMsgs) {
        const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
        if (!partnerId) continue;
        partnerIds.add(partnerId);
        if (!partnerLastMsg.has(partnerId)) {
          partnerLastMsg.set(partnerId, m);
        }
        if (m.receiver_id === userId && !m.is_read) {
          partnerUnread.set(partnerId, (partnerUnread.get(partnerId) || 0) + 1);
        }
      }

      if (partnerIds.size === 0) return [];

      // Fetch profiles for all conversation partners
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(partnerIds));

      if (pErr || !profiles) return [];

      const conversations: Conversation[] = [];
      for (const rawP of profiles) {
        const displayName = rawP.full_name || rawP.name || `${rawP.first_name || ''} ${rawP.last_name || ''}`.trim() || rawP.email;
        const p: Profile = {
          ...rawP,
          first_name: rawP.first_name || displayName.split(' ')[0] || 'Kullanıcı',
          last_name: rawP.last_name || displayName.split(' ').slice(1).join(' ') || '',
        };

        const lastMsg = partnerLastMsg.get(p.id);
        conversations.push({
          id: p.id,
          title: displayName,
          created_at: lastMsg?.created_at || new Date().toISOString(),
          updated_at: lastMsg?.created_at || new Date().toISOString(),
          participants: [
            { id: userId } as Profile,
            p,
          ],
          last_message: lastMsg
            ? {
                id: lastMsg.id,
                conversation_id: p.id,
                sender_id: lastMsg.sender_id,
                content: lastMsg.content,
                created_at: lastMsg.created_at,
                sender: lastMsg.sender_id === userId ? undefined : p,
              }
            : undefined,
          unread_count: partnerUnread.get(p.id) || 0,
        });
      }

      return conversations.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  },

  /**
   * Fetch all messages in a conversation (between current user and partner/convId)
   */
  async getConversationMessages(conversationId: string, currentUserId?: string): Promise<Message[]> {
    try {
      let myId = currentUserId;
      if (!myId) {
        const { data: authData } = await supabase.auth.getUser();
        myId = authData?.user?.id;
      }
      if (!myId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);

      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
      let profileMap = new Map<string, Profile>();
      if (senderIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('id', senderIds);
        if (profs) {
          profs.forEach((pr: any) => {
            const displayName = pr.full_name || pr.name || `${pr.first_name || ''} ${pr.last_name || ''}`.trim() || pr.email;
            profileMap.set(pr.id, {
              ...pr,
              first_name: pr.first_name || displayName.split(' ')[0] || 'Kullanıcı',
              last_name: pr.last_name || displayName.split(' ').slice(1).join(' ') || '',
            });
          });
        }
      }

      return (data || []).map((m: any) => ({
        id: m.id,
        conversation_id: conversationId,
        sender_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
        sender: profileMap.get(m.sender_id),
      }));
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      return [];
    }
  },

  /**
   * Send a new message to a conversation partner
   */
  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: msgId,
        sender_id: senderId,
        receiver_id: conversationId,
        content: content.trim(),
        is_read: false,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    const { data: senderProf } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', senderId)
      .maybeSingle();

    let senderObj: Profile | undefined;
    if (senderProf) {
      const displayName = senderProf.full_name || senderProf.name || `${senderProf.first_name || ''} ${senderProf.last_name || ''}`.trim() || senderProf.email;
      senderObj = {
        ...senderProf,
        first_name: senderProf.first_name || displayName.split(' ')[0] || 'Kullanıcı',
        last_name: senderProf.last_name || displayName.split(' ').slice(1).join(' ') || '',
      };
    }

    return {
      id: data.id,
      conversation_id: conversationId,
      sender_id: data.sender_id,
      content: data.content,
      created_at: data.created_at,
      sender: senderObj,
    };
  },

  /**
   * Start a 1-to-1 conversation with another user
   */
  async startConversation(
    currentUserId: string,
    recipientId: string,
    initialMessage?: string
  ): Promise<string> {
    if (initialMessage && initialMessage.trim()) {
      await this.sendMessage(recipientId, currentUserId, initialMessage.trim());
    }
    return recipientId;
  },

  /**
   * Mark conversation messages as read
   */
  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', conversationId)
        .eq('is_read', false);
    } catch {
      // ignore
    }
  },

  /**
   * Get unread message count
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },
};
