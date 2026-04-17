import { useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildMapHtml } from '@/features/bee-map/utils/mapHtml';

const KAKAO_MAP_API_KEY = process.env.EXPO_PUBLIC_KAKAO_MAP_API_KEY ?? '';
const MAP_HTML = buildMapHtml(KAKAO_MAP_API_KEY);

export default function BeeMapScreen() {
  const webViewRef = useRef<WebView>(null);

  return (
    <View className="flex-1 bg-white">
      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML, baseUrl: 'http://localhost' }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        onShouldStartLoadWithRequest={() => true}
      />
    </View>
  );
}
