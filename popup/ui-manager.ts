// Show Me More - Popup UI Manager

/**
 * Manages popup UI elements and interactions
 */
export class PopupUIManager {
  // UI Elements
  private recordingToggle: HTMLInputElement;
  private recordingStatus: HTMLSpanElement;
  private countBadge: HTMLSpanElement;
  private prevButton: HTMLButtonElement;
  private nextButton: HTMLButtonElement;
  private showAllButton: HTMLButtonElement;
  private showAllBeforeButton: HTMLButtonElement;
  private showAllAfterButton: HTMLButtonElement;
  private viewRecordedButton: HTMLButtonElement;
  private clearRecordedButton: HTMLButtonElement;
  private aboutButton: HTMLButtonElement;

  /**
   * Initialize the UI manager
   */
  constructor() {
    // Get UI elements
    this.recordingToggle = document.getElementById('recording-toggle') as HTMLInputElement;
    this.recordingStatus = document.getElementById('recording-status') as HTMLSpanElement;
    this.countBadge = document.getElementById('count-badge') as HTMLSpanElement;
    this.prevButton = document.getElementById('prev-button') as HTMLButtonElement;
    this.nextButton = document.getElementById('next-button') as HTMLButtonElement;
    this.showAllButton = document.getElementById('show-all-button') as HTMLButtonElement;
    this.showAllBeforeButton = document.getElementById('show-all-before-button') as HTMLButtonElement;
    this.showAllAfterButton = document.getElementById('show-all-after-button') as HTMLButtonElement;
    this.viewRecordedButton = document.getElementById('view-recorded-button') as HTMLButtonElement;
    this.clearRecordedButton = document.getElementById('clear-recorded-button') as HTMLButtonElement;
    this.aboutButton = document.getElementById('about-button') as HTMLButtonElement;
  }

  /**
   * Set up event handlers
   * @param handlers Event handler functions
   */
  setupEventHandlers(handlers: {
    onRecordingToggle: () => Promise<void>;
    onNavigatePrev: () => Promise<void>;
    onNavigateNext: () => Promise<void>;
    onShowAll: () => Promise<void>;
    onShowAllBefore: () => Promise<void>;
    onShowAllAfter: () => Promise<void>;
    onViewRecorded: () => Promise<void>;
    onClearRecorded: () => Promise<void>;
    onAbout: () => Promise<void>;
  }): void {
    // Set up event listeners
    this.recordingToggle.addEventListener('change', handlers.onRecordingToggle);
    this.prevButton.addEventListener('click', handlers.onNavigatePrev);
    this.nextButton.addEventListener('click', handlers.onNavigateNext);
    this.showAllButton.addEventListener('click', handlers.onShowAll);
    this.showAllBeforeButton.addEventListener('click', handlers.onShowAllBefore);
    this.showAllAfterButton.addEventListener('click', handlers.onShowAllAfter);
    this.viewRecordedButton.addEventListener('click', handlers.onViewRecorded);
    this.clearRecordedButton.addEventListener('click', handlers.onClearRecorded);
    this.aboutButton.addEventListener('click', handlers.onAbout);
  }

  /**
   * Update recording state UI
   * @param isRecording Whether recording is active
   */
  updateRecordingState(isRecording: boolean): void {
    this.recordingToggle.checked = isRecording;
    this.recordingStatus.textContent = isRecording ? 'On' : 'Off';
  }

  /**
   * Update recorded images count
   * @param count Number of recorded images
   */
  updateRecordedCount(count: number): void {
    this.countBadge.textContent = count.toString();

    // Disable view/clear buttons if no images
    this.viewRecordedButton.disabled = count === 0;
    this.clearRecordedButton.disabled = count === 0;
  }

  /**
   * Update navigation capability UI
   * @param canNavigate Whether navigation is possible
   */
  updateNavigationState(canNavigate: boolean): void {
    this.prevButton.disabled = !canNavigate;
    this.nextButton.disabled = !canNavigate;
    this.showAllButton.disabled = !canNavigate;
    this.showAllBeforeButton.disabled = !canNavigate;
    this.showAllAfterButton.disabled = !canNavigate;

    // Add visual indication if buttons are disabled
    if (!canNavigate) {
      const disabledMessage = " (Unavailable for this page)";
      this.prevButton.title += disabledMessage;
      this.nextButton.title += disabledMessage;
      this.showAllButton.title += disabledMessage;
      this.showAllBeforeButton.title += disabledMessage;
      this.showAllAfterButton.title += disabledMessage;

      this.prevButton.classList.add('disabled');
      this.nextButton.classList.add('disabled');
      this.showAllButton.classList.add('disabled');
      this.showAllBeforeButton.classList.add('disabled');
      this.showAllAfterButton.classList.add('disabled');
    }
  }
}
