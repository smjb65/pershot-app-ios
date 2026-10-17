import { Linking } from 'react-native';

export const MYKET_PACKAGE_NAME = 'com.pershot.app';
export const MYKET_APP_URI = `myket://details?id=${MYKET_PACKAGE_NAME}`;
export const MYKET_COMMENT_URI = `myket://comment?id=${MYKET_PACKAGE_NAME}`;
export const MYKET_WEB_URL = `https://myket.ir/app/${MYKET_PACKAGE_NAME}`;

/**
 * باز کردن مستقیم صفحه برنامه در اپلیکیشن مایکت (و در صورت عدم نصب، باز شدن صفحه وب مایکت)
 */
export const openMyketPage = async () => {
  try {
    const canOpen = await Linking.canOpenURL(MYKET_APP_URI);
    if (canOpen) {
      await Linking.openURL(MYKET_APP_URI);
    } else {
      await Linking.openURL(MYKET_WEB_URL);
    }
  } catch {
    await Linking.openURL(MYKET_WEB_URL);
  }
};

// حفظ نام تابع قبلی جهت سازگاری با سایر ایمپورت‌های پروژه
export const openBazaarPage = openMyketPage;