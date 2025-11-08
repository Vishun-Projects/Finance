import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vishnu.finance',
  appName: 'Vishnu Finance',
  webDir: 'out',
  server: {
    url: 'https://ed4ac23e5fcfe0.lhr.life',
    cleartext: false,
  },
};

export default config;
