import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { X, Heart, Reply, ChevronDown, ChevronUp } from 'lucide-react-native';

import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface ReelCommentsModalProps {
  isOpen: boolean;
  reelId: string;
  onClose: () => void;
  onCommentCountUpdate?: (reelId: string, count: number) => void;
}

interface UserMap {
  [userId: string]: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
}

// 🟢 آیکون ارسال پایدار و بدون باگ چرخش در اندروید (جهت چپ‌چین برای فارسی)
function SendIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
      <Path d="M21.99 21L1 12 21.99 3 22 10l-15 2 15 2z" />
    </Svg>
  );
}

export default function ReelCommentsModal({
  isOpen,
  reelId,
  onClose,
  onCommentCountUpdate,
}: ReelCommentsModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [comments, setComments] = useState<any[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 🟢 استماع دقیق ارتفاع کیبورد برای قرارگیری بی‌نقص در اندروید و iOS
  useEffect(() => {
    const onShow = (e: any) => {
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const fetchUsersBatch = async (userIds: string[]) => {
    try {
      const res = await api.post('/profile/users/batch', userIds);
      const userList = res.data || [];
      const userMapping: UserMap = {};
      userList.forEach((u: any) => {
        userMapping[u.id] = u;
      });
      setUsers(userMapping);
    } catch (err) {
      console.error('Batch user fetch error:', err);
    }
  };

  const fetchComments = useCallback(async () => {
    if (!reelId) return;
    setLoading(true);
    try {
      const res = await api.get(`/comments/3/${reelId}`);
      const fetched = res.data.comments || [];
      setComments(fetched);

      if (onCommentCountUpdate) {
        onCommentCountUpdate(reelId, fetched.length);
      }

      const userIdsSet = new Set<string>();
      const collectIds = (list: any[]) => {
        list.forEach((item) => {
          if (item.userId) userIdsSet.add(item.userId);
          if (item.replies && item.replies.length > 0) {
            collectIds(item.replies);
          }
        });
      };
      collectIds(fetched);

      const userIds = Array.from(userIdsSet);
      if (userIds.length > 0) {
        fetchUsersBatch(userIds);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [reelId, onCommentCountUpdate]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  const handleAddComment = async () => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/comments', {
        entityId: reelId,
        entityType: 3,
        text: text.trim(),
        parentId: replyTo?.id || null,
      });
      setText('');
      setReplyTo(null);
      await fetchComments();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const res = await api.post(`/comments/${commentId}/like`);
      if (res.data?.success) {
        await fetchComments();
      }
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const canSend = text.trim().length > 0 && !isSubmitting;

  // محاسبه ارتفاع مدال تا حتی با باز شدن کیبورد، هدر از بالای صفحه خارج نشود
  const modalSheetHeight =
    keyboardHeight > 0
      ? Math.min(windowHeight * 0.58, windowHeight - keyboardHeight - (insets.top || 24) - 20)
      : windowHeight * 0.74;

  const handleCloseModal = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCloseModal}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCloseModal}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheetContainer,
            {
              height: modalSheetHeight,
              marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
            },
          ]}
        >
          {/* هدر مدال دیدگاه‌ها */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>دیدگاه‌ها</Text>
              <Text style={styles.headerCount}>({toFarsiDigits(comments.length)})</Text>
            </View>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* لیست دیدگاه‌ها */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color="#14b8a6" />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>اولین دیدگاه را برای این اثر ثبت کنید.</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <CommentItem
                  comment={item}
                  users={users}
                  onLike={handleLikeComment}
                  onReply={(c: any) => setReplyTo(c)}
                />
              )}
            />
          )}

          {/* نوار ارسال دیدگاه: رعایت فاصله تا دکمه‌های ناوبری موبایل */}
          <View
            style={[
              styles.inputContainer,
              {
                paddingBottom:
                  keyboardHeight > 0
                    ? 10
                    : Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 12) + 6,
              },
            ]}
          >
            {replyTo && (
              <View style={styles.replyBar}>
                <Text style={styles.replyText} numberOfLines={1}>
                  در پاسخ به: {replyTo.text?.substring(0, 25)}...
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <X size={14} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="دیدگاه خود را بنویسید..."
                placeholderTextColor="#64748b"
              />
              <TouchableOpacity
                style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnDisabled]}
                disabled={!canSend}
                activeOpacity={0.8}
                onPress={handleAddComment}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={canSend ? '#030712' : '#14b8a6'} />
                ) : (
                  <SendIcon color={canSend ? '#030712' : '#94a3b8'} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ردیف کامنت و پاسخ‌های تودرتو
function CommentItem({ comment, users, onLike, onReply, level = 0 }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const userProfile = users[comment.userId];
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isLiked = Boolean(comment.isLiked);

  return (
    <View style={[styles.commentItem, level > 0 && styles.replyCommentItem]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentUserBox}>
          <View style={styles.commentAvatarWrapper}>
            {userProfile?.avatar ? (
              <Image source={{ uri: getMediaUrl(userProfile.avatar) }} style={styles.commentAvatar} />
            ) : (
              <View style={styles.commentAvatarPlaceholder}>
                <Text style={styles.avatarInitialText}>
                  {userProfile?.name?.[0] || userProfile?.username?.[0] || 'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.commentUserName}>
            {userProfile?.name || userProfile?.username || 'کاربر پرشات'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.commentLikeBtn}
          onPress={() => onLike(comment.id)}
        >
          <Heart
            size={15}
            color={isLiked ? '#f43f5e' : '#64748b'}
            fill={isLiked ? '#f43f5e' : 'transparent'}
          />
          <Text style={styles.commentLikesCount}>{toFarsiDigits(comment.likesCount || 0)}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.commentBodyText}>{comment.text}</Text>

      <View style={styles.commentFooter}>
        {hasReplies ? (
          <TouchableOpacity
            style={styles.viewRepliesBtn}
            onPress={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronUp size={14} color="#14b8a6" /> : <ChevronDown size={14} color="#14b8a6" />}
            <Text style={styles.viewRepliesText}>
              {isOpen ? 'بستن' : `مشاهده ${toFarsiDigits(comment.replies.length)} پاسخ`}
            </Text>
          </TouchableOpacity>
        ) : <View />}

        <TouchableOpacity style={styles.replyBtn} onPress={() => onReply(comment)}>
          <Reply size={13} color="#64748b" style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={styles.replyBtnText}>پاسخ</Text>
        </TouchableOpacity>
      </View>

      {isOpen && hasReplies && (
        <View style={styles.repliesList}>
          {comment.replies.map((child: any) => (
            <CommentItem
              key={child.id}
              comment={child}
              users={users}
              onLike={onLike}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: '#0c1017',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 14,
    color: '#ffffff',
    includeFontPadding: false,
  },
  headerCount: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#14b8a6',
    includeFontPadding: false,
  },
  closeBtn: {
    padding: 6,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#64748b',
    includeFontPadding: false,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  inputContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: '#080d14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  replyBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#2dd4bf',
    includeFontPadding: false,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#162232',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontFamily: 'Ravi-Regular',
    fontSize: 12.5,
    color: '#ffffff',
    textAlign: 'right',
    includeFontPadding: false,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#14b8a6',
  },
  sendBtnDisabled: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 18,
    gap: 6,
  },
  replyCommentItem: {
    marginRight: 14,
    borderRightWidth: 2,
    borderRightColor: '#14b8a6',
  },
  commentHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUserBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatarWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
  },
  commentAvatar: {
    width: '100%',
    height: '100%',
  },
  commentAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontFamily: 'Ravi-Black',
    fontSize: 11,
    color: '#ffffff',
    includeFontPadding: false,
  },
  commentUserName: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#ffffff',
    includeFontPadding: false,
  },
  commentLikeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  commentLikesCount: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10,
    color: '#64748b',
    includeFontPadding: false,
  },
  commentBodyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12.5,
    lineHeight: 20,
    color: '#cbd5e1',
    textAlign: 'right',
    includeFontPadding: false,
  },
  commentFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  viewRepliesBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  viewRepliesText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10,
    color: '#14b8a6',
    includeFontPadding: false,
  },
  replyBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  replyBtnText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#64748b',
    includeFontPadding: false,
  },
  repliesList: {
    marginTop: 8,
    gap: 8,
  },
});