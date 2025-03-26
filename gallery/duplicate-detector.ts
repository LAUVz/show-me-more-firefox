// Show Me More - Duplicate Image Detector
import ImageSimilarity from './image-similarity';
import { ImageUtils } from '../shared/image-utils';

/**
 * Manages duplicate image detection in the gallery
 */
export class DuplicateDetector {
  // Duplicate detection properties
  private duplicateGroups: Map<string, string[]> = new Map();
  private imageHashes: Map<string, string> = new Map();
  private isDuplicateDetectionEnabled: boolean = false;

  // UI element selectors
  private readonly imageItemSelector = '.image-item';
  private readonly imageWrapperSelector = '.image-wrapper';
  private readonly imageInfoSelector = '.image-info';

  /**
   * Initialize the duplicate detector
   */
  constructor() {}

  /**
   * Check if duplicate detection is enabled
   */
  isEnabled(): boolean {
    return this.isDuplicateDetectionEnabled;
  }

  /**
   * Enable or disable duplicate detection
   */
  setEnabled(enabled: boolean): void {
    this.isDuplicateDetectionEnabled = enabled;
  }

  /**
   * Get the number of duplicate groups
   */
  getDuplicateGroupCount(): number {
    return this.duplicateGroups.size;
  }

  /**
   * Reset the duplicate detector
   */
  reset(): void {
    this.duplicateGroups.clear();
    this.imageHashes.clear();
    this.isDuplicateDetectionEnabled = false;
    this.hideDuplicateMarkers();
  }

  /**
   * Detect duplicate images in the gallery
   * @param images Array of image URLs to check
   * @param onProgress Callback for progress updates
   * @returns Promise resolving to the number of duplicates found
   */
  async detectDuplicates(
    images: string[],
    onProgress: (message: string) => void
  ): Promise<number> {
    try {
      // Only process if we have images
      if (images.length <= 1) {
        return 0;
      }

      // If we already processed these images, just show the results
      if (this.duplicateGroups.size > 0) {
        this.showDuplicateMarkers();
        return this.getTotalDuplicates();
      }

      // Process in chunks to avoid UI freezing
      const chunkSize = 10;
      const imageUrls = [...images]; // Copy array

      // Generate hashes in chunks
      for (let i = 0; i < imageUrls.length; i += chunkSize) {
        const chunk = imageUrls.slice(i, i + chunkSize);

        // Update loading text
        onProgress(`Generating image fingerprints... (${i}/${imageUrls.length})`);

        // Process chunk
        await Promise.all(chunk.map(async (url) => {
          try {
            const hash = await ImageSimilarity.getImageHash(url);
            if (hash) {
              this.imageHashes.set(url, hash);
            }
          } catch (error) {
            console.error(`Error generating hash for ${url}:`, error);
          }
        }));

        // Small delay to let UI update
        await ImageUtils.delay(50);
      }

      onProgress('Comparing images...');
      await ImageUtils.delay(50);

      // Then compare to find duplicates
      const processedUrls = new Set<string>();

      for (const [url1, hash1] of this.imageHashes.entries()) {
        if (processedUrls.has(url1)) continue;

        const similarUrls: string[] = [url1];

        for (const [url2, hash2] of this.imageHashes.entries()) {
          if (url1 === url2 || processedUrls.has(url2)) continue;

          const similarity = ImageSimilarity.getSimilarityScore(hash1, hash2);
          if (similarity >= ImageSimilarity.THRESHOLD) {
            similarUrls.push(url2);
            processedUrls.add(url2);
          }
        }

        if (similarUrls.length > 1) {
          this.duplicateGroups.set(url1, similarUrls);
        }

        processedUrls.add(url1);
      }

      // Display results
      this.showDuplicateMarkers();
      return this.getTotalDuplicates();
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return 0;
    }
  }

  /**
   * Calculate the total number of duplicate images
   */
  getTotalDuplicates(): number {
    return Array.from(this.duplicateGroups.values())
      .reduce((sum, group) => sum + group.length - 1, 0);
  }

  /**
   * Add duplicate markers to images in the gallery
   */
  showDuplicateMarkers(): void {
    // First, clear any existing markers
    this.hideDuplicateMarkers();

    // For each duplicate group
    let groupCounter = 1;
    for (const [representative, duplicates] of this.duplicateGroups.entries()) {
      // Skip if only one image (no duplicates)
      if (duplicates.length <= 1) continue;

      // Create a unique group identifier
      const groupId = `group-${groupCounter}`;

      // For each image in the group
      for (const url of duplicates) {
        const imageItem = document.querySelector(`.image-item[data-url="${ImageUtils.escapeSelector(url)}"]`) as HTMLElement;
        if (!imageItem) continue;

        // Mark as duplicate
        imageItem.classList.add('is-duplicate');
        imageItem.dataset.duplicateGroup = groupId;

        // Add badge with group number
        const badge = document.createElement('div');
        badge.className = 'duplicate-badge';
        badge.textContent = groupCounter.toString();
        badge.title = `This image is part of group #${groupCounter} (${duplicates.length} similar images)`;

        // Add info text
        const infoText = document.createElement('div');
        infoText.className = 'duplicate-info';
        infoText.textContent = `Similar to ${duplicates.length - 1} other image(s)`;

        // Add filter button
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-btn';
        filterBtn.textContent = 'Show only this group';
        filterBtn.dataset.group = groupId;
        filterBtn.addEventListener('click', this.filterByDuplicateGroup.bind(this));

        infoText.appendChild(filterBtn);

        // Add to image item
        const imageWrapper = imageItem.querySelector(this.imageWrapperSelector);
        if (imageWrapper) {
          imageWrapper.appendChild(badge);
        }

        const imageInfo = imageItem.querySelector(this.imageInfoSelector);
        if (imageInfo) {
          imageInfo.appendChild(infoText);
        }
      }

      // Increment group counter for next group
      groupCounter++;
    }
  }

  /**
   * Remove duplicate markers from images
   */
  hideDuplicateMarkers(): void {
    // Remove all duplicate markers
    document.querySelectorAll('.duplicate-badge').forEach(badge => badge.remove());
    document.querySelectorAll('.duplicate-info').forEach(info => info.remove());
    document.querySelectorAll('.image-item.is-duplicate').forEach(item => {
      item.classList.remove('is-duplicate');
      delete (item as HTMLElement).dataset.duplicateGroup;
    });

    // Reset any filtering
    document.querySelectorAll(this.imageItemSelector).forEach(item => {
      (item as HTMLElement).style.display = 'block';
    });
  }

  /**
   * Filter gallery to show only images in a specific duplicate group
   */
  private filterByDuplicateGroup(event: Event): void {
    const button = event.target as HTMLButtonElement;
    const groupId = button.dataset.group;

    if (!groupId) return;

    // Toggle filtering
    const isFiltering = button.textContent === 'Show all images';

    if (isFiltering) {
      // Show all images
      document.querySelectorAll(this.imageItemSelector).forEach(item => {
        (item as HTMLElement).style.display = 'block';
      });

      // Update all buttons in this group
      document.querySelectorAll(`.filter-btn[data-group="${groupId}"]`).forEach(btn => {
        (btn as HTMLButtonElement).textContent = 'Show only this group';
      });
    } else {
      // Filter to show only this group
      document.querySelectorAll(this.imageItemSelector).forEach(item => {
        if ((item as HTMLElement).dataset.duplicateGroup === groupId) {
          (item as HTMLElement).style.display = 'block';
        } else {
          (item as HTMLElement).style.display = 'none';
        }
      });

      // Update all buttons in this group
      document.querySelectorAll(`.filter-btn[data-group="${groupId}"]`).forEach(btn => {
        (btn as HTMLButtonElement).textContent = 'Show all images';
      });
    }
  }
}
