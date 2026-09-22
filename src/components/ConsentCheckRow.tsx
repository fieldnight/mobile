import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { clsx } from 'clsx';
import { PretendardFont } from '@/components/PretendardFont';

interface ConsentCheckRowProps {
  checked: boolean;
  title: string;
  description: string;
  onPress: () => void;
}

export function ConsentCheckRow({
  checked,
  title,
  description,
  onPress,
}: ConsentCheckRowProps) {
  return (
    <Pressable onPress={onPress} className="flex-row items-start gap-3 active:opacity-80">
      <View
        className={clsx(
          'mt-0.5 h-6 w-6 items-center justify-center rounded-md border',
          checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white',
        )}
      >
        {checked ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
      </View>

      <View className="flex-1">
        <PretendardFont weight="semibold" className="text-sm text-gray-900 leading-5">
          {title}
        </PretendardFont>
        <PretendardFont className="mt-0.5 text-xs text-gray-500 leading-5">
          {description}
        </PretendardFont>
      </View>
    </Pressable>
  );
}
