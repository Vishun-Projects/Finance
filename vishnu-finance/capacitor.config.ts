import { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';
import { Style } from '@capacitor/status-bar';

const config: CapacitorConfig = {
  appId: 'com.vishnu.finance',
  appName: 'Vishnu Finance',
  webDir: 'out',
  server: {
    url: 'https://vishun-finance.vercel.app/',
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    adjustMarginsForEdgeToEdge: 'auto'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: Style.Dark,
      backgroundColor: "#000000",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
