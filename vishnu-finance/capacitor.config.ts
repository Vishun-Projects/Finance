import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vishnu.finance',
  appName: 'Vishnu Finance',
  webDir: 'out',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
