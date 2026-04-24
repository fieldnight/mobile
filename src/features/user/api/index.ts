import { api } from '@/lib/api';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export async function uploadProfileImage(imageUri: string): Promise<string> {
  const formData = new FormData();
  const rawName = imageUri.split('/').pop()?.split('?')[0] ?? 'profile.jpg';
  const ext = /\.(\w+)$/.exec(rawName)?.[1]?.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const type = ext && mimeMap[ext] ? mimeMap[ext] : 'image/jpeg';
  const filename = rawName;

  formData.append('image', { uri: imageUri, name: filename, type } as any);

  const response = await api.put<ApiResponse<{ profileImageUrl: string }>>(
    '/api/v1/users/profile-image',
    formData,
    { headers: { 'Content-Type': undefined } }
  );

  return response.data.data.profileImageUrl;
}
