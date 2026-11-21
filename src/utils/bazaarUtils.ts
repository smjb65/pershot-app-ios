import { Linking, Platform } from 'react-native';

export const MYKET_PACKAGE_NAME = 'com.pershot.app';
export const MYKET_APP_URI = `myket://details?id=${MYKET_PACKAGE_NAME}`;
export const MYKET_COMMENT_URI = `myket://comment?id=${MYKET_PACKAGE_NAME}`;
export const MYKET_WEB_URL = `https://myket.ir/app/${MYKET_PACKAGE_NAME}`;

// پس از تایید نهایی در سیب‌اپ، لینک اختصاصی پرشات در سیب‌اپ را اینجا جایگزین کنید
export const SIBAPP_WEB_URL = 'https://sibapp.com/applications/pershot';

export const openStorePage = async (customUrl?: string) => {
  if (Platform.OS === 'ios') {
    await Linking.openURL(customUrl || SIBAPP_WEB_URL);
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(MYKET_APP_URI);
    if (canOpen) {
      await Linking.openURL(MYKET_APP_URI);
    } else {
      await Linking.openURL(customUrl || MYKET_WEB_URL);
    }
  } catch {
    await Linking.openURL(customUrl || MYKET_WEB_URL);
  }
};

export const openMyketPage = openStorePage;
export const openBazaarPage = openStorePage;