import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindmitra.app',
  appName: 'MindMitra',
  webDir: 'dist-mobile',
  appendUserAgent: 'MindMitraAndroid/1.0',
  android: {
    allowMixedContent: false,
    backgroundColor: '#fbf7ec',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
