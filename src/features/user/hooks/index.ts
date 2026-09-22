import { useMutation } from '@tanstack/react-query';
import { uploadProfileImage } from '../api';

export function useUploadProfileImage() {
  return useMutation({
    mutationFn: (imageUri: string) => uploadProfileImage(imageUri),
  });
}
