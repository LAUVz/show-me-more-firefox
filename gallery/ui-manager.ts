// Show Me More - Gallery UI Manager
import { ImageUtils } from '../shared/image-utils';

/**
 * Manages the gallery UI components
 */
export class UIManager {
  // UI Elements
  private mainImageContainer: HTMLElement;
  private loadingElement: HTMLElement;
  private loadingText: HTMLElement;
  private emptyStateElement: HTMLElement;
  private createLinkButton: HTMLButtonElement;
  private detectDuplicatesButton: HTMLButtonElement;
  private loadMoreButton: HTMLButtonElement;
  private loadMoreContainer: HTMLElement;
  private imagesFoundCount: HTMLSpanElement;

  // Track the actual image count
  private imageCount: number = 0;

  /**
   * Initialize the UI Manager
   */
  constructor() {
    // Get UI elements
    this.mainImageContainer = document.getElementById('image-container') as HTMLElement;
    this.loadingElement = document.getElementById('loading') as HTMLElement;
    this.loadingText = document.getElementById('loading-text') as HTMLElement;
    this.emptyStateElement = document.getElementById('empty-state') as HTMLElement;
    this.createLinkButton = document.getElementById('button-create-link') as HTMLButtonElement;
    this.detectDuplicatesButton = document.getElementById('button-detect-duplicates') as HTMLButtonElement;
    this.loadMoreButton = document.getElementById('load-more-button') as HTMLButtonElement;
    this.loadMoreContainer = document.getElementById('load-more-container') as HTMLElement;
    this.imagesFoundCount = document.getElementById('images-found-count') as HTMLSpanElement;

    // Initialize the image count to zero
    this.imageCount = 0;
    this.updateImagesCount();

    // Set up UI event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for UI elements
   */
  private setupEventListeners(): void {
    // Set up view mode toggle (full-width vs grid)
    const fullSizeButton = document.getElementById('button-full-size') as HTMLButtonElement;
    const gridButton = document.getElementById('button-grid') as HTMLButtonElement;

    if (fullSizeButton) {
      fullSizeButton.addEventListener('click', this.toggleFullWidthView.bind(this, true));
    }

    if (gridButton) {
      gridButton.addEventListener('click', this.toggleFullWidthView.bind(this, false));
    }
  }

  /**
   * Toggle between full width and grid view
   * @param isFullWidth Whether to switch to full width view (true) or grid view (false)
   */
  private toggleFullWidthView(isFullWidth: boolean): void {
    const imageContainer = document.getElementById('image-container') as HTMLElement;
    const fullSizeButton = document.getElementById('button-full-size') as HTMLButtonElement;
    const gridButton = document.getElementById('button-grid') as HTMLButtonElement;

    if (isFullWidth) {
      // Switch to full width view
      imageContainer.classList.add('full-width-images');
      fullSizeButton.classList.add('hidden');
      gridButton.classList.remove('hidden');
    } else {
      // Switch to grid view
      imageContainer.classList.remove('full-width-images');
      fullSizeButton.classList.remove('hidden');
      gridButton.classList.add('hidden');
    }
  }

  /**
   * Update the images count display
   * @param count Optional count to set (if not provided, uses internal count)
   */
  updateImagesCount(count?: number): void {
    if (count !== undefined) {
      this.imageCount = count;
    }
    if (this.imagesFoundCount) {
      this.imagesFoundCount.textContent = this.imageCount.toString();
    }
  }

  /**
   * Show the loading indicator with a message
   * @param message Message to display
   */
  showLoading(message: string = 'Loading images...'): void {
    this.updateLoadingText(message);
    this.loadingElement.classList.remove('hidden');
    // Keep the image container visible during loading, just hide empty state
    this.emptyStateElement.classList.add('hidden');
    // Make sure image container is visible
    this.mainImageContainer.classList.remove('hidden');
  }

  /**
   * Hide the loading indicator
   */
  hideLoading(): void {
    this.loadingElement.classList.add('hidden');
  }

  /**
   * Show the empty state message
   */
  showEmptyState(): void {
    this.loadingElement.classList.add('hidden');
    this.mainImageContainer.classList.add('hidden');
    this.emptyStateElement.classList.remove('hidden');
    this.loadMoreContainer.classList.add('hidden');
    this.createLinkButton.disabled = true;
  }

  /**
   * Show the image container and hide empty state
   */
  showImageContainer(): void {
    this.emptyStateElement.classList.add('hidden');
    this.mainImageContainer.classList.remove('hidden');
  }

  /**
   * Clear the image container
   */
  clearImageContainer(): void {
    this.mainImageContainer.innerHTML = '';
    this.imageCount = 0;
    this.updateImagesCount();
  }

  /**
   * Update the loading text
   * @param text Text to display
   */
  updateLoadingText(text: string): void {
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
  }

  /**
   * Toggle the load more button visibility
   * @param show Whether to show the button
   */
  toggleLoadMoreButton(show: boolean): void {
    if (show) {
      this.loadMoreContainer.classList.remove('hidden');
    } else {
      this.loadMoreContainer.classList.add('hidden');
    }
  }

  /**
   * Create an image element for display
   * @param imageUrl URL of the image
   * @param prepend Whether to prepend to container
   * @param removeCallback Callback for when image is removed
   */
  createImageElement(
    imageUrl: string,
    prepend: boolean = false,
    removeCallback?: (url: string) => void
  ): HTMLElement {
    // Increment the image count
    this.imageCount++;
    this.updateImagesCount();

    // Create the image element
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.dataset.url = imageUrl;

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Image';
    img.className = 'gallery-image';

    // Handle loading error
    img.onerror = () => {
      img.src = '../icons/broken-image.svg';
      img.alt = 'Failed to load image';
    };

    const imageInfo = document.createElement('div');
    imageInfo.className = 'image-info';

    const imageActions = document.createElement('div');
    imageActions.className = 'image-actions';

    const openButton = document.createElement('button');
    openButton.textContent = 'Open in New Tab';
    openButton.className = 'image-action';
    openButton.addEventListener('click', () => {
      browser.tabs.create({ url: imageUrl });
    });

    imageActions.appendChild(openButton);

    // Add remove button if callback provided
    if (removeCallback) {
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.className = 'image-action remove';
      removeButton.addEventListener('click', () => {
        removeCallback(imageUrl);
        imageItem.remove();

        // Decrement the image count
        this.imageCount = Math.max(0, this.imageCount - 1);
        this.updateImagesCount();
      });

      imageActions.appendChild(removeButton);
    }

    imageWrapper.appendChild(img);
    imageItem.appendChild(imageWrapper);
    imageInfo.appendChild(imageActions);
    imageItem.appendChild(imageInfo);

    // Add to the container (at beginning or end)
    if (prepend) {
      this.mainImageContainer.insertBefore(imageItem, this.mainImageContainer.firstChild);
    } else {
      this.mainImageContainer.appendChild(imageItem);
    }

    return imageItem;
  }

  /**
   * Set up the share functionality
   * @param callback Function to call when confirm share button is clicked
   */
  setupShareButton(callback: () => void): void {
    // Get share dialog elements
    const shareDialog = document.getElementById('share-dialog') as HTMLElement;
    const closeDialogButton = document.getElementById('close-dialog-button') as HTMLButtonElement;
    const cancelShareButton = document.getElementById('cancel-share-button') as HTMLButtonElement;
    const confirmShareButton = document.getElementById('confirm-share-button') as HTMLButtonElement;

    // Share button opens the dialog
    this.createLinkButton.addEventListener('click', () => {
      shareDialog.classList.remove('hidden');
    });

    // Close and cancel buttons hide the dialog
    closeDialogButton.addEventListener('click', () => {
      shareDialog.classList.add('hidden');
    });

    cancelShareButton.addEventListener('click', () => {
      shareDialog.classList.add('hidden');
    });

    // Confirm button triggers the create link action
    confirmShareButton.addEventListener('click', callback);
  }

  /**
   * Update the share link in the dialog
   * @param url URL to share
   */
  updateShareLink(url: string): void {
    // Update the share link in dialog
    const dialogShareLink = document.querySelector('.share-otput #share-link') as HTMLInputElement;
    if (dialogShareLink) {
      dialogShareLink.value = url;
    }
  }

  /**
   * Set the state of the create link button
   * @param isDisabled Whether the button should be disabled
   * @param text Text to display on the button
   */
  setCreateLinkButtonState(isDisabled: boolean, text: string): void {
    this.createLinkButton.disabled = isDisabled;
    this.createLinkButton.textContent = text;
  }

  /**
   * Get the share dialog element
   */
  getShareDialog(): HTMLElement {
    return document.getElementById('share-dialog') as HTMLElement;
  }

  /**
   * Reset the share dialog to its initial state
   */
  resetShareDialog(): void {
    const shareDialog = this.getShareDialog();
    const shareForm = shareDialog.querySelector('.share-form') as HTMLElement;
    const shareOutput = shareDialog.querySelector('.share-otput') as HTMLElement;
    const shareFormControls = shareDialog.querySelector('.share-form-controls') as HTMLElement;
    const shareOutputControls = shareDialog.querySelector('.share-otput-controls') as HTMLElement;

    // Reset visibility
    shareForm.classList.remove('hidden');
    shareOutput.classList.add('hidden');
    shareFormControls.classList.remove('hidden');
    shareOutputControls.classList.add('hidden');

    // Reset form fields
    (document.getElementById('share-title') as HTMLInputElement).value = '';
    (document.getElementById('share-description') as HTMLTextAreaElement).value = '';
    (document.getElementById('share-tags') as HTMLInputElement).value = '';
    (document.getElementById('share-private') as HTMLInputElement).checked = false;

    // Reset button states
    const confirmButton = document.getElementById('confirm-share-button') as HTMLButtonElement;
    confirmButton.textContent = 'Create Link';
    confirmButton.disabled = false;
  }

  /**
   * Get the load more button
   */
  getLoadMoreButton(): HTMLButtonElement {
    return this.loadMoreButton;
  }

  /**
   * Get the duplicate detection button
   */
  getDuplicateDetectionButton(): HTMLButtonElement {
    return this.detectDuplicatesButton;
  }
}
