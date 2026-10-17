import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReelSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.muteBtnSkeleton} />
      <View style={styles.sideActionsSkeleton}>
        <View style={styles.circleSkeleton} />
        <View style={styles.circleSkeleton} />
        <View style={styles.circleSkeleton} />
      </View>
      <View style={styles.bottomInfoSkeleton}>
        <View style={styles.badgeSkeleton} />
        <View style={styles.ownerSkeleton}>
          <View style={styles.avatarSkeleton} />
          <View style={styles.nameSkeleton} />
        </View>
        <View style={styles.lineSkeleton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#030712',
    position: 'relative',
  },
  muteBtnSkeleton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sideActionsSkeleton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    gap: 16,
    alignItems: 'center',
  },
  circleSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomInfoSkeleton: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 74,
    gap: 10,
  },
  badgeSkeleton: {
    width: 120,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ownerSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarSkeleton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  nameSkeleton: {
    width: 100,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  lineSkeleton: {
    width: '90%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});