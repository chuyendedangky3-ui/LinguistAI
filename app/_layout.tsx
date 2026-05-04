import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFlashcardStore } from '../store/useFlashcardStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const init = useFlashcardStore(state => state.init);
  const isInitialized = useFlashcardStore(state => state.isInitialized);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded || !isInitialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="deck/[id]" 
          options={{ 
            presentation: 'card',
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="session/[id]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false 
          }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
