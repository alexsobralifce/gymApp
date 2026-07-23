import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gymapp.mobile',
  appName: 'GymApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#0A1628',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
  backgroundColor: '#0A1628',
  androidNavigationBarColor: '#0A1628',
    },
    GoogleAuth: {
      clientId: '100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com',
      iosClientId: '100874517602-49m8ui27npful8h59jghakv0lskgmhk2.apps.googleusercontent.com',
      androidClientId: '100874517602-l5ghfcrmukob6bfukopidmsqjin8e3h6.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    },
  },
}

export default config
