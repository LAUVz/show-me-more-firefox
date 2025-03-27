// Show Me More - Gallery Main Controller
import { CrawlDirection } from '../shared/types';
import { MessageActions, sendMessage } from '../shared/messaging';
import { UIManager } from './ui-manager';
import { SequenceManager } from './sequence-manager';
import { RecordedManager } from './recorded-manager';
import { DuplicateDetector } from './duplicate-detector';

/**
 * Main Gallery controller that coordinates all gallery components
 */
class Gallery {
  // Mode settings
  private mode: 'sequence' | 'recorded' = 'recorded';
  private sourceUrl: string | null = null;
  private crawlDirection: CrawlDirection = 'both';

  // Component managers
  private uiManager: UIManager;
  private sequenceManager: SequenceManager | null = null;
  private recordedManager: RecordedManager | null = null;
  private duplicateDetector: DuplicateDetector;

  constructor() {
    // Initialize the UI manager
    this.uiManager = new UIManager();

    // Initialize the duplicate detector
    this.duplicateDetector = new DuplicateDetector();

    // Parse URL parameters and set up the gallery
    this.init();
  }

  /**
   * Initialize the gallery based on mode
   */
  async init(): Promise<void> {
    // Parse URL parameters to determine mode and source
    this.parseUrlParameters();

    // Show loading indicator
    this.uiManager.showLoading();
    this.uiManager.clearImageContainer();

    // Set up event listeners
    this.setupEventListeners();

    // Load images based on mode
    if (this.mode === 'sequence' && this.sourceUrl) {
      await this.initSequenceMode();
    } else {
      await this.initRecordedMode();
    }
  }

  /**
   * Set up event listeners for UI interactions
   */
  private setupEventListeners(): void {
    // Set up duplicate detection button
    this.uiManager.getDuplicateDetectionButton().addEventListener('click',
      this.toggleDuplicateDetection.bind(this));

    // Set up share button
    this.uiManager.setupShareButton(this.createShareLink.bind(this));

    // Set up stop button if in sequence mode
    const stopButton = this.uiManager.getStopButton();
    if (stopButton) {
      stopButton.addEventListener('click', this.stopCrawling.bind(this));

      // Only show stop button in sequence mode
      stopButton.style.display = this.mode === 'sequence' ? 'block' : 'none';
    }

    // Set up load more button
    this.uiManager.getLoadMoreButton().addEventListener('click', this.loadMoreImages.bind(this));

    // Set up download button
    const downloadButton = document.getElementById('download-share-button') as HTMLButtonElement;
    if (downloadButton) {
      downloadButton.addEventListener('click', this.downloadImages.bind(this));
    }
  }

  /**
   * Download all images as a zip file
   */
  private async downloadImages(): Promise<void> {
    // Get images based on mode
    const images = this.mode === 'sequence'
      ? this.sequenceManager?.getImages() || []
      : this.recordedManager?.getImageUrls() || [];

    if (images.length === 0) return;

    // Create a message to notify user that download will start in browser
    alert('Your browser will start downloading images shortly. This may take a moment depending on the number of images.');

    // Create a list of image URLs for download
    const downloadLinks = images.map(url => {
      const link = document.createElement('a');
      link.href = url;
      link.download = url.split('/').pop() || 'image.jpg';
      return link;
    });

    // Download images one by one with a small delay to avoid browser issues
    for (let i = 0; i < downloadLinks.length; i++) {
      const link = downloadLinks[i];
      setTimeout(() => {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, i * 500); // 500ms delay between downloads
    }
  }

  /**
   * Parse URL parameters to determine gallery mode
   */
  private parseUrlParameters(): void {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('source')) {
      this.mode = 'sequence';
      this.sourceUrl = urlParams.get('source');

      // Check if direction is specified
      if (urlParams.has('direction')) {
        const direction = urlParams.get('direction');
        if (direction === 'prev' || direction === 'next') {
          this.crawlDirection = direction as CrawlDirection;
        }
      }
    } else if (urlParams.has('mode') && urlParams.get('mode') === 'recorded') {
      this.mode = 'recorded';
    }
  }

  /**
   * Initialize sequence mode
   * Sets up sequence manager and starts loading the image sequence
   */
  private async initSequenceMode(): Promise<void> {
    // Create the sequence manager
    this.sequenceManager = new SequenceManager(
      this.sourceUrl,
      this.crawlDirection,
      100, // image limit
      {
        onImageAdded: (url, prepend) => {
          this.uiManager.createImageElement(url, prepend, (imageUrl) => {
            if (this.sequenceManager) {
              // Remove from sequence manager's images array
              const images = this.sequenceManager.getImages();
              const index = images.indexOf(imageUrl);
              if (index !== -1) {
                images.splice(index, 1);
              }

              // Show empty state if no more images
              if (images.length === 0) {
                this.uiManager.showEmptyState();
              }
            }
          });
        },
        onLoadingUpdate: (message) => {
          this.uiManager.updateLoadingText(message);
        },
        onCrawlingComplete: () => {
          this.uiManager.hideLoading();

          // Check if we can continue crawling and show/hide load more button
          if (this.sequenceManager) {
            const status = this.sequenceManager.getCrawlingStatus();
            const canContinue = !status.isStopped &&
              (status.canContinueUp || status.canContinueDown);

            this.uiManager.toggleLoadMoreButton(canContinue);
          }

          // Check if we have images to show
          const hasImages = this.sequenceManager && this.sequenceManager.getImages().length > 0;
          if (!hasImages) {
            this.uiManager.showEmptyState();
          } else {
            this.uiManager.showImageContainer();

            // Update the total image count
            if (this.sequenceManager) {
              this.uiManager.updateImagesCount(this.sequenceManager.getImages().length);
            }
          }
        }
      }
    );

    // Load the sequence
    await this.sequenceManager.loadImageSequence();
  }

  /**
   * Initialize recorded mode
   * Sets up recorded manager and loads recorded images
   */
  private async initRecordedMode(): Promise<void> {
    // Create the recorded manager
    this.recordedManager = new RecordedManager({
      onImageAdded: (url) => {
        this.uiManager.createImageElement(url, false, async (imageUrl) => {
          if (this.recordedManager) {
            await this.recordedManager.removeImage(imageUrl);

            // Check if we have images left
            if (this.recordedManager.getImageUrls().length === 0) {
              this.uiManager.showEmptyState();
            }
          }
        });
      },
      onImagesLoaded: () => {
        this.uiManager.hideLoading();
        this.uiManager.showImageContainer();

        // Update the total image count for recorded images
        if (this.recordedManager) {
          this.uiManager.updateImagesCount(this.recordedManager.getImageUrls().length);
        }
      },
      onError: () => {
        this.uiManager.showEmptyState();
      }
    });

    // Load recorded images
    await this.recordedManager.loadRecordedImages();
  }

  /**
   * Stop crawling images in sequence mode
   */
  private stopCrawling(): void {
    if (this.sequenceManager) {
      this.sequenceManager.stopCrawling();
      this.uiManager.setStoppedState(true);
      this.uiManager.toggleLoadMoreButton(false);

      // Update the image count after stopping
      const imageCount = this.sequenceManager.getImages().length;
      this.uiManager.updateImagesCount(imageCount);

      // Show empty state if no images
      if (imageCount === 0) {
        this.uiManager.showEmptyState();
      }
    }
  }

  /**
   * Load more images in sequence mode
   */
  private async loadMoreImages(): Promise<void> {
    if (this.sequenceManager) {
      // Hide the load more button while loading
      this.uiManager.toggleLoadMoreButton(false);

      // Show loading indicator
      this.uiManager.showLoading('Loading more images...');

      // Load more images
      await this.sequenceManager.loadMoreImages();

      // Update the total image count
      this.uiManager.updateImagesCount(this.sequenceManager.getImages().length);
    }
  }

  /**
   * Toggle duplicate detection
   */
  private async toggleDuplicateDetection(): Promise<void> {
    const button = this.uiManager.getDuplicateDetectionButton();

    if (!this.duplicateDetector.isEnabled()) {
      // Start detection
      button.disabled = true;
      button.textContent = 'Detecting...';

      // Show loading indicator
      this.uiManager.showLoading('Analyzing images for duplicates...');

      // Get images to analyze
      const images = this.mode === 'sequence'
        ? this.sequenceManager?.getImages() || []
        : this.recordedManager?.getImageUrls() || [];

      // Process images
      const totalDuplicates = await this.duplicateDetector.detectDuplicates(
        images,
        (message) => this.uiManager.updateLoadingText(message)
      );

      // Hide loading
      this.uiManager.hideLoading();

      // Update button
      button.textContent = 'Hide Duplicates';
      button.disabled = false;
      this.duplicateDetector.setEnabled(true);

      // Show result
      if (totalDuplicates > 0) {
        // Access the duplicateGroups safely without directly accessing private property
        const groupCount = this.duplicateDetector.getDuplicateGroupCount();
        alert(`Found ${totalDuplicates} duplicate images in ${groupCount} groups.`);
      } else {
        alert('No duplicate images found.');
      }
    } else {
      // Hide duplicates
      this.duplicateDetector.hideDuplicateMarkers();
      button.textContent = 'Detect Duplicates';
      this.duplicateDetector.setEnabled(false);
    }
  }

  /**
   * Create a share link for images with metadata from the form
   */
  private async createShareLink(): Promise<void> {
    // Get images based on mode
    const images = this.mode === 'sequence'
      ? this.sequenceManager?.getImages() || []
      : this.recordedManager?.getImageUrls() || [];

    if (images.length === 0) return;

    // Get form values
    const shareTitle = (document.getElementById('share-title') as HTMLInputElement).value || 'My Image Collection';
    const shareDescription = (document.getElementById('share-description') as HTMLTextAreaElement).value || '';
    const shareTagsString = (document.getElementById('share-tags') as HTMLInputElement).value || '';
    const isPrivate = (document.getElementById('share-private') as HTMLInputElement).checked;

    // Convert comma-separated tags string to array
    const shareTags = shareTagsString.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Update UI state for link creation
    const shareDialog = document.getElementById('share-dialog') as HTMLElement;
    const shareForm = shareDialog.querySelector('.share-form') as HTMLElement;
    const shareOutput = shareDialog.querySelector('.share-otput') as HTMLElement;
    const shareFormControls = shareDialog.querySelector('.share-form-controls') as HTMLElement;
    const shareOutputControls = shareDialog.querySelector('.share-otput-controls') as HTMLElement;

    // Update button state
    const confirmButton = document.getElementById('confirm-share-button') as HTMLButtonElement;
    confirmButton.textContent = 'Creating Link...';
    confirmButton.disabled = true;

    try {
      // Use the appropriate manager to create the link
      let shareUrl: string | null = null;

      if (this.mode === 'recorded' && this.recordedManager) {
        shareUrl = await this.recordedManager.createShareLink(shareTitle, shareDescription, shareTags, isPrivate);
      } else if (this.mode === 'sequence') {
        // Create link directly for sequence mode
        const uniqueUrls = [...new Set(images)];
        shareUrl = await sendMessage({
          action: MessageActions.CREATE_LINK,
          urls: uniqueUrls,
          title: shareTitle,
          description: shareDescription,
          tags: shareTags,
          isPrivate: isPrivate
        });
      }

      if (shareUrl) {
        // Show success state in dialog
        shareForm.classList.add('hidden');
        shareOutput.classList.remove('hidden');
        shareFormControls.classList.add('hidden');
        shareOutputControls.classList.remove('hidden');

        // Update share link in dialog
        const dialogShareLink = shareOutput.querySelector('#share-link') as HTMLInputElement;
        dialogShareLink.value = shareUrl;

        // Set up copy button in dialog
        const copyLinkButton = document.getElementById('copy-link-button') as HTMLButtonElement;
        copyLinkButton.addEventListener('click', () => {
          dialogShareLink.select();
          document.execCommand('copy');
          copyLinkButton.textContent = 'Copied!';
          setTimeout(() => {
            copyLinkButton.textContent = 'Copy';
          }, 2000);
        });

        // Set up visit button
        const visitShareButton = document.getElementById('vist-share-button') as HTMLButtonElement;
        visitShareButton.addEventListener('click', () => {
          browser.tabs.create({ url: shareUrl as string });
        });

        // Set up close button
        const closeShareButton = document.getElementById('close-share-button') as HTMLButtonElement;
        closeShareButton.addEventListener('click', () => {
          // Reset dialog and hide it
          shareDialog.classList.add('hidden');
          shareForm.classList.remove('hidden');
          shareOutput.classList.add('hidden');
          shareFormControls.classList.remove('hidden');
          shareOutputControls.classList.add('hidden');

          // Reset form
          (document.getElementById('share-title') as HTMLInputElement).value = '';
          (document.getElementById('share-description') as HTMLTextAreaElement).value = '';
          (document.getElementById('share-tags') as HTMLInputElement).value = '';

          // Also update the main share link display outside the dialog
          this.uiManager.updateShareLink(shareUrl as string);
        });
      } else {
        console.error("Failed to create share link: No URL returned");
        alert('Failed to create share link. Please try again later.');

        // Reset dialog state
        confirmButton.textContent = 'Create Link';
        confirmButton.disabled = false;
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link. Please try again later.');

      // Reset dialog state
      confirmButton.textContent = 'Create Link';
      confirmButton.disabled = false;
    }
  }
}

// Initialize gallery when document is ready
document.addEventListener('DOMContentLoaded', () => {
  new Gallery();
});
