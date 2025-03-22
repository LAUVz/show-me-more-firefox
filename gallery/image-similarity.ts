// Show Me More - Image Similarity Detection

/**
 * Class for detecting similar images using perceptual hashing
 */
class ImageSimilarity {
  // Configuration
  public static readonly HASH_SIZE = 18; // 8x8 grid for hashing
  public static readonly THRESHOLD = 0.95; // Similarity threshold (0-1)

  /**
   * Calculate a perceptual hash for an image URL
   * @param imageUrl URL of the image to hash
   * @returns Promise resolving to a binary hash string or empty string on error
   */
  public static async getImageHash(imageUrl: string): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
          const hash = this.calculateAverageHash(img);
          resolve(hash);
        };

        img.onerror = (err) => {
          reject(`Failed to load image: ${err}`);
        };

        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Error generating image hash:', error);
      return '';
    }
  }

  /**
   * Calculate aHash (Average Hash) for an image element
   * @param img Image element to hash
   * @returns Binary hash string
   */
  private static calculateAverageHash(img: HTMLImageElement): string {
    // Create a canvas to resize and process the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get canvas context');
      return '';
    }

    // Resize to small square for hashing
    canvas.width = this.HASH_SIZE;
    canvas.height = this.HASH_SIZE;

    // Grayscale and resize in one step
    ctx.filter = 'grayscale(1)';
    ctx.drawImage(img, 0, 0, this.HASH_SIZE, this.HASH_SIZE);

    // Get image data
    const imageData = ctx.getImageData(0, 0, this.HASH_SIZE, this.HASH_SIZE);
    const data = imageData.data;

    // Calculate average pixel value
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      // Use just one channel since image is grayscale
      sum += data[i];
    }
    const avg = sum / (this.HASH_SIZE * this.HASH_SIZE);

    // Create hash: 1 if pixel is above average, 0 if below
    let hash = '';
    for (let i = 0; i < data.length; i += 4) {
      hash += data[i] >= avg ? '1' : '0';
    }

    return hash;
  }

  /**
   * Calculate Hamming distance between two hashes (number of differing bits)
   * @param hash1 First hash string
   * @param hash2 Second hash string
   * @returns Number of differing bits
   */
  public static getHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      return Number.MAX_SAFE_INTEGER;
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }

    return distance;
  }

  /**
   * Calculate similarity score (0-1) between two hashes
   * @param hash1 First hash string
   * @param hash2 Second hash string
   * @returns Similarity score (0-1, where 1 is identical)
   */
  public static getSimilarityScore(hash1: string, hash2: string): number {
    const distance = this.getHammingDistance(hash1, hash2);
    // Convert distance to similarity score (0-1)
    return 1 - (distance / hash1.length);
  }

  /**
   * Determine if two images are similar based on threshold
   * @param url1 URL of first image
   * @param url2 URL of second image
   * @returns Promise resolving to boolean indicating if images are similar
   */
  public static async areSimilarImages(url1: string, url2: string): Promise<boolean> {
    try {
      const hash1 = await this.getImageHash(url1);
      const hash2 = await this.getImageHash(url2);

      if (!hash1 || !hash2) {
        return false;
      }

      const similarity = this.getSimilarityScore(hash1, hash2);
      return similarity >= this.THRESHOLD;
    } catch (error) {
      console.error('Error comparing images:', error);
      return false;
    }
  }
}

export default ImageSimilarity;
