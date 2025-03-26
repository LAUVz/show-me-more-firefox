// Show Me More - Recorded Images Manager
import { RecordedImage } from '../shared/types';
import { MessageActions, sendMessage } from '../shared/messaging';

/**
 * Manages recorded images for the gallery
 */
export class RecordedManager {
  private recordedImages: RecordedImage[] = [];
  private urls: string[] = [];

  // UI update callbacks
  private onImageAdded: (url: string) => void;
  private onImagesLoaded: () => void;
  private onError: () => void;

  /**
   * Initialize the recorded manager
   * @param callbacks UI callback functions
   */
  constructor(
    callbacks: {
      onImageAdded: (url: string) => void;
      onImagesLoaded: () => void;
      onError: () => void;
    }
  ) {
    this.onImageAdded = callbacks.onImageAdded;
    this.onImagesLoaded = callbacks.onImagesLoaded;
    this.onError = callbacks.onError;
  }

  /**
   * Load recorded images from storage
   */
  async loadRecordedImages(): Promise<void> {
    try {
      this.recordedImages = await sendMessage<RecordedImage[]>({
        action: MessageActions.GET_RECORDED_IMAGES
      });

      if (this.recordedImages.length === 0) {
        this.onError();
        return;
      }

      // Convert to array of URLs for display
      this.urls = this.recordedImages.map(item => item.url);

      // Create elements for each image
      this.urls.forEach(url => {
        this.onImageAdded(url);
      });

      this.onImagesLoaded();
    } catch (error) {
      console.error('Error loading recorded images:', error);
      this.onError();
    }
  }

  /**
   * Remove an image from recorded items
   * @param url URL of the image to remove
   */
  async removeImage(url: string): Promise<void> {
    try {
      // Find index in recorded images array
      const recordedIndex = this.recordedImages.findIndex(item => item.url === url);

      if (recordedIndex !== -1) {
        // Remove from storage
        await sendMessage({
          action: MessageActions.REMOVE_IMAGE,
          index: recordedIndex
        });

        // Remove from local arrays
        this.recordedImages.splice(recordedIndex, 1);
        const urlIndex = this.urls.indexOf(url);

        if (urlIndex !== -1) {
          this.urls.splice(urlIndex, 1);
        }
      }

      // Check if we should show empty state
      if (this.urls.length === 0) {
        this.onError();
      }
    } catch (error) {
      console.error('Error removing image:', error);
    }
  }

  /**
   * Get all image URLs
   */
  getImageUrls(): string[] {
    return this.urls;
  }

  /**
   * Create a share link for the recorded images
   */
  async createShareLink(): Promise<string | null> {
    try {
      if (this.urls.length === 0) return null;

      console.log(`Attempting to create share link for ${this.urls.length} images`);

      // Get unique URLs
      const uniqueUrls = [...new Set(this.urls)];
      console.log(`Creating share link for ${uniqueUrls.length} unique images`);

      const shareUrl = await sendMessage<string | null>({
        action: MessageActions.CREATE_LINK,
        urls: uniqueUrls
      });

      console.log("Share URL result:", shareUrl);
      return shareUrl;
    } catch (error) {
      console.error('Error creating share link:', error);
      return null;
    }
  }
}
