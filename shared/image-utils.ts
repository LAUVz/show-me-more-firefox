// Show Me More - Image Utility Functions

/**
 * Utility functions for image operations
 */
export class ImageUtils {
  // Cache for image validation results to avoid repeated checks
  private static imageValidationCache: Map<string, {
    isValid: boolean,
    timestamp: number
  }> = new Map();

  // Cache expiration time (10 minutes)
  private static readonly CACHE_EXPIRATION = 10 * 60 * 1000;

  /**
   * Check if an image URL exists and is a valid image
   * @param url URL to check
   * @param checkContentType Whether to verify the content type is an image
   * @returns Promise resolving to boolean indicating if image exists
   */
  static async checkImageExists(url: string, checkContentType: boolean = true): Promise<boolean> {
    try {
      // Check URL validity first
      if (!this.isValidUrl(url)) {
        console.log(`Invalid URL format: ${url}`);
        return false;
      }

      // Check cache first
      const cacheResult = this.checkCache(url);
      if (cacheResult !== null) {
        return cacheResult;
      }

      // Add cache-busting parameter to prevent cached responses
      const requestUrl = new URL(url);
      requestUrl.searchParams.append('_nocache', Date.now().toString());
      const urlString = requestUrl.toString();

      // Try each method in sequence until one works
      let result = false;

      // 1. Try HEAD request (fastest)
      result = await this.tryHeadRequest(urlString, checkContentType);
      if (result) {
        this.updateCache(url, true);
        return true;
      }

      // 2. Try GET request with range
      result = await this.tryRangeGetRequest(urlString, checkContentType);
      if (result) {
        this.updateCache(url, true);
        return true;
      }

      // No valid methods succeeded
      this.updateCache(url, false);
      return false;
    } catch (e) {
      console.log(`Unexpected error checking if image exists: ${url}`, e);
      // If all checks fail, assume it's not a valid image
      this.updateCache(url, false);
      return false;
    }
  }

  /**
   * Try a HEAD request to check if an image exists
   * @param url URL to check
   * @param checkContentType Whether to check content type
   * @returns Promise resolving to boolean indicating if image exists
   */
  private static async tryHeadRequest(
    url: string,
    checkContentType: boolean
  ): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'Accept': 'image/*,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) return false;

      if (!checkContentType) return true;

      // Check content type
      return this.validateImageContentType(response.headers);
    } catch (e) {
      console.log(`HEAD request failed for ${url}`, e);
      return false;
    }
  }

  /**
   * Try a GET request with range header to check if an image exists
   * @param url URL to check
   * @param checkContentType Whether to check content type
   * @returns Promise resolving to boolean indicating if image exists
   */
  private static async tryRangeGetRequest(
    url: string,
    checkContentType: boolean
  ): Promise<boolean> {
    try {
      // Create abort controller with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'image/*,*/*;q=0.8',
          'Range': 'bytes=0-1024', // Just get the first KB
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) return false;

      if (!checkContentType) return true;

      // Check content type
      return this.validateImageContentType(response.headers);
    } catch (e) {
      console.log(`Range GET request failed for ${url}`, e);
      return false;
    }
  }

  /**
   * Validate if headers indicate an image content type
   * @param headers Response headers to check
   * @returns Boolean indicating if headers correspond to an image
   */
  private static validateImageContentType(headers: Headers): boolean {
    const contentType = headers.get('Content-Type');

    if (!contentType) return false;

    // Check for common image MIME types
    return /image\/(jpeg|jpg|png|gif|bmp|webp|svg|tiff|avif)/i.test(contentType) ||
           /^image\/.*/i.test(contentType);
  }

  /**
   * Check URL validity
   * @param url URL to validate
   * @returns Boolean indicating if URL is valid
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check cache for URL validation result
   * @param url URL to check in cache
   * @returns Boolean if cached result exists and is valid, null otherwise
   */
  private static checkCache(url: string): boolean | null {
    const cached = this.imageValidationCache.get(url);

    if (cached) {
      // Check if cache entry is still valid
      if (Date.now() - cached.timestamp < this.CACHE_EXPIRATION) {
        return cached.isValid;
      }
      // Remove expired entry
      this.imageValidationCache.delete(url);
    }

    return null;
  }

  /**
   * Update cache with validation result
   * @param url URL that was validated
   * @param isValid Result of validation
   */
  private static updateCache(url: string, isValid: boolean): void {
    this.imageValidationCache.set(url, {
      isValid,
      timestamp: Date.now()
    });

    // Prune cache if it gets too large (over 1000 entries)
    if (this.imageValidationCache.size > 1000) {
      this.pruneCache();
    }
  }

  /**
   * Prune old entries from the cache
   */
  private static pruneCache(): void {
    const now = Date.now();

    // Remove expired entries
    for (const [url, data] of this.imageValidationCache.entries()) {
      if (now - data.timestamp > this.CACHE_EXPIRATION) {
        this.imageValidationCache.delete(url);
      }
    }

    // If still too large, remove oldest entries
    if (this.imageValidationCache.size > 800) {
      const entries = Array.from(this.imageValidationCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 30%
      const removeCount = Math.floor(entries.length * 0.3);
      for (let i = 0; i < removeCount; i++) {
        this.imageValidationCache.delete(entries[i][0]);
      }
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
