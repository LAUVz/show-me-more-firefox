// Show Me More - Image Utility Functions

/**
 * Utility functions for image operations
 */
export class ImageUtils {
  /**
   * Check if an image URL exists and is a valid image
   * @param url URL to check
   * @param checkContentType Whether to verify the content type is an image
   * @returns Promise resolving to boolean indicating if image exists
   */
  static async checkImageExists(url: string, checkContentType: boolean = true): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });

      if (!response.ok) return false;

      if (!checkContentType) return true;

      const contentType = response.headers.get('Content-Type');
      return contentType !== null && /.*image.*/i.test(contentType);
    } catch (e) {
      return false;
    }
  }

  /**
   * Truncate a URL for display
   * @param url The URL to truncate
   * @param maxLength Maximum length before truncation (default: 60)
   * @returns Truncated URL string
   */
  static truncateUrl(url: string, maxLength: number = 60): string {
    if (url.length <= maxLength) return url;

    const keepLength = Math.floor((maxLength - 3) / 2);
    return url.substring(0, keepLength) + '...' + url.substring(url.length - keepLength);
  }

  /**
   * Helper to escape special characters in URL for querySelector
   * @param selector URL or selector to escape
   * @returns Escaped string safe for use in querySelector
   */
  static escapeSelector(selector: string): string {
    return selector
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\\/g, '\\\\')
      .replace(/[\[\]()]/g, '\\$&');
  }

  /**
   * Create a delay promise for rate limiting
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
