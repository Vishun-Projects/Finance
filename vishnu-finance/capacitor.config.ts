import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vishnu.finance',
  appName: 'Vishnu Finance',
  webDir: 'out',
  server: {
    url: 'https://vishun-finance.vercel.app/',
    cleartext: false,
  },
};

export default config;
