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
 * 
 * Handles two types of avatar URLs:
 * 1. External URLs (e.g., Google OAuth): https://lh3.googleusercontent.com/...
 * 2. Local uploaded avatars: /avatars/avatar_xxx.jpg
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, userId: string): string {
  // Trim whitespace and check if avatarUrl is a valid non-empty string
  const trimmedUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : null;
  
  if (trimmedUrl && trimmedUrl.length > 0) {
    // Return full URL if it's already a full URL (external, e.g., Google OAuth)
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    // Return relative path for local avatars (e.g., /avatars/avatar_xxx.jpg)
    // Ensure it starts with / for proper Next.js Image handling
    return trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
  }
  
  // Only return dummy avatar if no valid avatarUrl is provided
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

