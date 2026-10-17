import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Heart, CornerDownLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../../api/axiosClient';

interface TabCommentsProps {
  movieId: string;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
  onLayoutHeight?: (height: number) => void;
}

export default function TabComments({ movieId, onToast, onLayoutHeight }: TabCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/comments/1/${movieId}`);
      if (res.data?.comments) {
        const fetched = res.data.comments;
        setComments(fetched);

        const ids = new Set<string>();
        const collectIds = (list: any[]) => {
          list.forEach((c) => {
            if (c.userId) ids.add(c.userId);
            if (c.replies) collectIds(c.replies);
          });
        };
        collectIds(fetched);

        const userIds = Array.from(ids);
        if (userIds.length > 0) {
          const userRes = await api.post('/profile/users/batch', userIds);
          const map: Record<string, any> = {};
          (userRes.data || []).forEach((u: any) => {
            map[u.id] = u;
          });
          setUsers(map);
        }
      }
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [movieId]);

  const handleSendComment = async (parentId: string | null = null) => {
    const text = parentId ? replyText : commentText;
    if (!text.trim() || submitting) return;

    try {
      setSubmitting(true);
      await api.post('/comments', {
        entityId: movieId,
        entityType: 1,
        text: text.trim(),
        parentId,
      });
      if (parentId) {
        setReplyText('');
        setActiveReplyId(null);
      } else {
        setCommentText('');
      }
      onToast?.('دیدگاه شما با موفقیت ثبت شد', 'success');
      await fetchComments();
    } catch {
      onToast?.('خطا در ثبت دیدگاه', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await api.post(`/comments/${commentId}/like`);
      await fetchComments();
    } catch {}
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && onLayoutHeight) {
          onLayoutHeight(h);
        }
      }}
    >
      {/* باکس ارسال نظر */}
      <View style={styles.commentInputBox}>
        <TextInput
          placeholder="دیدگاه خود را بنویسید..."
          placeholderTextColor="#64748b"
          value={commentText}
          onChangeText={setCommentText}
          multiline
          style={styles.commentTextInput}
        />
        <View style={styles.commentActionRow}>
          <TouchableOpacity
            style={[
              styles.sendCommentBtn,
              (!commentText.trim() || submitting) && styles.sendCommentBtnDisabled,
            ]}
            disabled={!commentText.trim() || submitting}
            onPress={() => handleSendComment(null)}
          >
            <Text style={styles.sendCommentBtnText}>
              {submitting ? 'در حال ثبت...' : 'ارسال دیدگاه'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#14b8a6" />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>اولین دیدگاه را شما برای این فیلم ثبت کنید.</Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              users={users}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              replyText={replyText}
              setReplyText={setReplyText}
              onSendReply={(pId: string) => handleSendComment(pId)}
              onLikeComment={handleLikeComment}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CommentItem({
  comment,
  users,
  activeReplyId,
  setActiveReplyId,
  replyText,
  setReplyText,
  onSendReply,
  onLikeComment,
  level = 0,
}: any) {
  const [showReplies, setShowReplies] = useState(false);
  const user = users[comment.userId];
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <View style={[styles.commentItemCard, level > 0 && styles.commentReplyCard]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentUserInfo}>
          <Image
            source={{ uri: getMediaUrl(user?.avatar || user?.avatarUrl) }}
            style={styles.commentAvatar}
            contentFit="cover"
          />
          <Text style={styles.commentUserName}>{user?.name || user?.username || 'کاربر پرشات'}</Text>
        </View>

        <TouchableOpacity style={styles.commentLikeBtn} onPress={() => onLikeComment(comment.id)}>
          <Heart
            size={14}
            color={comment.isLiked ? '#f43f5e' : '#64748b'}
            fill={comment.isLiked ? '#f43f5e' : 'none'}
          />
          <Text style={styles.commentLikeCount}>{toFarsiDigits(comment.likesCount || 0)}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.commentTextContent}>{comment.text}</Text>

      <View style={styles.commentFooter}>
        {hasReplies ? (
          <TouchableOpacity style={styles.showRepliesBtn} onPress={() => setShowReplies(!showReplies)}>
            {showReplies ? <ChevronUp size={14} color="#14b8a6" /> : <ChevronDown size={14} color="#14b8a6" />}
            <Text style={styles.showRepliesText}>
              {showReplies ? 'بستن پاسخ‌ها' : `مشاهده ${toFarsiDigits(comment.replies.length)} پاسخ`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <TouchableOpacity
          style={styles.replyTriggerBtn}
          onPress={() => {
            setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
            setReplyText('');
          }}
        >
          <CornerDownLeft size={13} color="#94a3b8" />
          <Text style={styles.replyTriggerText}>پاسخ</Text>
        </TouchableOpacity>
      </View>

      {activeReplyId === comment.id && (
        <View style={styles.replyInputBox}>
          <TextInput
            placeholder="پاسخ خود را بنویسید..."
            placeholderTextColor="#64748b"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            style={styles.replyTextInput}
          />
          <View style={styles.replyActionRow}>
            <TouchableOpacity style={styles.replyCancelBtn} onPress={() => setActiveReplyId(null)}>
              <Text style={styles.replyCancelText}>لغو</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.replySubmitBtn} onPress={() => onSendReply(comment.id)}>
              <Text style={styles.replySubmitText}>ارسال پاسخ</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showReplies && hasReplies && (
        <View style={styles.repliesWrapper}>
          {comment.replies.map((child: any) => (
            <CommentItem
              key={child.id}
              comment={child}
              users={users}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              replyText={replyText}
              setReplyText={setReplyText}
              onSendReply={onSendReply}
              onLikeComment={onLikeComment}
              level={level + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  commentInputBox: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  commentTextInput: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'right',
    minHeight: 50,
  },
  commentActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  sendCommentBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  sendCommentBtnDisabled: {
    opacity: 0.4,
  },
  sendCommentBtnText: {
    color: '#030712',
    fontSize: 11,
    fontWeight: 'bold',
  },
  commentsList: {
    gap: 12,
  },
  commentItemCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  commentReplyCard: {
    marginRight: 14,
    borderRightWidth: 2,
    borderRightColor: '#14b8a6',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  commentHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUserInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
  },
  commentUserName: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: 'bold',
  },
  commentLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    color: '#64748b',
    fontSize: 10,
  },
  commentTextContent: {
    color: '#cbd5e1',
    fontSize: 11.5,
    lineHeight: 20,
    textAlign: 'right',
  },
  commentFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  showRepliesBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  showRepliesText: {
    color: '#14b8a6',
    fontSize: 10,
    fontWeight: 'bold',
  },
  replyTriggerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  replyTriggerText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  replyInputBox: {
    backgroundColor: '#0b0f17',
    borderRadius: 10,
    padding: 8,
    gap: 6,
    marginTop: 6,
  },
  replyTextInput: {
    color: '#ffffff',
    fontSize: 11,
    textAlign: 'right',
    minHeight: 36,
  },
  replyActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  replyCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  replyCancelText: {
    color: '#64748b',
    fontSize: 10,
  },
  replySubmitBtn: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  replySubmitText: {
    color: '#030712',
    fontSize: 10,
    fontWeight: 'bold',
  },
  repliesWrapper: {
    gap: 8,
    marginTop: 8,
  },
  centerContainer: {
    paddingVertical: 35,
    alignItems: 'center',
  },
  emptyCard: {
    paddingVertical: 35,
    alignItems: 'center',
  },
  emptyCardText: {
    color: '#64748b',
    fontSize: 12,
  },
});