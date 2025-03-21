// Show Me More - Content Script
class ShowMeMoreContent {
  private isRecording: boolean = false;
  private recordButton: HTMLButtonElement | null = null;

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    // Check if recording is active
    this.isRecording = await browser.runtime.sendMessage({ action: 'getIsRecording' });

    // Set up message listener
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Set up keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Find large images and add hover buttons
    this.findLargeImages();

    // Set up mutation observer to detect newly added images
    const observer = new MutationObserver(mutations => {
      let shouldRefresh = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const nodes = Array.from(mutation.addedNodes);
      for (const node of nodes) {
        if (node instanceof HTMLElement) {
          if (node.tagName === 'IMG' || node.querySelectorAll('img').length > 0) {
            shouldRefresh = true;
            break;
          }
        }
      }
        }
        if (shouldRefresh) break;
      }

      if (shouldRefresh) {
        this.findLargeImages();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private handleMessage(message: any): void {
    if (message.action === 'recordingStateChanged') {
      this.isRecording = message.isRecording;
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Don't intercept keyboard shortcuts when in input fields
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Custom keyboard shortcuts (Alt+Left/Right for navigation)
    if (event.altKey && event.key === 'ArrowLeft') {
      browser.runtime.sendMessage({ action: 'markUserInteracted' });
      browser.runtime.sendMessage({ action: 'navigatePrev' });
      event.preventDefault();
    } else if (event.altKey && event.key === 'ArrowRight') {
      browser.runtime.sendMessage({ action: 'markUserInteracted' });
      browser.runtime.sendMessage({ action: 'navigateNext' });
      event.preventDefault();
    } else if (event.altKey && event.key === 'a') {
      browser.runtime.sendMessage({ action: 'markUserInteracted' });
      browser.runtime.sendMessage({ action: 'showAll' });
      event.preventDefault();
    }
  }

  private findLargeImages(): void {
    const images = document.querySelectorAll('img');

    images.forEach(img => {
      // Only process large images (similar to original addon)
      if (img.clientWidth > 150 || img.clientHeight > 150) {
        // Skip if already processed
        if (img.dataset.smmProcessed) return;

        img.dataset.smmProcessed = 'true';

        // Add event listeners
        img.addEventListener('mouseenter', this.handleImageMouseEnter.bind(this));
        img.addEventListener('mouseleave', this.handleImageMouseLeave.bind(this));
      }
    });
  }

  private handleImageMouseEnter(event: MouseEvent): void {
    if (!this.isRecording) return;

    const img = event.target as HTMLImageElement;
    if (!img || !img.src) return;

    // Create the record button
    this.removeRecordButton();

    this.recordButton = document.createElement('button');
    this.recordButton.className = 'smm-record-button';
    this.recordButton.title = 'Add to recorded items (Show Me More)';
    this.recordButton.style.position = 'absolute';
    this.recordButton.style.zIndex = '9999';
    this.recordButton.style.width = '46px';
    this.recordButton.style.height = '27px';
    this.recordButton.style.border = 'none';
    this.recordButton.style.background = 'transparent';
    this.recordButton.style.cursor = 'pointer';
    this.recordButton.style.padding = '0';

    // Position the button near the image
    const rect = img.getBoundingClientRect();
    this.recordButton.style.left = `${rect.left + window.scrollX + 5}px`;
    this.recordButton.style.top = `${rect.top + window.scrollY + 5}px`;

    // Add icon image
    const icon = document.createElement('img');

    // Check if dark mode is enabled
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      icon.src = browser.runtime.getURL('icons/add_recorded_icon_dark.svg');
    } else {
      icon.src = browser.runtime.getURL('icons/add_recorded_icon.svg');
    }

    icon.style.width = '42px';
    icon.style.height = '24px';
    icon.style.border = 'none';

    this.recordButton.appendChild(icon);

    // Add click event to record the image
    this.recordButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Mark user interaction
      browser.runtime.sendMessage({ action: 'markUserInteracted' });

      // Record the image
      browser.runtime.sendMessage({
        action: 'recordImage',
        url: img.src
      });
    });

    document.body.appendChild(this.recordButton);
  }

  private handleImageMouseLeave(event: MouseEvent): void {
    // Check if we're moving to the button itself and don't remove if so
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.classList.contains('smm-record-button')) {
      return;
    }

    this.removeRecordButton();
  }

  private removeRecordButton(): void {
    if (this.recordButton && this.recordButton.parentNode) {
      this.recordButton.parentNode.removeChild(this.recordButton);
      this.recordButton = null;
    }
  }
}

// Initialize the content script
const showMeMoreContent = new ShowMeMoreContent();
