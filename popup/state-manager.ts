// Show Me More - Popup State Manager
import { RecordedImage, ParsedURI } from '../shared/types';
import { MessageActions, sendMessage } from '../shared/messaging';

/**
 * Manages popup state and communication with background script
 */
export class PopupStateManager {
  private isRecording: boolean = false;
  private recordedImages: RecordedImage[] = [];
  private canNavigate: boolean = false;
  private currentTabId: number | undefined;
  private currentUrl: string | undefined;
  private parsedURI: ParsedURI | null = null;

  // State change callbacks
  private onRecordingStateChange: (isRecording: boolean) => void;
  private onRecordedImagesChange: (count: number) => void;
  private onNavigationStateChange: (canNavigate: boolean) => void;

  /**
   * Initialize the state manager
   * @param callbacks Callbacks for state changes
   */
  constructor(callbacks: {
    onRecordingStateChange: (isRecording: boolean) => void;
    onRecordedImagesChange: (count: number) => void;
    onNavigationStateChange: (canNavigate: boolean) => void;
  }) {
    this.onRecordingStateChange = callbacks.onRecordingStateChange;
    this.onRecordedImagesChange = callbacks.onRecordedImagesChange;
    this.onNavigationStateChange = callbacks.onNavigationStateChange;
  }

  /**
   * Load initial state from background script
   */
  async initialize(): Promise<void> {
    // Mark that user has interacted with extension (opening popup counts as interaction)
    await sendMessage({ action: MessageActions.MARK_USER_INTERACTED });

    // Load recording state
    this.isRecording = await sendMessage({
      action: MessageActions.GET_IS_RECORDING
    });
    this.onRecordingStateChange(this.isRecording);

    // Load recorded images
    this.recordedImages = await sendMessage({
      action: MessageActions.GET_RECORDED_IMAGES
    });
    this.onRecordedImagesChange(this.recordedImages.length);

    // Get current tab information
    await this.loadCurrentTabInfo();
  }

  /**
   * Load information about the current tab
   */
  private async loadCurrentTabInfo(): Promise<void> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url) {
        this.currentTabId = tabs[0].id;
        this.currentUrl = tabs[0].url;

        // Check if we can navigate this URL
        this.parsedURI = await sendMessage({
          action: MessageActions.PARSE_URI,
          uri: this.currentUrl
        });

        this.canNavigate = Boolean(this.parsedURI && this.parsedURI.num !== false);
        this.onNavigationStateChange(this.canNavigate);
      }
    } catch (error) {
      console.error("Error checking navigation availability:", error);
      this.canNavigate = false;
      this.onNavigationStateChange(false);
    }
  }

  /**
   * Toggle recording state
   */
  async toggleRecording(): Promise<void> {
    this.isRecording = await sendMessage({
      action: MessageActions.TOGGLE_RECORDING
    });
    this.onRecordingStateChange(this.isRecording);
  }

  /**
   * Navigate to previous image
   */
  async navigatePrevious(): Promise<void> {
    if (!this.currentTabId || !this.canNavigate) return;

    await sendMessage({
      action: MessageActions.NAVIGATE_PREV,
      tabId: this.currentTabId
    });
    window.close();
  }

  /**
   * Navigate to next image
   */
  async navigateNext(): Promise<void> {
    if (!this.currentTabId || !this.canNavigate) return;

    await sendMessage({
      action: MessageActions.NAVIGATE_NEXT,
      tabId: this.currentTabId
    });
    window.close();
  }

  /**
   * Show all images in sequence
   * @param direction Direction to show images (both, prev, next)
   */
  async showAll(direction: 'both' | 'prev' | 'next' = 'both'): Promise<void> {
    if (!this.currentTabId || !this.canNavigate) return;

    await sendMessage({
      action: MessageActions.SHOW_ALL,
      tabId: this.currentTabId,
      direction
    });
    window.close();
  }

  /**
   * View all recorded images
   */
  async viewRecordedImages(): Promise<void> {
    await browser.tabs.create({
      url: '/gallery/gallery.html?mode=recorded'
    });
    window.close();
  }

  /**
   * Clear all recorded images
   */
  async clearRecordedImages(): Promise<void> {
    if (!confirm('Are you sure you want to clear all recorded images?')) {
      return;
    }

    await sendMessage({ action: MessageActions.RESET_RECORDED });
    this.recordedImages = [];
    this.onRecordedImagesChange(0);
  }

  /**
   * Show about page
   */
  async showAboutPage(): Promise<void> {
    await browser.tabs.create({
      url: '/about/about.html'
    });
    window.close();
  }

  /**
   * Get recorded images count
   */
  getRecordedImagesCount(): number {
    return this.recordedImages.length;
  }

  /**
   * Get navigation capability
   */
  getCanNavigate(): boolean {
    return this.canNavigate;
  }

  /**
   * Get recording state
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }
}
