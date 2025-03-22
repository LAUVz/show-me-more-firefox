// Show Me More - Gallery Script
import ImageSimilarity from './image-similarity';

interface RecordedImage {
  url: string;
  timestamp: number;
}

interface ParsedURI {
  first: string;
  num: string | false;
  last: string;
}

class Gallery {
  private mode: 'sequence' | 'recorded' = 'recorded';
  private crawlDirection: 'both' | 'prev' | 'next' = 'both';
  private sourceUrl: string | null = null;
  private images: string[] = [];
  private recordedImages: RecordedImage[] = [];
  private mainImageContainer: HTMLElement;
  private loadingElement: HTMLElement;
  private emptyStateElement: HTMLElement;
  private shareContainer: HTMLElement;
  private shareLinkInput: HTMLInputElement;
  private adjustSizeButton: HTMLButtonElement;
  private createLinkButton: HTMLButtonElement;
  private copyButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement | null = null;
  private detectDuplicatesButton: HTMLButtonElement;
  private loadMoreButton: HTMLButtonElement;
  private loadMoreContainer: HTMLElement;
  private imagesAdjusted: boolean = false;
  private isLoading: boolean = true;
  private isCrawlingStopped: boolean = false;
  private loadingText: HTMLElement;
  private imageLimit: number = 100;
  private currentParsedURI: ParsedURI | null = null;
  private canContinueCrawlingUp: boolean = true;
  private canContinueCrawlingDown: boolean = true;
  // Image similarity properties
  private duplicateGroups: Map<string, string[]> = new Map();
  private imageHashes: Map<string, string> = new Map();
  private isDuplicateDetectionEnabled: boolean = false;

  constructor() {
    this.mainImageContainer = document.getElementById('image-container') as HTMLElement;
    this.loadingElement = document.getElementById('loading') as HTMLElement;
    this.loadingText = document.getElementById('loading-text') as HTMLElement;
    this.emptyStateElement = document.getElementById('empty-state') as HTMLElement;
    this.shareContainer = document.getElementById('share-container') as HTMLElement;
    this.shareLinkInput = document.getElementById('share-link') as HTMLInputElement;
    this.adjustSizeButton = document.getElementById('button-adjust-size') as HTMLButtonElement;
    this.createLinkButton = document.getElementById('button-create-link') as HTMLButtonElement;
    this.copyButton = document.getElementById('copy-button') as HTMLButtonElement;
    this.stopButton = document.getElementById('button-stop-crawling') as HTMLButtonElement;
    this.detectDuplicatesButton = document.getElementById('button-detect-duplicates') as HTMLButtonElement;
    this.loadMoreButton = document.getElementById('load-more-button') as HTMLButtonElement;
    this.loadMoreContainer = document.getElementById('load-more-container') as HTMLElement;

    this.init();
  }

  async init(): Promise<void> {
    // Parse URL parameters to determine mode and source
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('source')) {
      this.mode = 'sequence';
      this.sourceUrl = urlParams.get('source');

      // Check if direction is specified
      if (urlParams.has('direction')) {
        const direction = urlParams.get('direction');
        if (direction === 'prev' || direction === 'next') {
          this.crawlDirection = direction as 'prev' | 'next';
        }
      }
    } else if (urlParams.has('mode') && urlParams.get('mode') === 'recorded') {
      this.mode = 'recorded';
    }

    // Show loading indicator and hide other elements
    this.loadingElement.classList.remove('hidden');
    this.emptyStateElement.classList.add('hidden');
    this.mainImageContainer.classList.add('hidden');
    this.loadMoreContainer.classList.add('hidden');

    // Set up event listeners
    this.adjustSizeButton.addEventListener('click', this.toggleImageSize.bind(this));
    this.createLinkButton.addEventListener('click', this.createShareLink.bind(this));
    this.copyButton.addEventListener('click', this.copyShareLink.bind(this));
    this.loadMoreButton.addEventListener('click', this.loadMoreImages.bind(this));
    this.detectDuplicatesButton.addEventListener('click', this.toggleDuplicateDetection.bind(this));

    if (this.stopButton) {
      this.stopButton.addEventListener('click', this.stopCrawling.bind(this));

      // Only show stop button in sequence mode
      if (this.mode === 'sequence') {
        this.stopButton.style.display = 'block';
      } else {
        this.stopButton.style.display = 'none';
      }
    }

    // Load images based on mode
    if (this.mode === 'sequence' && this.sourceUrl) {
      await this.loadImageSequence(this.sourceUrl);
    } else {
      await this.loadRecordedImages();
    }
  }

  private async loadRecordedImages(): Promise<void> {
    try {
      // Show loading indicator
      this.loadingElement.classList.remove('hidden');
      this.emptyStateElement.classList.add('hidden');
      this.mainImageContainer.classList.add('hidden');

      this.updateLoadingText("Loading recorded images...");

      this.recordedImages = await browser.runtime.sendMessage({ action: 'getRecordedImages' });

      if (this.recordedImages.length === 0) {
        this.showEmptyState();
        return;
      }

      // Convert to array of URLs for display
      this.images = this.recordedImages.map(item => item.url);

      this.displayImages();
    } catch (error) {
      console.error('Error loading recorded images:', error);
      this.showEmptyState();
    }
  }

  private async loadMoreImages(): Promise<void> {
    if (!this.sourceUrl || !this.currentParsedURI) return;

    // Hide the load more button while loading
    this.loadMoreContainer.classList.add('hidden');

    // Show loading indicator
    this.loadingElement.classList.remove('hidden');
    this.updateLoadingText('Loading more images...');

    // Calculate how many more images to load based on direction
    const moreImageLimit = this.imageLimit;

    // Determine which direction(s) to load more images from
    if (this.crawlDirection === 'both') {
      // Try to continue in both directions if possible
      let downLimit = Math.floor(moreImageLimit / 2);
      let upLimit = Math.floor(moreImageLimit / 2);

      let foundDownImages = 0;
      if (this.canContinueCrawlingDown) {
        foundDownImages = await this.findPreviousImages(this.currentParsedURI, downLimit);
        console.log(`Found ${foundDownImages} more previous images out of ${downLimit} limit`);
      }

      // Reallocate unused slots
      if (foundDownImages < downLimit) {
        const unusedAllocation = downLimit - foundDownImages;
        upLimit += unusedAllocation;
        console.log(`Reallocating ${unusedAllocation} unused previous image slots to next search (new limit: ${upLimit})`);
      }

      if (this.canContinueCrawlingUp) {
        const foundUpImages = await this.findNextImages(this.currentParsedURI, upLimit);
        console.log(`Found ${foundUpImages} more next images out of ${upLimit} limit`);
      }
    } else if (this.crawlDirection === 'prev' && this.canContinueCrawlingDown) {
      const foundImages = await this.findPreviousImages(this.currentParsedURI, moreImageLimit);
      console.log(`Found ${foundImages} more previous images out of ${moreImageLimit} limit`);

      // If we found nothing, try looking for next images instead
      if (foundImages === 0 && this.canContinueCrawlingUp) {
        console.log("No more previous images found, searching for next images instead");
        await this.findNextImages(this.currentParsedURI, moreImageLimit);
      }
    } else if (this.crawlDirection === 'next' && this.canContinueCrawlingUp) {
      const foundImages = await this.findNextImages(this.currentParsedURI, moreImageLimit);
      console.log(`Found ${foundImages} more next images out of ${moreImageLimit} limit`);

      // If we found nothing, try looking for previous images instead
      if (foundImages === 0 && this.canContinueCrawlingDown) {
        console.log("No more next images found, searching for previous images instead");
        await this.findPreviousImages(this.currentParsedURI, moreImageLimit);
      }
    }

    // Hide loading indicator
    this.loadingElement.classList.add('hidden');

    // Show the load more button if we can still load more
    if (this.canContinueCrawlingDown || this.canContinueCrawlingUp) {
      this.loadMoreContainer.classList.remove('hidden');
    }
  }

  private stopCrawling(): void {
    this.isCrawlingStopped = true;
    this.canContinueCrawlingDown = false;
    this.canContinueCrawlingUp = false;

    if (this.stopButton) {
      this.stopButton.textContent = 'Crawling Stopped';
      this.stopButton.disabled = true;
    }

    if (this.loadingText) {
      this.loadingText.textContent = 'Crawling stopped. Showing found images...';
    }

    // Hide loading and load more button after a short delay
    setTimeout(() => {
      this.loadingElement.classList.add('hidden');
      this.loadMoreContainer.classList.add('hidden');
    }, 1000);

    // If we have no images, show empty state
    if (this.images.length === 0) {
      this.showEmptyState();
    }
  }

  private async loadImageSequence(sourceUrl: string): Promise<void> {
    try {
      // Reset state
      this.isLoading = true;
      this.isCrawlingStopped = false;

      if (this.images.length === 0) {
        // Show loading indicator and clear container
        this.loadingElement.classList.remove('hidden');
        this.emptyStateElement.classList.add('hidden');
        this.mainImageContainer.classList.remove('hidden');
        this.mainImageContainer.innerHTML = '';
      }

      // First add the source URL
      await this.addImageToDisplay(sourceUrl);

      // Get the parsed URI
      const parsedURI = await browser.runtime.sendMessage({
        action: 'parseURI',
        uri: sourceUrl
      });

      if (!parsedURI || !parsedURI.num) {
        // If URL doesn't contain a number, just show the source image
        this.loadingElement.classList.add('hidden');
        return;
      }

      // Save the parsed URI for potential "load more" operations
      this.currentParsedURI = { ...parsedURI };

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

      this.isLoading = false;
      this.loadingElement.classList.add('hidden');

      // Disable stop button after crawling is complete
      if (this.stopButton) {
        this.stopButton.disabled = true;
        this.stopButton.textContent = 'Crawling Completed';
      }

      // If we have images and can continue crawling, show the load more button
      if (this.images.length > 0 && (this.canContinueCrawlingDown || this.canContinueCrawlingUp)) {
        this.loadMoreContainer.classList.remove('hidden');
      } else {
        this.loadMoreContainer.classList.add('hidden');
      }

      // Show empty state if no images were found
      if (this.images.length === 0) {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Error loading image sequence:', error);
      this.isLoading = false;
      this.loadingElement.classList.add('hidden');

      // Disable stop button after error
      if (this.stopButton) {
        this.stopButton.disabled = true;
      }

      if (this.images.length === 0) {
        this.showEmptyState();
      }
    }
  }

  private async findPreviousImages(startURI: ParsedURI, limit: number): Promise<number> {
    // Make a copy for manipulation
    let currentParsedURI = { ...startURI };
    let countTries = 0;
    let foundImages = 0;

    while (foundImages < limit && !this.isCrawlingStopped && this.canContinueCrawlingDown) {
      // Update loading text with progress
      this.updateLoadingText(`Finding previous images... (${foundImages}/${limit})`);

      let prevURI = await browser.runtime.sendMessage({
        action: 'changeURINumber',
        oURI: currentParsedURI,
        direction: 'down'
      });

      // Try to handle transitions (e.g., 10 to 9)
      if (prevURI && parseInt(currentParsedURI.num as string, 10) % 10 === 0) {
        const altURI = await browser.runtime.sendMessage({
          action: 'changeURINumber',
          oURI: { ...currentParsedURI },
          direction: 'down',
          forceZero: true
        });

        if (altURI) {
          const altExists = await this.checkImageExists(altURI);
          if (altExists) {
            prevURI = altURI;
          }
        }
      }

      if (prevURI) {
        // Add delay between requests to avoid bot detection
        await this.delay(200 + Math.random() * 300);

        const exists = await this.checkImageExists(prevURI);
        if (exists) {
          // Add to display immediately
          await this.addImageToDisplay(prevURI, true); // prepend
          foundImages++;
          countTries = 0;

          // Update the current URI for next iteration
          currentParsedURI = await browser.runtime.sendMessage({
            action: 'parseURI',
            uri: prevURI
          });

          // Save the current URI for load more operation
          this.currentParsedURI = { ...currentParsedURI };
        } else {
          countTries++;
          if (countTries > 1) {
            this.canContinueCrawlingDown = false;
            break;
          }
        }
      } else {
        this.canContinueCrawlingDown = false;
        break;
      }
    }

    return foundImages;
  }

  private async findNextImages(startURI: ParsedURI, limit: number): Promise<number> {
    // Make a copy for manipulation
    let currentParsedURI = { ...startURI };
    let countTries = 0;
    let foundImages = 0;

    while (foundImages < limit && !this.isCrawlingStopped && this.canContinueCrawlingUp) {
      // Update loading text with progress
      this.updateLoadingText(`Finding next images... (${foundImages}/${limit})`);

      let nextURI = await browser.runtime.sendMessage({
        action: 'changeURINumber',
        oURI: currentParsedURI,
        direction: 'up'
      });

      if (nextURI) {
        // Add delay between requests to avoid bot detection
        await this.delay(200 + Math.random() * 300);

        const exists = await this.checkImageExists(nextURI);
        if (exists) {
          // Add to display immediately
          await this.addImageToDisplay(nextURI);
          foundImages++;
          countTries = 0;

          // Update the current URI for next iteration
          currentParsedURI = await browser.runtime.sendMessage({
            action: 'parseURI',
            uri: nextURI
          });

          // Save the current URI for load more operation
          this.currentParsedURI = { ...currentParsedURI };
        } else {
          countTries++;
          if (countTries > 1) {
            this.canContinueCrawlingUp = false;
            break;
          }
        }
      } else {
        this.canContinueCrawlingUp = false;
        break;
      }
    }

    return foundImages;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateLoadingText(text: string): void {
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
  }

  private async checkImageExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });

      if (!response.ok) return false;

      const contentType = response.headers.get('Content-Type');
      return contentType !== null && /.*image.*/i.test(contentType);
    } catch (e) {
      return false;
    }
  }

  private async addImageToDisplay(imageUrl: string, prepend: boolean = false): Promise<void> {
    // Add to our images array
    if (prepend) {
      this.images.unshift(imageUrl);
    } else {
      this.images.push(imageUrl);
    }

    // Create the image element
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.dataset.url = imageUrl;

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Image ' + this.images.length;
    img.className = 'gallery-image';

    // Handle loading error
    img.onerror = () => {
      img.src = '../icons/broken-image.svg';
      img.alt = 'Failed to load image';
    };

    const imageInfo = document.createElement('div');
    imageInfo.className = 'image-info';

    const linkContainer = document.createElement('div');

    const link = document.createElement('a');
    link.href = imageUrl;
    link.className = 'image-url';
    link.textContent = this.truncateUrl(imageUrl);
    link.title = imageUrl;
    link.target = '_blank';

    linkContainer.appendChild(link);

    const imageActions = document.createElement('div');
    imageActions.className = 'image-actions';

    const openButton = document.createElement('button');
    openButton.textContent = 'Open in New Tab';
    openButton.className = 'image-action';
    openButton.addEventListener('click', () => {
      browser.tabs.create({ url: imageUrl });
    });

    imageActions.appendChild(openButton);

    // Add remove button for sequence mode
    if (this.mode === 'sequence') {
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.className = 'image-action remove';
      removeButton.addEventListener('click', () => {
        // Remove from images array
        const index = this.images.indexOf(imageUrl);
        if (index !== -1) {
          this.images.splice(index, 1);
        }

        // Remove from DOM
        imageItem.remove();

        // Show empty state if no more images
        if (this.images.length === 0) {
          this.showEmptyState();
        }
      });

      imageActions.appendChild(removeButton);
    } else if (this.mode === 'recorded') {
      // The existing removal logic for recorded mode
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.className = 'image-action remove';
      removeButton.addEventListener('click', async () => {
        // Find index in recorded images array
        const recordedIndex = this.recordedImages.findIndex(item => item.url === imageUrl);
        if (recordedIndex !== -1) {
          await browser.runtime.sendMessage({
            action: 'removeImage',
            index: recordedIndex
          });

          // Remove from local arrays
          this.recordedImages.splice(recordedIndex, 1);
          const index = this.images.indexOf(imageUrl);
          if (index !== -1) {
            this.images.splice(index, 1);
          }

          // Remove from DOM
          imageItem.remove();

          // Show empty state if no more images
          if (this.images.length === 0) {
            this.showEmptyState();
          }
        }
      });

      imageActions.appendChild(removeButton);
    }

    imageWrapper.appendChild(img);
    imageItem.appendChild(imageWrapper);
    imageInfo.appendChild(linkContainer);
    imageInfo.appendChild(imageActions);
    imageItem.appendChild(imageInfo);

    // Add to the container (at beginning or end)
    if (prepend) {
      this.mainImageContainer.insertBefore(imageItem, this.mainImageContainer.firstChild);
    } else {
      this.mainImageContainer.appendChild(imageItem);
    }
  }

  // This method is now mostly used for recorded images
  private displayImages(): void {
    // Hide loading indicator
    this.loadingElement.classList.add('hidden');

    // Hide empty state
    this.emptyStateElement.classList.add('hidden');

    // Show the container
    this.mainImageContainer.classList.remove('hidden');

    // Clear container
    this.mainImageContainer.innerHTML = '';

    // Create elements for each image
    this.images.forEach(async (imageUrl) => {
      await this.addImageToDisplay(imageUrl);
    });
  }

  private truncateUrl(url: string): string {
    if (url.length <= 60) return url;
    return url.substring(0, 30) + '...' + url.substring(url.length - 27);
  }

  private showEmptyState(): void {
    this.loadingElement.classList.add('hidden');
    this.mainImageContainer.classList.add('hidden');
    this.emptyStateElement.classList.remove('hidden');
    this.loadMoreContainer.classList.add('hidden');
    this.createLinkButton.disabled = true;
  }

  private toggleImageSize(): void {
    this.imagesAdjusted = !this.imagesAdjusted;

    const images = document.querySelectorAll('.gallery-image') as NodeListOf<HTMLImageElement>;

    images.forEach(img => {
      if (this.imagesAdjusted) {
        img.style.objectFit = 'cover';
        this.adjustSizeButton.textContent = 'Show Original Sizes';
      } else {
        img.style.objectFit = 'contain';
        this.adjustSizeButton.textContent = 'Adjust Images Size';
      }
    });
  }

  private async createShareLink(): Promise<void> {
    if (this.images.length === 0) return;

    this.createLinkButton.disabled = true;
    this.createLinkButton.textContent = 'Creating Link...';

    try {
      console.log("Attempting to create share link for", this.images.length, "images");

      const shareUrl = await browser.runtime.sendMessage({
        action: 'createLink',
        urls: this.images
      });

      console.log("Share URL result:", shareUrl);

      if (shareUrl) {
        this.shareLinkInput.value = shareUrl;
        this.shareContainer.classList.remove('hidden');
        this.shareLinkInput.select();
      } else {
        console.error("Failed to create share link: No URL returned");
        alert('Failed to create share link. Please try again later.');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link. Please try again later.');
    } finally {
      this.createLinkButton.disabled = false;
      this.createLinkButton.textContent = 'Share';
    }
  }

  private copyShareLink(): void {
    this.shareLinkInput.select();
    document.execCommand('copy');

    // Visual feedback
    const originalText = this.copyButton.textContent;
    this.copyButton.textContent = 'Copied!';
    setTimeout(() => {
      this.copyButton.textContent = originalText;
    }, 2000);
  }

  /**
   * Toggle duplicate detection feature
   */
  private async toggleDuplicateDetection(): Promise<void> {
    if (!this.isDuplicateDetectionEnabled) {
      // Start detection
      this.detectDuplicatesButton.disabled = true;
      this.detectDuplicatesButton.textContent = 'Detecting...';

      // Show loading indicator
      this.loadingElement.classList.remove('hidden');
      this.updateLoadingText('Analyzing images for duplicates...');

      // Need to let UI update before starting the heavy work
      await this.delay(100);

      // Process images
      await this.detectDuplicates();

      // Hide loading
      this.loadingElement.classList.add('hidden');

      // Update button
      this.detectDuplicatesButton.textContent = 'Hide Duplicates';
      this.detectDuplicatesButton.disabled = false;
      this.isDuplicateDetectionEnabled = true;
    } else {
      // Hide duplicates
      this.hideDuplicateMarkers();
      this.detectDuplicatesButton.textContent = 'Detect Duplicates';
      this.isDuplicateDetectionEnabled = false;
    }
  }

  /**
   * Detect duplicate images in the gallery
   */
  private async detectDuplicates(): Promise<void> {
    try {
      // Only process if we have images
      if (this.images.length <= 1) {
        alert('Need at least two images to detect duplicates.');
        return;
      }

      // If we already processed these images, just show the results
      if (this.duplicateGroups.size > 0) {
        this.showDuplicateMarkers();
        return;
      }

      // Process in chunks to avoid UI freezing
      const chunkSize = 10;
      const imageUrls = [...this.images]; // Copy array

      // Generate hashes in chunks
      for (let i = 0; i < imageUrls.length; i += chunkSize) {
        const chunk = imageUrls.slice(i, i + chunkSize);

        // Update loading text
        this.updateLoadingText(`Generating image fingerprints... (${i}/${imageUrls.length})`);

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
        await this.delay(50);
      }

      this.updateLoadingText('Comparing images...');
      await this.delay(50);

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

      // Show summary
      const totalDuplicates = Array.from(this.duplicateGroups.values())
        .reduce((sum, group) => sum + group.length - 1, 0);

      if (totalDuplicates > 0) {
        alert(`Found ${totalDuplicates} duplicate images in ${this.duplicateGroups.size} groups.`);
      } else {
        alert('No duplicate images found.');
      }
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      alert('Error detecting duplicates. See console for details.');
    }
  }

  /**
   * Add duplicate markers to images in the gallery
   */
  private showDuplicateMarkers(): void {
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
        const imageItem = document.querySelector(`.image-item[data-url="${this.escapeSelector(url)}"]`) as HTMLElement;
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
        const imageWrapper = imageItem.querySelector('.image-wrapper');
        if (imageWrapper) {
          imageWrapper.appendChild(badge);
        }

        const imageInfo = imageItem.querySelector('.image-info');
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
  private hideDuplicateMarkers(): void {
    // Remove all duplicate markers
    document.querySelectorAll('.duplicate-badge').forEach(badge => badge.remove());
    document.querySelectorAll('.duplicate-info').forEach(info => info.remove());
    document.querySelectorAll('.image-item.is-duplicate').forEach(item => {
      item.classList.remove('is-duplicate');
      delete (item as HTMLElement).dataset.duplicateGroup;
    });

    // Reset any filtering
    document.querySelectorAll('.image-item').forEach(item => {
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
      document.querySelectorAll('.image-item').forEach(item => {
        (item as HTMLElement).style.display = 'block';
      });

      // Update all buttons in this group
      document.querySelectorAll(`.filter-btn[data-group="${groupId}"]`).forEach(btn => {
        (btn as HTMLButtonElement).textContent = 'Show only this group';
      });
    } else {
      // Filter to show only this group
      document.querySelectorAll('.image-item').forEach(item => {
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

  /**
   * Helper to escape special characters in URL for querySelector
   */
  private escapeSelector(selector: string): string {
    return selector
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\\/g, '\\\\')
      .replace(/[\[\]()]/g, '\\$&');
  }
}

// Initialize gallery when document is ready
document.addEventListener('DOMContentLoaded', () => {
  new Gallery();
});
