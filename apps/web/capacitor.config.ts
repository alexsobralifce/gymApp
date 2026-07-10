import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gymapp.mobile',
  appName: 'GymApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
