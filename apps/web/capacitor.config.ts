import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.endorfinapp.mobile',
  appName: 'ENDORFINAPP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Live URL: carrega o frontend do Railway em vez de arquivos embutidos no APK.
    // Mudanças no JS/CSS são publicadas automaticamente sem recompilar o APK.
    // Para gerar um APK de produção offline, remova a linha `url` abaixo.
    url: 'https://web-production-c2d3c.up.railway.app',
    cleartext: false,
  },
  backgroundColor: '#0A1628',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
  backgroundColor: '#0A1628',
  androidNavigationBarColor: '#0A1628',
    },
    GoogleAuth: {
      clientId: '100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com',
      serverClientId: '100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com',
      iosClientId: '100874517602-49m8ui27npful8h59jghakv0lskgmhk2.apps.googleusercontent.com',
      androidClientId: '100874517602-l5ghfcrmukob6bfukopidmsqjin8e3h6.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    },
  },
}

export default config
