import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { Play, Pause, Check, CheckCheck, Reply } from 'lucide-react-native';
import { useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface MessageBubbleProps {
  msg: any;
  isMine: boolean;
  isHighlighted?: boolean;
  onSwipeReply?: (msg: any) => void;
  onPressReplyBox?: (replyToId: string) => void;
  onPressImage?: (url: string) => void;
}

function VoicePlayerItem({ url, isMine }: { url: string; isMine: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(url, (p) => { p.loop = false; });

  const togglePlay = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  return (
    <View style={styles.voiceRow}>
      <TouchableOpacity onPress={togglePlay} style={[styles.voiceBtn, isMine ? styles.voiceBtnMine : styles.voiceBtnOther]}>
        {isPlaying ? <Pause size={15} color={isMine ? '#14b8a6' : '#ffffff'} fill={isMine ? '#14b8a6' : '#ffffff'} /> : <Play size={15} color={isMine ? '#14b8a6' : '#ffffff'} fill={isMine ? '#14b8a6' : '#ffffff'} />}
      </TouchableOpacity>
      <View style={styles.voiceProgress}>
        <View style={styles.progressBar} />
        <Text style={[styles.voiceDurationText, isMine ? styles.timeMine : styles.timeOther]}>پیام صوتی</Text>
      </View>
    </View>
  );
}

function MessageBubbleComponent({ msg, isMine, isHighlighted, onSwipeReply, onPressReplyBox, onPressImage }: MessageBubbleProps) {
  const isVoice = msg.mediaType === 'voice' || msg.mediaUrl?.match(/\.(m4a|mp3|wav|ogg|aac)$/i);
  const isImage = msg.mediaType === 'image' || msg.mediaUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  const isRead = Boolean(msg.isRead ?? msg.IsRead);
  const fullMediaUrl = msg.mediaUrl ? getMediaUrl(msg.mediaUrl) : '';

  const pan = useRef(new Animated.Value(0)).current;
  const hasTriggeredHaptic = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 && gestureState.dx > -65) {
          pan.setValue(gestureState.dx);
          if (gestureState.dx < -15 && !hasTriggeredHaptic.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            hasTriggeredHaptic.current = true;
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx <= -15) {
          onSwipeReply?.(msg);
        }
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
        hasTriggeredHaptic.current = false;
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
        hasTriggeredHaptic.current = false;
      },
    })
  ).current;

  const timeStr = (() => {
    try {
      const d = new Date(msg.createdAt);
      return toFarsiDigits(`${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
    } catch { return ''; }
  })();

  return (
    <View style={styles.outerRow} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.bubbleWrapper,
          isMine ? styles.wrapperMine : styles.wrapperOther,
          { transform: [{ translateX: pan }] },
        ]}
      >
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther, isHighlighted && styles.bubbleHighlighted]}>
          
          {msg.replyToContent ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => msg.replyToId && onPressReplyBox?.(msg.replyToId)}
              style={[styles.quotedBox, isMine ? styles.quotedMine : styles.quotedOther]}
            >
              <Text style={styles.quotedName} numberOfLines={1}>{msg.replyToSenderName || 'کاربر'}</Text>
              <Text style={styles.quotedText} numberOfLines={1}>{msg.replyToContent}</Text>
            </TouchableOpacity>
          ) : null}

          {isImage && fullMediaUrl ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => onPressImage?.(fullMediaUrl)} style={styles.mediaFrame}>
              <Image source={{ uri: fullMediaUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </TouchableOpacity>
          ) : null}

          {isVoice && fullMediaUrl ? (
            <VoicePlayerItem url={fullMediaUrl} isMine={isMine} />
          ) : null}

          {msg.content ? (
            <Text style={[styles.messageText, isMine ? styles.textMine : styles.textOther]}>{msg.content}</Text>
          ) : null}

          <View style={styles.metaBox}>
            <Text style={[styles.timeText, isMine ? styles.timeMine : styles.timeOther]}>{timeStr}</Text>
            {isMine && (
              isRead ? <CheckCheck size={14} color="#042f2e" strokeWidth={2.5} /> : <Check size={14} color="#042f2e" strokeWidth={2.5} />
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.replyIconContainer,
          {
            opacity: pan.interpolate({ inputRange: [-25, -10, 0], outputRange: [1, 0.5, 0], extrapolate: 'clamp' }),
            transform: [{ scale: pan.interpolate({ inputRange: [-25, -10, 0], outputRange: [1, 0.7, 0.2], extrapolate: 'clamp' }) }],
          },
        ]}
      >
        <View style={styles.replyIconCircle}>
          <Reply size={15} color="#ffffff" />
        </View>
      </Animated.View>
    </View>
  );
}

// 🟢 بهینه‌سازی ۱۰۰ درصدی برای رفع لگ لیست
export default React.memo(MessageBubbleComponent, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.isMine === nextProps.isMine &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.msg.isRead === nextProps.msg.isRead &&
    prevProps.msg.content === nextProps.msg.content
  );
});

const styles = StyleSheet.create({
  outerRow: { width: '100%', marginVertical: 3, position: 'relative', justifyContent: 'center' },
  bubbleWrapper: { maxWidth: '82%' },
  wrapperMine: { alignSelf: 'flex-end' },
  wrapperOther: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, borderRadius: 18, gap: 4 },
  bubbleMine: { backgroundColor: '#14b8a6', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#162232', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  bubbleHighlighted: { borderWidth: 2, borderColor: '#38bdf8', backgroundColor: 'rgba(20, 184, 166, 0.35)' },
  quotedBox: { borderRightWidth: 3, borderRightColor: '#0f766e', paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(0, 0, 0, 0.12)', borderRadius: 6, marginBottom: 4 },
  quotedMine: { borderRightColor: '#042f2e' },
  quotedOther: { borderRightColor: '#2dd4bf' },
  quotedName: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff' },
  quotedText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: 'rgba(255, 255, 255, 0.8)' },
  messageText: { fontFamily: 'Ravi-Regular', fontSize: 13.5, lineHeight: 22, textAlign: 'right' },
  textMine: { color: '#030712', fontFamily: 'Ravi-Bold' },
  textOther: { color: '#f8fafc' },
  voiceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 4, minWidth: 160 },
  voiceBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  voiceBtnMine: { backgroundColor: '#030712' },
  voiceBtnOther: { backgroundColor: '#14b8a6' },
  voiceProgress: { flex: 1, gap: 4 },
  progressBar: { height: 3, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 2, width: '100%' },
  voiceDurationText: { fontFamily: 'Ravi-Regular', fontSize: 9.5 },
  mediaFrame: { width: 230, height: 160, borderRadius: 14, overflow: 'hidden', backgroundColor: '#030712', marginBottom: 4 },
  metaBox: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 2 },
  timeText: { fontFamily: 'Ravi-Regular', fontSize: 10 },
  timeMine: { color: '#042f2e' },
  timeOther: { color: '#64748b' },
  replyIconContainer: { position: 'absolute', right: 12, alignItems: 'center', justifyContent: 'center' },
  replyIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center', elevation: 3 },
});