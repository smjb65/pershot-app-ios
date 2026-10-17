import { Image } from 'expo-image';
import { Film, MessageCircle, PlaySquare, Rocket, User as UserIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';
import { useChat } from '../../context/ChatContext';

interface CustomBottomBarProps {
  activeTab: number;
  onSelectTab: (index: number) => void;
  userAvatar?: string | null;
}

export default function CustomBottomBar({ activeTab, onSelectTab, userAvatar }: CustomBottomBarProps) {
  const insets = useSafeAreaInsets();
  const { globalUnreadCount } = useChat();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userAvatar || null);

  const fetchAvatar = () => {
    api
      .get('/profile/me')
      .then((res) => {
        const avatar =
          res.data?.data?.avatar ||
          res.data?.avatar ||
          res.data?.data?.avatarUrl ||
          res.data?.avatarUrl;
        if (avatar) {
          setAvatarUrl(avatar);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAvatar();

    const subscription = DeviceEventEmitter.addListener('PROFILE_AVATAR_UPDATED', (newAvatar: string) => {
      if (newAvatar) {
        setAvatarUrl(newAvatar);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (userAvatar) {
      setAvatarUrl(userAvatar);
    }
  }, [userAvatar]);

  const safeBottom = insets.bottom > 0 ? insets.bottom : 4;
  const barHeight = 52 + safeBottom;

  const tabs = [
    { id: 0, title: 'پروفایل', icon: UserIcon },
    { id: 1, title: 'دایرکت', icon: MessageCircle },
    { id: 2, title: 'ریلز', icon: PlaySquare },
    { id: 3, title: 'کمپین‌ها', icon: Rocket },
    { id: 4, title: 'فیلم‌ها', icon: Film },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: safeBottom,
          height: barHeight,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.75}
            onPress={() => onSelectTab(tab.id)}
            style={styles.tabItem}
          >
            {tab.id === 0 && avatarUrl ? (
              <View style={[styles.avatarWrapper, isActive && styles.activeAvatar]}>
                <Image
                  key={avatarUrl}
                  source={{ uri: getMediaUrl(avatarUrl) }}
                  style={styles.avatarImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <IconComponent
                  color={isActive ? '#14b8a6' : '#64748b'}
                  size={isActive ? 25 : 23}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                {/* بج شمارنده پیام‌های دایرکت */}
                {tab.id === 1 && globalUnreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text 
                      style={styles.unreadBadgeText}
                      numberOfLines={1}
                      ellipsizeMode="clip"
                    >
                      {toFarsiDigits(globalUnreadCount > 99 ? '+۹۹' : globalUnreadCount)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isActive && (
              <Text
                style={styles.activeTabLabel}
                numberOfLines={1}
                ellipsizeMode="clip"
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {tab.title}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 11, 19, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 3,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minWidth: 0,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -9,
    backgroundColor: '#14b8a6',
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#070b13',
  },
  unreadBadgeText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9,
    color: '#030712',
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeTabLabel: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#14b8a6',
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 15,
    marginTop: 2,
    paddingHorizontal: 1,
  },
  avatarWrapper: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  activeAvatar: {
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
});