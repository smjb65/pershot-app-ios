import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react-native';
import { api, toFarsiDigits } from '../../api/axiosClient';

interface MovieActionsProps {
  movieId: string;
  initialLikePercentage?: number;
  onLikeChange?: (pct: number) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function MovieActions({
  movieId,
  initialLikePercentage = 0,
  onLikeChange,
  onToast,
}: MovieActionsProps) {
  const [userAction, setUserAction] = useState<'like' | 'dislike' | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likePercentage, setLikePercentage] = useState(initialLikePercentage);

  useEffect(() => {
    let isMounted = true;
    api
      .get(`/movies/${movieId}/user-interaction`)
      .then((res) => {
        if (!isMounted || !res.data) return;
        if (res.data.isLiked) setUserAction('like');
        else if (res.data.isDisliked) setUserAction('dislike');
        setIsBookmarked(Boolean(res.data.isBookmarked));
        if (res.data.likePercentage !== undefined) {
          const pct = Math.round(res.data.likePercentage);
          setLikePercentage(pct);
          onLikeChange?.(pct);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [movieId]);

  // ثبت لایک / دیس‌لایک
  const handleRate = async (type: 'like' | 'dislike') => {
    const isLike = type === 'like';
    const prevAction = userAction;
    setUserAction(userAction === type ? null : type);

    try {
      const res = await api.post(`/movies/${movieId}/rate?isLike=${isLike}`);
      if (res.data?.likePercentage !== undefined) {
        const pct = Math.round(res.data.likePercentage);
        setLikePercentage(pct);
        onLikeChange?.(pct);
      }
      onToast(isLike ? 'پسندیدن فیلم ثبت شد' : 'نپسندیدن فیلم ثبت شد', 'success');
    } catch (err: any) {
      setUserAction(prevAction);
      const errMsg =
        err.response?.data?.message ||
        'تنها کاربرانی که بیش از ۳۰٪ فیلم را تماشا کرده‌اند امکان ثبت نظر دارند.';
      onToast(errMsg, 'error');
    }
  };

  // ثبت بوک‌مارک
  const handleBookmark = async () => {
    const prev = isBookmarked;
    setIsBookmarked(!prev);

    try {
      const res = await api.post(`/movies/${movieId}/bookmark`);
      const isSaved = Boolean(res.data?.isBookmarked);
      setIsBookmarked(isSaved);
      onToast(
        isSaved ? 'فیلم به لیست نشان‌شده‌ها اضافه شد' : 'فیلم از لیست نشان‌شده‌ها حذف شد',
        'success'
      );
    } catch (err: any) {
      setIsBookmarked(prev);
      const errMsg =
        err.response?.status === 401
          ? 'لطفاً ابتدا وارد حساب کاربری خود شوید'
          : err.response?.data?.message || 'بروز خطا در نشان کردن فیلم';
      onToast(errMsg, 'error');
    }
  };

  return (
    <View style={styles.container}>
      {/* ۱. لایک (سمت راست) */}
      <TouchableOpacity
        style={[styles.actionBtn, styles.likeBtnFlex, userAction === 'like' && styles.actionBtnLike]}
        activeOpacity={0.8}
        onPress={() => handleRate('like')}
      >
        <ThumbsUp size={18} color={userAction === 'like' ? '#ffffff' : '#cbd5e1'} />
        {likePercentage > 0 && (
          <Text style={[styles.actionLikeText, userAction === 'like' && { color: '#ffffff' }]}>
            {toFarsiDigits(likePercentage)}٪
          </Text>
        )}
      </TouchableOpacity>

      {/* ۲. دیس‌لایک (وسط) */}
      <TouchableOpacity
        style={[styles.actionBtn, userAction === 'dislike' && styles.actionBtnDislike]}
        activeOpacity={0.8}
        onPress={() => handleRate('dislike')}
      >
        <ThumbsDown size={18} color={userAction === 'dislike' ? '#ffffff' : '#cbd5e1'} />
      </TouchableOpacity>

      {/* ۳. نشان‌کردن (سمت چپ) */}
      <TouchableOpacity
        style={[styles.actionBtn, isBookmarked && styles.actionBtnBookmarkActive]}
        activeOpacity={0.8}
        onPress={handleBookmark}
      >
        <Bookmark
          size={18}
          color={isBookmarked ? '#030712' : '#cbd5e1'}
          fill={isBookmarked ? '#030712' : 'none'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  likeBtnFlex: {
    flex: 1.4,
  },
  actionBtnLike: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  actionBtnDislike: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  actionBtnBookmarkActive: {
    backgroundColor: '#ffffff',
  },
  actionLikeText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
  },
});