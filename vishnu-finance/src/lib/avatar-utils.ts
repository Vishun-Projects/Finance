/**
 * Avatar utility functions for generating unisex dummy avatars
 */

/**
 * Generate a dummy avatar URL based on user ID
 * Uses DiceBear API for consistent unisex avatar generation
 */
export function getDummyAvatarUrl(userId: string): string {
  // Use avataaars style for neutral/unisex avatars
  // The seed ensures the same user always gets the same avatar
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&backgroundColor=b6e3f4,c7a2ff,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Get avatar URL - returns user's avatar if available, otherwise dummy avatar
 * One avatar per user, unisex
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, userId: string): string {
  if (avatarUrl) {
    // Return full URL if it's already a full URL, otherwise assume it's relative
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    // Return relative path for local avatars
    return avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  }
  
  return getDummyAvatarUrl(userId);
}

/**
 * Validate image file type and size
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Please upload an image smaller than 5MB.'
    };
  }

  return { valid: true };
}

