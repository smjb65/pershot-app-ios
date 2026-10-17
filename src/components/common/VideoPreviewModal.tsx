import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X } from 'lucide-react-native';

interface VideoPreviewModalProps {
  visible: boolean;
  videoUrl: string | null;
  onClose: () => void;
  title?: string;
}

function InnerPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
      contentFit="contain"
    />
  );
}

export default function VideoPreviewModal({
  visible,
  videoUrl,
  onClose,
  title = 'پیش‌نمایش ویدیو',
}: VideoPreviewModalProps) {
  if (!visible || !videoUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.videoContainer}>
            <InnerPlayer videoUrl={videoUrl} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0c1222',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  videoContainer: {
    width: '100%',
    height: 420,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});