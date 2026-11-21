import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  GestureResponderEvent,
  Animated,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import * as NavigationBar from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Settings,
  RotateCcw,
  SkipForward,
  ExternalLink,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface AdvancedVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  movieId: string;
  userId?: string;
  isMainMovie?: boolean;
  onClose: () => void;
}

interface AdData {
  id: string;
  title: string;
  videoUrl?: string;
  streamUrl?: string;
  posterUrl?: string;
  targetUrl: string;
  skipOffsetSeconds: number;
  durationSeconds: number;
}

interface QualityOption {
  label: string;
  url: string;
  height: number;
}

type GestureType = 'none' | 'seek' | 'volume' | 'brightness';

export default function AdvancedVideoPlayer({
  src,
  poster,
  title,
  movieId,
  userId,
  isMainMovie = true,
  onClose,
}: AdvancedVideoPlayerProps) {
  useKeepAwake();

  // 🟢 دریافت ابعاد فیزیکی و کامل نمایشگر (screen) جهت نادیده گرفتن حاشیه‌های اضافی نوار ناوبری[cite: 14]
  const { width: rawW, height: rawH } = Dimensions.get('screen');
  const playerWidth = Math.max(rawW, rawH);
  const playerHeight = Math.min(rawW, rawH);

  const mainVideoUrl = useMemo(() => getMediaUrl(src), [src]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  // صدا و روشنایی
  const [volume, setVolume] = useState(1);
  const volumeRef = useRef(1);
  const lastAppliedVolumeRef = useRef(1);
  const lastVolumeTimeRef = useRef(0);

  const [isMuted, setIsMuted] = useState(false);
  const [brightness, setBrightness] = useState(0.8);
  const brightnessRef = useRef(0.8);
  const lastBrightnessTimeRef = useRef(0);

  const [isZoomFit, setIsZoomFit] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // کنترل‌ها و انیمیشن
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMoveTimeRef = useRef(0);

  // کیفیت و سرعت
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'quality' | 'speed'>('quality');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableQualities, setAvailableQualities] = useState<QualityOption[]>([]);
  const [selectedQualityUrl, setSelectedQualityUrl] = useState<string>('auto');

  // نوار زمان ویدیو
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const progressBarLayoutRef = useRef<{ pageX: number; width: number }>({ pageX: 0, width: 0 });
  const progressBarRef = useRef<View>(null);

  // وضعیت تبلیغات
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const isPlayingAdRef = useRef(false);
  const [currentAd, setCurrentAd] = useState<AdData | null>(null);
  const currentAdRef = useRef<AdData | null>(null);
  const [skipCountDown, setSkipCountDown] = useState(0);
  const [canSkipAd, setCanSkipAd] = useState(false);
  const adTrackedRef = useRef(false);
  const adFetchedRef = useRef(false);

  // ادامه تماشا
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedResumeTime, setSavedResumeTime] = useState(0);

  const accumulatedSecondsRef = useRef(0);
  const lastTimeRef = useRef(0);
  const storageKey = `pershot_movie_progress_${movieId}`;

  // ژست‌های لمسی
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const gestureTypeRef = useRef<GestureType>('none');
  const initialGestureValRef = useRef({ volume: 1, brightness: 1, time: 0 });
  const targetSeekTimeRef = useRef(0);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isPlayingAdRef.current = isPlayingAd;
  }, [isPlayingAd]);

  useEffect(() => {
    currentAdRef.current = currentAd;
  }, [currentAd]);

  // راه‌اندازی اولیه‌ی پلیر
  const player = useVideoPlayer(mainVideoUrl, (p) => {
    p.loop = false;
    p.muted = isMuted;
    p.volume = volume;
    p.playbackRate = playbackRate;
    p.pause();
  });

  // تعویض سورس بدون لگ و بدون ایجاد صفحه سیاه
  const switchVideoSource = async (url: string) => {
    if (!player || !url) return;
    try {
      if (Platform.OS === 'ios' && typeof (player as any).replaceAsync === 'function') {
        await (player as any).replaceAsync(url);
      } else {
        player.replace(url);
      }
    } catch {
      try {
        player.replace(url);
      } catch {}
    }
  };

  useEffect(() => {
    async function lockAndHideSystemBars() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          // تبدیل نوار ناوبری به شناور و کاملاً شفاف جهت پوشش تمام‌صفحه
          if (typeof NavigationBar?.setPositionAsync === 'function') {
            await NavigationBar.setPositionAsync('absolute');
            await NavigationBar.setBackgroundColorAsync('#00000000');
          }
          if (typeof NavigationBar?.setVisibilityAsync === 'function') {
            await NavigationBar.setVisibilityAsync('hidden');
          }
          if (typeof NavigationBar?.setBehaviorAsync === 'function') {
            await NavigationBar.setBehaviorAsync('overlay-swipe');
          }
        }
      } catch {}
    }

    async function initDeviceBrightness() {
      try {
        if (typeof Brightness?.getBrightnessAsync === 'function') {
          const curBri = await Brightness.getBrightnessAsync();
          if (curBri !== null && curBri !== undefined && curBri > 0) {
            setBrightness(curBri);
            brightnessRef.current = curBri;
          }
        }
      } catch {}
    }

    lockAndHideSystemBars();
    initDeviceBrightness();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      try {
        Brightness.restoreSystemBrightnessAsync?.().catch(() => {});
      } catch {}

      if (Platform.OS === 'android') {
        try {
          // فقط در صورت نیاز نوار را مجدداً نمایان می‌کنیم، بدون تغییر پوزیشن و رنگ پس‌زمینه
          if (typeof NavigationBar?.setVisibilityAsync === 'function') {
            NavigationBar.setVisibilityAsync('visible').catch(() => {});
          }
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (!player) return;
    const playSub = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
      if (event.isPlaying) {
        setIsBuffering(false);
      }
    });

    const statusSub = player.addListener('statusChange', (payload: any) => {
      const status = payload?.status || payload;
      if (status === 'readyToPlay' || status === 'playing') {
        setIsBuffering(false);
      }
    });

    return () => {
      playSub.remove();
      statusSub?.remove?.();
    };
  }, [player]);

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    if (!showControls && Platform.OS === 'android') {
      try {
        if (typeof NavigationBar?.setVisibilityAsync === 'function') {
          NavigationBar.setVisibilityAsync('hidden').catch(() => {});
        }
      } catch {}
    }
  }, [showControls, controlsOpacity]);

  const showFeedback = (msg: string, autoDismiss = false) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setFeedbackText(msg);
    if (autoDismiss) {
      feedbackTimerRef.current = setTimeout(() => {
        setFeedbackText(null);
      }, 900);
    }
  };

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (showSettingsMenu) return;

    if (isPlaying && !showResumePrompt && !isPlayingAd && !isScrubbing) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying, showResumePrompt, isPlayingAd, isScrubbing, showSettingsMenu]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    resetHideTimer();
  }, [resetHideTimer]);

  useEffect(() => {
    if (showSettingsMenu) {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }

    if (isPlaying && !showResumePrompt && !isPlayingAd && !isScrubbing) {
      resetHideTimer();
    } else {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, showResumePrompt, isPlayingAd, isScrubbing, showSettingsMenu, resetHideTimer]);

  const sendProgressToBackend = useCallback(async () => {
    if (!isMainMovie || isPlayingAdRef.current) return;
    const watched = Math.round(accumulatedSecondsRef.current);
    const currTime = currentTimeRef.current;
    const dur = durationRef.current;

    try {
      if (dur > 0) {
        api.post(`/movies/${movieId}/track-progress`, {
          currentTime: currTime,
          actualWatchedSeconds: watched,
          duration: dur,
        }).catch(() => {});
      }

      api.post('/analytics/log-movie-view', {
        movieId,
        userId: userId || 'Guest',
        watchedSeconds: watched,
        currentTime: currTime,
      }).catch(() => {});
    } catch {}
  }, [isMainMovie, movieId, userId]);

  const loadQualities = useCallback((m3u8Url: string) => {
    fetch(m3u8Url)
      .then((r) => r.text())
      .then((manifest) => {
        const lines = manifest.split('\n');
        const list: QualityOption[] = [];
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && !nextLine.startsWith('#')) {
              const h = resMatch ? parseInt(resMatch[2], 10) : 0;
              let label = '';
              if (h >= 1080) label = `${toFarsiDigits(1080)}p (Full HD)`;
              else if (h >= 720) label = `${toFarsiDigits(720)}p (HD)`;
              else if (h >= 480) label = `${toFarsiDigits(480)}p (SD)`;
              else if (h > 0) label = `${toFarsiDigits(h)}p`;
              else label = 'کیفیت دیگر';

              const streamUrl = nextLine.startsWith('http://') || nextLine.startsWith('https://')
                ? nextLine
                : baseUrl + nextLine;
              list.push({ label, url: streamUrl, height: h });
            }
          }
        }
        list.sort((a, b) => b.height - a.height);
        setAvailableQualities(list);
      })
      .catch(() => setAvailableQualities([]));
  }, []);

  const startActualVideo = useCallback(async () => {
    if (!player) return;

    if (currentAdRef.current && !adTrackedRef.current) {
      adTrackedRef.current = true;
      api.post(`/ads/${currentAdRef.current.id}/track-view`).catch(() => {});
    }

    setIsPlayingAd(false);
    setCurrentAd(null);
    setCurrentTime(0);
    currentTimeRef.current = 0;

    try {
      player.pause();
      await switchVideoSource(mainVideoUrl);
      player.play();
      setIsPlaying(true);
    } catch {}

    if (mainVideoUrl.toLowerCase().includes('.m3u8')) {
      loadQualities(mainVideoUrl);
    }

    if (isMainMovie) {
      try {
        const savedTimeStr = await AsyncStorage.getItem(storageKey);
        if (savedTimeStr) {
          const saved = parseFloat(savedTimeStr);
          if (saved > 5) {
            player.pause();
            setIsPlaying(false);
            setSavedResumeTime(saved);
            setShowResumePrompt(true);
          }
        }
      } catch {}
    }
  }, [mainVideoUrl, player, isMainMovie, storageKey, loadQualities]);

  useEffect(() => {
    if (adFetchedRef.current) return;
    adFetchedRef.current = true;

    let isMounted = true;
    let fallbackTimeout: NodeJS.Timeout;

    if (isMainMovie) {
      api.get('/ads/serve')
        .then(async (res) => {
          if (!isMounted) return;
          const ad = res.data?.ad as AdData | undefined;
          const targetAdUrl = ad?.videoUrl || ad?.streamUrl;

          if (res.data?.hasAd && ad && targetAdUrl) {
            currentAdRef.current = ad;
            setCurrentAd(ad);
            setIsPlayingAd(true);
            setSkipCountDown(ad.skipOffsetSeconds || 5);
            setCanSkipAd(false);

            const adUrl = getMediaUrl(targetAdUrl);
            try {
              player.pause();
              await switchVideoSource(adUrl);
              player.play();
              setIsPlaying(true);
            } catch {
              startActualVideo();
              return;
            }

            fallbackTimeout = setTimeout(() => {
              if (isMounted && isPlayingAdRef.current && currentTimeRef.current === 0) {
                startActualVideo();
              }
            }, 4500);
          } else {
            startActualVideo();
          }
        })
        .catch(() => {
          if (isMounted) startActualVideo();
        });
    } else {
      startActualVideo();
    }

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
    };
  }, [isMainMovie, player, startActualVideo]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!player) return;

      const now = player.currentTime || 0;
      const total = player.duration || 0;

      currentTimeRef.current = now;
      durationRef.current = total;

      if (!isScrubbing && !isBuffering) {
        setCurrentTime(now);
      }
      setDuration(total);

      if (isBuffering && Math.abs(now - scrubTime) < 1.0) {
        setIsBuffering(false);
      }

      if (isPlayingAdRef.current && currentAdRef.current) {
        const ad = currentAdRef.current;
        const skipRem = Math.max(0, Math.ceil((ad.skipOffsetSeconds || 5) - now));
        setSkipCountDown(skipRem);
        if (now >= (ad.skipOffsetSeconds || 5)) {
          setCanSkipAd(true);
        }

        if (total > 0 && now >= total - 0.5) {
          startActualVideo();
        }
      } else {
        const diff = now - lastTimeRef.current;
        if (diff > 0 && diff < 2 && isPlaying) {
          accumulatedSecondsRef.current += diff;
        }
        lastTimeRef.current = now;

        if (isMainMovie && now > 5) {
          AsyncStorage.setItem(storageKey, now.toString()).catch(() => {});
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player, isScrubbing, isBuffering, scrubTime, isPlaying, isMainMovie, storageKey, startActualVideo]);

  useEffect(() => {
    if (!isMainMovie || isPlayingAd) return;

    const tracker = setInterval(() => {
      if (isPlaying) {
        sendProgressToBackend();
      }
    }, 5000);

    return () => clearInterval(tracker);
  }, [isPlaying, isPlayingAd, isMainMovie, sendProgressToBackend]);

  const togglePlayPause = () => {
    if (showResumePrompt) setShowResumePrompt(false);
    if (showSettingsMenu) setShowSettingsMenu(false);
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      sendProgressToBackend();
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    player.muted = nextMute;
    setIsMuted(nextMute);
    showFeedback(nextMute ? 'بی‌صدا' : `صدا: ${toFarsiDigits(Math.round(volumeRef.current * 100))}٪`, true);
  };

  const toggleZoomFit = () => {
    setIsZoomFit((prev) => {
      const next = !prev;
      showFeedback(next ? 'تمام‌‌صفحه (بدون حاشیه)' : 'اندازه استاندارد (کامل)', true);
      return next;
    });
    showControlsTemporarily();
  };

  const handleResumeClick = (resume: boolean) => {
    setShowResumePrompt(false);
    if (resume) {
      player.currentTime = savedResumeTime;
      currentTimeRef.current = savedResumeTime;
      lastTimeRef.current = savedResumeTime;
    } else {
      player.currentTime = 0;
      currentTimeRef.current = 0;
      lastTimeRef.current = 0;
      AsyncStorage.removeItem(storageKey).catch(() => {});
    }
    player.play();
    setIsPlaying(true);
  };

  const handleSkipAd = () => {
    if (canSkipAd) startActualVideo();
  };

  const handleAdClick = async () => {
    if (!currentAd) return;
    try {
      await api.post(`/ads/${currentAd.id}/track-click`);
    } catch {}
    if (currentAd.targetUrl) {
      Linking.openURL(currentAd.targetUrl).catch(() => {});
    }
  };

  const changeSpeed = (rate: number) => {
    player.playbackRate = rate;
    setPlaybackRate(rate);
    showFeedback(`سرعت: ${toFarsiDigits(rate)}x`, true);
  };

  const handleSelectQuality = async (url: string, label: string) => {
    if (selectedQualityUrl === url) return;

    const targetUrl = url === 'auto' ? mainVideoUrl : url;
    const curTime = player.currentTime || 0;
    const wasPlaying = isPlaying;

    setSelectedQualityUrl(url);
    showFeedback(`کیفیت: ${label}`, true);
    setIsBuffering(true);

    try {
      player.pause();
      await switchVideoSource(targetUrl);
      player.currentTime = curTime;
      currentTimeRef.current = curTime;
      lastTimeRef.current = curTime;
      setScrubTime(curTime);
      setCurrentTime(curTime);
      if (wasPlaying) {
        player.play();
        setIsPlaying(true);
      }
    } catch {}
  };

  const handleClose = async () => {
    sendProgressToBackend();
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      if (Platform.OS === 'android') {
        if (typeof NavigationBar?.setVisibilityAsync === 'function') {
          await NavigationBar.setVisibilityAsync('visible');
        }
      }
    } catch {}
    onClose();
  };

  const updateProgressLayout = () => {
    progressBarRef.current?.measure((x, y, width, height, pageX) => {
      progressBarLayoutRef.current = { pageX, width };
    });
  };

  const calculateSeekTimeFromPageX = (pageX: number) => {
    const { pageX: barX, width: barW } = progressBarLayoutRef.current;
    if (barW <= 0 || duration <= 0) return 0;
    const clampedX = Math.max(0, Math.min(pageX - barX, barW));
    return (clampedX / barW) * duration;
  };

  const handleScrubberTouchStart = (e: GestureResponderEvent) => {
    if (isPlayingAd) return;
    showControlsTemporarily();
    setIsScrubbing(true);
    const target = calculateSeekTimeFromPageX(e.nativeEvent.pageX);
    setScrubTime(target);
    showFeedback(formatTime(target), false);
  };

  const handleScrubberTouchMove = (e: GestureResponderEvent) => {
    if (isPlayingAd) return;
    showControlsTemporarily();
    const target = calculateSeekTimeFromPageX(e.nativeEvent.pageX);
    setScrubTime(target);
    showFeedback(formatTime(target), false);
  };

  const handleScrubberTouchEnd = (e: GestureResponderEvent) => {
    if (isPlayingAd) return;
    const target = calculateSeekTimeFromPageX(e.nativeEvent.pageX);
    setScrubTime(target);
    setCurrentTime(target);
    currentTimeRef.current = target;
    lastTimeRef.current = target;
    setIsScrubbing(false);
    setIsBuffering(true);

    player.currentTime = target;
    showFeedback(formatTime(target), true);
    showControlsTemporarily();

    setTimeout(() => setIsBuffering(false), 3500);
  };

  const handleTouchStart = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    touchStartRef.current = { x: pageX, y: pageY, time: Date.now() };
    gestureTypeRef.current = 'none';
    initialGestureValRef.current = {
      volume: volumeRef.current,
      brightness: brightnessRef.current,
      time: player.currentTime || 0,
    };
    targetSeekTimeRef.current = player.currentTime || 0;
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (showResumePrompt || isPlayingAd || isScrubbing) return;
    const { pageX, pageY } = e.nativeEvent;
    const deltaX = pageX - touchStartRef.current.x;
    const deltaY = touchStartRef.current.y - pageY;

    if (gestureTypeRef.current === 'none') {
      if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          gestureTypeRef.current = 'seek';
        } else {
          if (touchStartRef.current.x > playerWidth / 2) {
            gestureTypeRef.current = 'volume';
          } else {
            gestureTypeRef.current = 'brightness';
          }
        }
      }
    }

    const now = Date.now();

    if (gestureTypeRef.current === 'seek') {
      const seekSec = (deltaX / playerWidth) * 90;
      const total = duration || 1;
      const newTime = Math.min(total, Math.max(0, initialGestureValRef.current.time + seekSec));
      targetSeekTimeRef.current = newTime;
      setScrubTime(newTime);

      if (now - lastMoveTimeRef.current > 40) {
        lastMoveTimeRef.current = now;
        const sign = seekSec >= 0 ? '+' : '-';
        showFeedback(`${formatTime(newTime)} (${sign}${toFarsiDigits(Math.abs(Math.round(seekSec)))} ثانیه)`, false);
      }
    } else if (gestureTypeRef.current === 'volume') {
      const volDelta = deltaY / (playerHeight * 0.45);
      const newVol = Math.min(1, Math.max(0, initialGestureValRef.current.volume + volDelta));
      volumeRef.current = newVol;

      if (player.muted && newVol > 0) {
        player.muted = false;
        setIsMuted(false);
      }

      if (now - lastVolumeTimeRef.current > 80 && Math.abs(lastAppliedVolumeRef.current - newVol) >= 0.02) {
        lastVolumeTimeRef.current = now;
        lastAppliedVolumeRef.current = newVol;
        player.volume = newVol;
      }

      if (now - lastMoveTimeRef.current > 60) {
        lastMoveTimeRef.current = now;
        showFeedback(`صدا: ${toFarsiDigits(Math.round(newVol * 100))}٪`, false);
      }
    } else if (gestureTypeRef.current === 'brightness') {
      const briDelta = deltaY / (playerHeight * 0.45);
      const newBri = Math.min(1, Math.max(0.1, initialGestureValRef.current.brightness + briDelta));
      brightnessRef.current = newBri;

      if (now - lastBrightnessTimeRef.current > 80) {
        lastBrightnessTimeRef.current = now;
        if (typeof Brightness?.setBrightnessAsync === 'function') {
          Brightness.setBrightnessAsync(newBri).catch(() => {});
        }
      }

      if (now - lastMoveTimeRef.current > 40) {
        lastMoveTimeRef.current = now;
        showFeedback(`روشنایی: ${toFarsiDigits(Math.round(newBri * 100))}٪`, false);
      }
    }
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    if (showResumePrompt || isScrubbing) return;

    if (gestureTypeRef.current === 'seek') {
      const target = targetSeekTimeRef.current;
      setScrubTime(target);
      setCurrentTime(target);
      currentTimeRef.current = target;
      lastTimeRef.current = target;
      setIsBuffering(true);

      player.currentTime = target;
      showFeedback(formatTime(target), true);
      gestureTypeRef.current = 'none';

      setTimeout(() => setIsBuffering(false), 3500);
      return;
    }

    if (gestureTypeRef.current === 'volume') {
      const finalVol = volumeRef.current;
      player.volume = finalVol;
      lastAppliedVolumeRef.current = finalVol;
      setVolume(finalVol);
      if (player.muted && finalVol > 0) {
        player.muted = false;
        setIsMuted(false);
      }
      showFeedback(`صدا: ${toFarsiDigits(Math.round(finalVol * 100))}٪`, true);
      gestureTypeRef.current = 'none';
      return;
    }

    if (gestureTypeRef.current === 'brightness') {
      setBrightness(brightnessRef.current);
      if (typeof Brightness?.setBrightnessAsync === 'function') {
        Brightness.setBrightnessAsync(brightnessRef.current).catch(() => {});
      }
      showFeedback(`روشنایی: ${toFarsiDigits(Math.round(brightnessRef.current * 100))}٪`, true);
      gestureTypeRef.current = 'none';
      return;
    }

    if (showSettingsMenu) {
      setShowSettingsMenu(false);
      resetHideTimer();
      return;
    }

    const now = Date.now();
    const tapX = e.nativeEvent.pageX;

    if (lastTapRef.current && now - lastTapRef.current.time < 300 && Math.abs(tapX - lastTapRef.current.x) < 50) {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      lastTapRef.current = null;

      if (!isPlayingAd) {
        if (tapX > playerWidth / 2) {
          const target = Math.min(duration, (player.currentTime || 0) + 10);
          setScrubTime(target);
          setCurrentTime(target);
          currentTimeRef.current = target;
          player.currentTime = target;
          showFeedback(`${toFarsiDigits(10)}+ ثانیه جلو`, true);
        } else {
          const target = Math.max(0, (player.currentTime || 0) - 10);
          setScrubTime(target);
          setCurrentTime(target);
          currentTimeRef.current = target;
          player.currentTime = target;
          showFeedback(`${toFarsiDigits(10)}- ثانیه عقب`, true);
        }
      }
    } else {
      lastTapRef.current = { time: now, x: tapX };
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        if (showControls) {
          setShowControls(false);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        } else {
          showControlsTemporarily();
        }
        clickTimerRef.current = null;
      }, 300);
    }
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return toFarsiDigits('0:00');
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return toFarsiDigits(`${m}:${s.toString().padStart(2, '0')}`);
  };

  const activeDisplayTime = isScrubbing || isBuffering ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (activeDisplayTime / duration) * 100 : 0;
  const adProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={[styles.rootContainer, { width: playerWidth, height: playerHeight }]}>
      <StatusBar hidden={true} />

      {/* پلیر نیتیو با ابعاد قطعی */}
      <VideoView
        player={player}
        style={{
          width: playerWidth,
          height: playerHeight,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        contentFit={isZoomFit ? 'cover' : 'contain'}
        nativeControls={false}
      />

      {/* ناحیه دریافت لمس */}
      <View
        style={{
          width: playerWidth,
          height: playerHeight,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
      />

      {isBuffering && (
        <View style={styles.bufferingCenter} pointerEvents="none">
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      )}

      {feedbackText && (
        <View style={styles.feedbackContainer} pointerEvents="none">
          <Text style={styles.feedbackText}>{feedbackText}</Text>
        </View>
      )}

      {!isPlayingAd && (
        <Animated.View
          style={[styles.closeBtnContainer, { opacity: controlsOpacity }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.8}
            onPress={handleClose}
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* لایه تبلیغات یوتیوب استایل */}
      {isPlayingAd && currentAd && (
        <View
          style={{
            width: playerWidth,
            height: playerHeight,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 60,
          }}
          pointerEvents="box-none"
        >
          {/* ۱. تایتل آگهی (دقیقاً در بالا راست) */}
          <View style={styles.adTopRightContainer} pointerEvents="box-none">
            <View style={styles.adBadgePill}>
              <View style={styles.adYellowDot} />
              <Text style={styles.adBadgeText}>آگهی</Text>
              <Text style={styles.adTitleSeparator}>•</Text>
              <Text numberOfLines={1} style={styles.adHeaderTitle}>
                {currentAd.title}
              </Text>
            </View>
          </View>

          {/* ۲. دکمه رد کردن آگهی (دقیقاً در پایین چپ) */}
          <View style={styles.adBottomLeftSkipContainer} pointerEvents="box-none">
            {canSkipAd ? (
              <TouchableOpacity
                style={styles.ytSkipAdBtn}
                activeOpacity={0.85}
                onPress={handleSkipAd}
              >
                <Text style={styles.ytSkipAdText}>رد کردن آگهی</Text>
                <SkipForward size={14} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.ytPendingSkipBox}>
                <Text style={styles.ytPendingSkipText}>
                  امکان رد کردن پس از {toFarsiDigits(skipCountDown)} ثانیه
                </Text>
              </View>
            )}
          </View>

          {/* ۳. دکمه مشاهده وب‌سایت (دقیقاً در پایین راست) */}
          {currentAd.targetUrl ? (
            <View style={styles.adBottomRightLinkContainer} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.adMinimalLinkBtn}
                activeOpacity={0.8}
                onPress={handleAdClick}
              >
                <ExternalLink size={13} color="#f8fafc" />
                <Text style={styles.adMinimalLinkText}>مشاهده وب‌سایت</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ۴. نوار زرد پیشرفت (کف صفحه) */}
          <View style={styles.adBottomProgressBarTrack} pointerEvents="none">
            <View style={[styles.adBottomProgressBarFill, { width: `${adProgressPercent}%` }]} />
          </View>
        </View>
      )}

      {/* ادامه تماشا */}
      {showResumePrompt && !isPlayingAd && (
        <View style={styles.resumeOverlay}>
          <View style={styles.resumeCard}>
            <Text style={styles.resumeTitle}>ادامه تماشای فیلم</Text>
            <Text style={styles.resumeDesc}>
              شما قبلاً این اثر را تا دقیقه{' '}
              <Text style={styles.resumeHighlight}>{formatTime(savedResumeTime)}</Text> تماشا کرده‌اید.
            </Text>
            <View style={styles.resumeBtnsRow}>
              <TouchableOpacity
                style={styles.resumeBtn}
                activeOpacity={0.8}
                onPress={() => handleResumeClick(true)}
              >
                <Text style={styles.resumeBtnText}>ادامه تماشا</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fromStartBtn}
                activeOpacity={0.8}
                onPress={() => handleResumeClick(false)}
              >
                <RotateCcw size={14} color="#cbd5e1" />
                <Text style={styles.fromStartText}>از ابتدا</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* نوار کنترل فیلم اصلی */}
      {!isPlayingAd && (
        <Animated.View
          style={[styles.controlsBar, { opacity: controlsOpacity }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <View
            ref={progressBarRef}
            style={styles.scrubberTouchableArea}
            onLayout={updateProgressLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleScrubberTouchStart}
            onResponderMove={handleScrubberTouchMove}
            onResponderRelease={handleScrubberTouchEnd}
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              <View
                style={[
                  styles.scrubberThumb,
                  { left: `${Math.max(0, Math.min(progressPercent, 99.5))}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.controlsRow}>
            <View style={styles.leftControls}>
              <TouchableOpacity onPress={togglePlayPause} style={styles.iconBtn}>
                {isPlaying ? <Pause size={20} color="#ffffff" /> : <Play size={20} color="#ffffff" fill="#ffffff" />}
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleMute} style={styles.iconBtn}>
                {isMuted ? <VolumeX size={18} color="#f43f5e" /> : <Volume2 size={18} color="#ffffff" />}
              </TouchableOpacity>

              <Text style={styles.timeText}>
                {formatTime(activeDisplayTime)} / {formatTime(duration)}
              </Text>
            </View>

            <View style={styles.rightControls}>
              {title ? (
                <Text numberOfLines={1} style={styles.movieTitleLabel}>
                  {title}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.iconBtn, isZoomFit && styles.zoomActiveBtn]}
                onPress={toggleZoomFit}
              >
                {isZoomFit ? (
                  <Minimize2 size={18} color="#2dd4bf" />
                ) : (
                  <Maximize2 size={18} color="#ffffff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, showSettingsMenu && styles.settingsActiveBtn]}
                onPress={() => setShowSettingsMenu((prev) => !prev)}
              >
                <Settings size={18} color={showSettingsMenu ? '#2dd4bf' : '#ffffff'} />
              </TouchableOpacity>
            </View>
          </View>

          {showSettingsMenu && (
            <View
              style={styles.settingsMenuCard}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.settingsMenuTabs}>
                <TouchableOpacity
                  style={[styles.settingsTabBtn, activeSettingsTab === 'quality' && styles.settingsTabBtnActive]}
                  onPress={() => setActiveSettingsTab('quality')}
                >
                  <Text style={[styles.settingsTabBtnText, activeSettingsTab === 'quality' && styles.settingsTabBtnTextActive]}>
                    کیفیت
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsTabBtn, activeSettingsTab === 'speed' && styles.settingsTabBtnActive]}
                  onPress={() => setActiveSettingsTab('speed')}
                >
                  <Text style={[styles.settingsTabBtnText, activeSettingsTab === 'speed' && styles.settingsTabBtnTextActive]}>
                    سرعت
                  </Text>
                </TouchableOpacity>
              </View>

              {activeSettingsTab === 'quality' ? (
                <ScrollView style={styles.optionsScrollView} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.optionRow, selectedQualityUrl === 'auto' && styles.optionRowActive]}
                    onPress={() => handleSelectQuality('auto', 'خودکار (Auto)')}
                  >
                    {selectedQualityUrl === 'auto' && <Check size={14} color="#030712" />}
                    <Text style={[styles.optionText, selectedQualityUrl === 'auto' && styles.optionTextActive]}>
                      خودکار (Auto)
                    </Text>
                  </TouchableOpacity>

                  {availableQualities.map((q) => (
                    <TouchableOpacity
                      key={q.url}
                      style={[styles.optionRow, selectedQualityUrl === q.url && styles.optionRowActive]}
                      onPress={() => handleSelectQuality(q.url, q.label)}
                    >
                      {selectedQualityUrl === q.url && <Check size={14} color="#030712" />}
                      <Text style={[styles.optionText, selectedQualityUrl === q.url && styles.optionTextActive]}>
                        {q.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView style={styles.optionsScrollView} showsVerticalScrollIndicator={false}>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[styles.optionRow, playbackRate === rate && styles.optionRowActive]}
                      onPress={() => changeSpeed(rate)}
                    >
                      {playbackRate === rate && <Check size={14} color="#030712" />}
                      <Text style={[styles.optionText, playbackRate === rate && styles.optionTextActive]}>
                        {rate === 1 ? `${toFarsiDigits('1')}x (عادی)` : `${toFarsiDigits(rate)}x`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    backgroundColor: '#000000',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  bufferingCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  feedbackContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    top: '45%',
  },
  feedbackText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#2dd4bf',
    textAlign: 'center',
    includeFontPadding: false,
  },
  closeBtnContainer: {
    position: 'absolute',
    top: 20,
    left: 24,
    zIndex: 40,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* استایل‌های تبلیغات */
  adTopRightContainer: {
    position: 'absolute',
    top: 20,
    right: 24,
    zIndex: 80,
  },
  adBadgePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    gap: 8,
  },
  adYellowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#facc15',
  },
  adBadgeText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#facc15',
    includeFontPadding: false,
  },
  adTitleSeparator: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 12,
  },
  adHeaderTitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#f1f5f9',
    maxWidth: 240,
    includeFontPadding: false,
  },

  /* دکمه رد کردن در پایین چپ */
  adBottomLeftSkipContainer: {
    position: 'absolute',
    bottom: 22,
    left: 24,
    zIndex: 80,
  },
  ytSkipAdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  ytSkipAdText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#ffffff',
    includeFontPadding: false,
  },
  ytPendingSkipBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ytPendingSkipText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#cbd5e1',
    includeFontPadding: false,
  },

  /* دکمه مشاهده وب‌سایت در پایین راست */
  adBottomRightLinkContainer: {
    position: 'absolute',
    bottom: 22,
    right: 24,
    zIndex: 80,
  },
  adMinimalLinkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  adMinimalLinkText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#f8fafc',
    includeFontPadding: false,
  },

  /* نوار زرد پیشرفت چسبیده به کف صفحه */
  adBottomProgressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 70,
  },
  adBottomProgressBarFill: {
    height: '100%',
    backgroundColor: '#facc15',
  },

  /* پنجره ادامه تماشا */
  resumeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  resumeCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    padding: 20,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  resumeTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 14,
    color: '#ffffff',
    includeFontPadding: false,
  },
  resumeDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 18,
    includeFontPadding: false,
  },
  resumeHighlight: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#2dd4bf',
    fontWeight: 'bold',
  },
  resumeBtnsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  resumeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#030712',
    includeFontPadding: false,
  },
  fromStartBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fromStartText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#cbd5e1',
    includeFontPadding: false,
  },

  /* کنترل‌های فیلم اصلی */
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: 'rgba(3, 7, 18, 0.88)',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 6,
    gap: 4,
  },
  scrubberTouchableArea: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2.5,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 2.5,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#14b8a6',
    marginLeft: -7,
    top: -4.5,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rightControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    maxWidth: '55%',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  zoomActiveBtn: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
  },
  settingsActiveBtn: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  timeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#cbd5e1',
    includeFontPadding: false,
  },
  movieTitleLabel: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#ffffff',
    textAlign: 'right',
    includeFontPadding: false,
  },
  settingsMenuCard: {
    position: 'absolute',
    bottom: 56,
    right: 16,
    backgroundColor: '#0c1222',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    borderRadius: 18,
    padding: 10,
    width: 200,
    maxHeight: 230,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  settingsMenuTabs: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  settingsTabBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTabBtnActive: {
    backgroundColor: '#14b8a6',
  },
  settingsTabBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#94a3b8',
    includeFontPadding: false,
  },
  settingsTabBtnTextActive: {
    color: '#030712',
  },
  optionsScrollView: {
    maxHeight: 160,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  optionRowActive: {
    backgroundColor: '#14b8a6',
  },
  optionText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#cbd5e1',
    includeFontPadding: false,
  },
  optionTextActive: {
    color: '#030712',
    fontWeight: 'bold',
  },
});