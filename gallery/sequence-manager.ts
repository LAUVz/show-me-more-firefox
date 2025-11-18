// Show Me More - Sequence Manager
import { ParsedURI, CrawlDirection } from '../shared/types';
import { UrlParser } from '../shared/url-parser';
import { ImageUtils } from '../shared/image-utils';
import { MessageActions, sendMessage } from '../shared/messaging';

/**
 * Manages image sequences for the gallery
 */
export class SequenceManager {
  private sourceUrl: string | null = null;
  private images: string[] = [];
  private crawlDirection: CrawlDirection = 'both';
  private isCrawlingStopped: boolean = false;
  private canContinueCrawlingUp: boolean = true;
  private canContinueCrawlingDown: boolean = true;
  private currentParsedURI: ParsedURI | null = null;
  private currentUpwardURI: ParsedURI | null = null;
  private currentDownwardURI: ParsedURI | null = null;
  private imageLimit: number = 100;

  // UI update callbacks
  private onImageAdded: (url: string, prepend: boolean) => void;
  private onLoadingUpdate: (message: string) => void;
  private onCrawlingComplete: () => void;

  /**
   * Initialize the sequence manager
   * @param sourceUrl Starting URL for the sequence
   * @param direction Direction to crawl
   * @param imageLimit Maximum images to load per batch
   * @param callbacks UI callback functions
   */
  constructor(
    sourceUrl: string | null,
    direction: CrawlDirection = 'both',
    imageLimit: number = 100,
    callbacks: {
      onImageAdded: (url: string, prepend: boolean) => void;
      onLoadingUpdate: (message: string) => void;
      onCrawlingComplete: () => void;
    }
  ) {
    this.sourceUrl = sourceUrl;
    this.crawlDirection = direction;
    this.imageLimit = imageLimit;

    // Set callbacks
    this.onImageAdded = callbacks.onImageAdded;
    this.onLoadingUpdate = callbacks.onLoadingUpdate;
    this.onCrawlingComplete = callbacks.onCrawlingComplete;
  }

  /**
   * Get all images in the sequence
   */
  getImages(): string[] {
    return this.images;
  }

  /**
   * Add a single image to the collection
   * @param url Image URL to add
   * @param prepend Whether to prepend to the list
   */
  async addImage(url: string, prepend: boolean = false): Promise<boolean> {
    try {
      // Check if image exists
      const exists = await ImageUtils.checkImageExists(url);
      if (!exists) return false;

      // Add to images array
      if (prepend) {
        this.images.unshift(url);
      } else {
        this.images.push(url);
      }

      // Call the callback
      this.onImageAdded(url, prepend);
      return true;
    } catch (error) {
      console.error('Error adding image:', error);
      return false;
    }
  }

  /**
   * Stop crawling images
   */
  stopCrawling(): void {
    this.isCrawlingStopped = true;
    this.canContinueCrawlingDown = false;
    this.canContinueCrawlingUp = false;
    this.onCrawlingComplete();
  }

  /**
   * Get crawling status
   */
  getCrawlingStatus(): {
    isStopped: boolean;
    canContinueUp: boolean;
    canContinueDown: boolean;
  } {
    return {
      isStopped: this.isCrawlingStopped,
      canContinueUp: this.canContinueCrawlingUp,
      canContinueDown: this.canContinueCrawlingDown
    };
  }

  /**
   * Load the image sequence starting from the source URL
   */
  async loadImageSequence(): Promise<void> {
    try {
      // Reset state
      this.isCrawlingStopped = false;

      if (!this.sourceUrl) {
        console.error('No source URL provided');
        this.onCrawlingComplete();
        return;
      }

      // First add the source URL
      await this.addImage(this.sourceUrl);

      // Get the parsed URI
      const parsedURI = await sendMessage<ParsedURI>({
        action: MessageActions.PARSE_URI,
        uri: this.sourceUrl
      });

      if (!parsedURI || !parsedURI.num) {
        // If URL doesn't contain a number, just show the source image
        this.onCrawlingComplete();
        return;
      }

      // Save the parsed URI for potential "load more" operations
      this.currentParsedURI = { ...parsedURI };
      this.currentUpwardURI = { ...parsedURI };
      this.currentDownwardURI = { ...parsedURI };

      // Determine crawl direction
      let shouldCrawlDown = this.crawlDirection === 'both' || this.crawlDirection === 'prev';
      let shouldCrawlUp = this.crawlDirection === 'both' || this.crawlDirection === 'next';

      let totalImagesToFind = this.imageLimit;

      // Calculate images per direction
      let downLimit = totalImagesToFind;
      let upLimit = totalImagesToFind;

      if (this.crawlDirection === 'both') {
        // Split the limit between previous and next
        downLimit = Math.floor(totalImagesToFind / 2);
        upLimit = Math.floor(totalImagesToFind / 2);
      }

      // Find images in the specified direction(s)
      let foundDownImages = 0;
      if (shouldCrawlDown) {
        // Find images before the source (going down)
        foundDownImages = await this.findPreviousImages(parsedURI, downLimit);
        console.log(`Found ${foundDownImages} previous images out of ${downLimit} limit`);
      }

      // If we didn't find the full allocation of previous images and we're in 'both' mode,
      // add the remaining allocation to the next search
      if (this.crawlDirection === 'both' && foundDownImages < downLimit) {
        const unusedAllocation = downLimit - foundDownImages;
        upLimit += unusedAllocation;
        console.log(`Reallocating ${unusedAllocation} unused previous image slots to next search (new limit: ${upLimit})`);
      }

      if (shouldCrawlUp && !this.isCrawlingStopped) {
        // Find images after the source (going up)
        const foundUpImages = await this.findNextImages(parsedURI, upLimit);
        console.log(`Found ${foundUpImages} next images out of ${upLimit} limit`);

        // If we're in 'prev' mode and found nothing, try looking for next images instead
        if (this.crawlDirection === 'prev' && foundDownImages === 0 && this.images.length <= 1) {
          console.log("No previous images found, searching for next images instead");
          await this.findNextImages(parsedURI, totalImagesToFind);
        }
      }

      this.onCrawlingComplete();
    } catch (error) {
      console.error('Error loading image sequence:', error);
      this.onCrawlingComplete();
    }
  }

  /**
   * Load more images in the sequence
   */
  async loadMoreImages(): Promise<void> {
    if (!this.sourceUrl) return;

    this.onLoadingUpdate('Loading more images...');

    // Calculate how many more images to load based on direction
    const moreImageLimit = this.imageLimit;

    // Determine which direction(s) to load more images from
    if (this.crawlDirection === 'both') {
      // Try to continue in both directions if possible
      let downLimit = Math.floor(moreImageLimit / 2);
      let upLimit = Math.floor(moreImageLimit / 2);

      let foundDownImages = 0;
      if (this.canContinueCrawlingDown && this.currentDownwardURI) {
        foundDownImages = await this.findPreviousImages(this.currentDownwardURI, downLimit);
        console.log(`Found ${foundDownImages} more previous images out of ${downLimit} limit`);
      }

      // Reallocate unused slots
      if (foundDownImages < downLimit) {
        const unusedAllocation = downLimit - foundDownImages;
        upLimit += unusedAllocation;
        console.log(`Reallocating ${unusedAllocation} unused previous image slots to next search (new limit: ${upLimit})`);
      }

      if (this.canContinueCrawlingUp && this.currentUpwardURI) {
        const foundUpImages = await this.findNextImages(this.currentUpwardURI, upLimit);
        console.log(`Found ${foundUpImages} more next images out of ${upLimit} limit`);
      }
    } else if (this.crawlDirection === 'prev' && this.canContinueCrawlingDown && this.currentDownwardURI) {
      const foundImages = await this.findPreviousImages(this.currentDownwardURI, moreImageLimit);
      console.log(`Found ${foundImages} more previous images out of ${moreImageLimit} limit`);

      // If we found nothing, try looking for next images instead
      if (foundImages === 0 && this.canContinueCrawlingUp && this.currentUpwardURI) {
        console.log("No more previous images found, searching for next images instead");
        await this.findNextImages(this.currentUpwardURI, moreImageLimit);
      }
    } else if (this.crawlDirection === 'next' && this.canContinueCrawlingUp && this.currentUpwardURI) {
      const foundImages = await this.findNextImages(this.currentUpwardURI, moreImageLimit);
      console.log(`Found ${foundImages} more next images out of ${moreImageLimit} limit`);

      // If we found nothing, try looking for previous images instead
      if (foundImages === 0 && this.canContinueCrawlingDown && this.currentDownwardURI) {
        console.log("No more next images found, searching for previous images instead");
        await this.findPreviousImages(this.currentDownwardURI, moreImageLimit);
      }
    }

    this.onCrawlingComplete();
  }

  /**
   * Find previous images in the sequence
   * @param startURI Starting URI to search from
   * @param limit Maximum number of images to find
   * @returns Number of images found
   */
  private async findPreviousImages(startURI: ParsedURI, limit: number): Promise<number> {
    // Make a copy for manipulation
    let currentParsedURI = { ...startURI };
    let countTries = 0;
    let foundImages = 0;

    while (foundImages < limit && !this.isCrawlingStopped && this.canContinueCrawlingDown) {
      // Update loading text with progress
      this.onLoadingUpdate(`Finding previous images... (${foundImages}/${limit})`);

      let prevURI = await sendMessage<string | false>({
        action: MessageActions.CHANGE_URI_NUMBER,
        oURI: currentParsedURI,
        direction: 'down'
      });

      // Try to handle transitions (e.g., 10 to 9)
      if (prevURI && parseInt(currentParsedURI.num as string, 10) % 10 === 0) {
        const altURI = await sendMessage<string | false>({
          action: MessageActions.CHANGE_URI_NUMBER,
          oURI: { ...currentParsedURI },
          direction: 'down',
          forceZero: true
        });

        if (altURI) {
          const altExists = await ImageUtils.checkImageExists(altURI);
          if (altExists) {
            prevURI = altURI;
          }
        }
      }

      if (prevURI) {
        // Add delay between requests to avoid bot detection
        await ImageUtils.delay(200 + Math.random() * 300);

        const exists = await ImageUtils.checkImageExists(prevURI);
        if (exists) {
          // Add to display immediately
          await this.addImage(prevURI, true); // prepend
          foundImages++;
          countTries = 0;

          // Update the current URI for next iteration
          currentParsedURI = await sendMessage<ParsedURI>({
            action: MessageActions.PARSE_URI,
            uri: prevURI
          });

          // Save the downward position for load more operation
          this.currentDownwardURI = { ...currentParsedURI };
        } else {
          countTries++;
          if (countTries >= 10) {
            this.canContinueCrawlingDown = false;
            break;
          }

          // Skip to next index - update current URI to continue from the failed one
          currentParsedURI = await sendMessage<ParsedURI>({
            action: MessageActions.PARSE_URI,
            uri: prevURI
          });

          // Save the downward position for load more operation even when skipping
          this.currentDownwardURI = { ...currentParsedURI };
        }
      } else {
        this.canContinueCrawlingDown = false;
        break;
      }
    }

    return foundImages;
  }

  /**
   * Find next images in the sequence
   * @param startURI Starting URI to search from
   * @param limit Maximum number of images to find
   * @returns Number of images found
   */
  private async findNextImages(startURI: ParsedURI, limit: number): Promise<number> {
    // Make a copy for manipulation
    let currentParsedURI = { ...startURI };
    let countTries = 0;
    let foundImages = 0;

    while (foundImages < limit && !this.isCrawlingStopped && this.canContinueCrawlingUp) {
      // Update loading text with progress
      this.onLoadingUpdate(`Finding next images... (${foundImages}/${limit})`);

      let nextURI = await sendMessage<string | false>({
        action: MessageActions.CHANGE_URI_NUMBER,
        oURI: currentParsedURI,
        direction: 'up'
      });

      if (nextURI) {
        // Add delay between requests to avoid bot detection
        await ImageUtils.delay(200 + Math.random() * 300);

        const exists = await ImageUtils.checkImageExists(nextURI);
        if (exists) {
          // Add to display immediately
          await this.addImage(nextURI);
          foundImages++;
          countTries = 0;

          // Update the current URI for next iteration
          currentParsedURI = await sendMessage<ParsedURI>({
            action: MessageActions.PARSE_URI,
            uri: nextURI
          });

          // Save the upward position for load more operation
          this.currentUpwardURI = { ...currentParsedURI };
        } else {
          countTries++;
          if (countTries >= 10) {
            this.canContinueCrawlingUp = false;
            break;
          }

          // Skip to next index - update current URI to continue from the failed one
          currentParsedURI = await sendMessage<ParsedURI>({
            action: MessageActions.PARSE_URI,
            uri: nextURI
          });

          // Save the upward position for load more operation even when skipping
          this.currentUpwardURI = { ...currentParsedURI };
        }
      } else {
        this.canContinueCrawlingUp = false;
        break;
      }
    }

    return foundImages;
  }
}
