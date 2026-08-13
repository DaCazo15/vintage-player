/**
 * COMANDOS PARA GENERAR EL APK:
 * 1. npm run build:android
 * 2. npm run open:android
 * 3. En Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)
 * 
 * CÓMO INSTALAR EL APK DIRECTAMENTE EN LA GOOGLE TV VÍA ADB:
 * 1. adb connect <IP_DE_LA_TV>:5555
 * 2. adb install -r app-release.apk
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vintageplayer.app',
  appName: 'Vintage Player',
  webDir: 'dist'
};

export default config;
