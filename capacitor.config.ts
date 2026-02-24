import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.visionary.gallery',
    appName: 'Visionary AI Gallery',
    webDir: 'dist',
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
