// Show Me More - Background Script
import { RecordedImage, ParsedURI, CrawlDirection, ChangeDirection } from '../shared/types';
import { UrlParser } from '../shared/url-parser';
import { ImageUtils } from '../shared/image-utils';
import { MessageActions } from '../shared/messaging';

class ShowMeMore {
  private recordedImages: RecordedImage[] = [];
  private isRecording: boolean = false;
  private readonly createURI: string = 'http://localhost:3000/api/create';
  private readonly maxRecursion: number = 255;
  private hasUserInteracted: boolean = false;

  constructor() {
    this.init();
  }

  init(): void {
    // Load saved images
    browser.storage.local.get(['recordedImages', 'hasUserInteracted']).then(result => {
      if (result.recordedImages) {
        this.recordedImages = result.recordedImages;
      }

      if (result.hasUserInteracted) {
        this.hasUserInteracted = result.hasUserInteracted;
        this.updateBadge();
      }
    });

    // Load recording state
    browser.storage.local.get('isRecording').then(result => {
      if (result.isRecording) {
        this.isRecording = result.isRecording;
        this.updateRecordingState();
      }
    });

    // Set up context menu
    browser.contextMenus.create({
      id: 'smm-record-image',
      title: 'Save to Show Me More',
      contexts: ['image']
    });

    // Set up listeners
    browser.contextMenus.onClicked.addListener(this.handleContextMenuClick.bind(this));
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    browser.commands.onCommand.addListener(this.handleCommand.bind(this));
  }

  private handleMessage(message: any, sender: browser.runtime.MessageSender): Promise<any> {
    // Track user interaction for most actions
    if ([
      MessageActions.RECORD_IMAGE,
      MessageActions.TOGGLE_RECORDING,
      MessageActions.RESET_RECORDED,
      MessageActions.REMOVE_IMAGE,
      MessageActions.NAVIGATE_NEXT,
      MessageActions.NAVIGATE_PREV,
      MessageActions.SHOW_ALL
    ].includes(message.action)) {
      this.markUserInteracted();
    }

    console.log("Received message:", message);

    switch(message.action) {
      case MessageActions.RECORD_IMAGE:
        return Promise.resolve(this.addToRecorded(message.url));
      case MessageActions.GET_RECORDED_IMAGES:
        return Promise.resolve(this.recordedImages);
      case MessageActions.GET_IS_RECORDING:
        return Promise.resolve(this.isRecording);
      case MessageActions.TOGGLE_RECORDING:
        this.toggleRecording();
        return Promise.resolve(this.isRecording);
      case MessageActions.RESET_RECORDED:
        this.resetRecorded();
        return Promise.resolve(true);
      case MessageActions.REMOVE_IMAGE:
        this.removeFromRecordedItems(message.index);
        return Promise.resolve(true);
      case MessageActions.PARSE_URI:
        return Promise.resolve(UrlParser.parseURI(message.uri));
      case MessageActions.CHANGE_URI_NUMBER:
        return Promise.resolve(UrlParser.changeURINumber(message.oURI, message.direction, message.forceZero));
      case MessageActions.NAVIGATE_NEXT:
        // If a specific tabId is provided in the message, use that instead
        const nextTabId = message.tabId || sender.tab?.id;
        return this.navigateNext(nextTabId);
      case MessageActions.NAVIGATE_PREV:
        // If a specific tabId is provided in the message, use that instead
        const prevTabId = message.tabId || sender.tab?.id;
        return this.navigatePrev(prevTabId);
      case MessageActions.SHOW_ALL:
        // If a specific tabId is provided in the message, use that instead
        const showAllTabId = message.tabId || sender.tab?.id;
        // Check if a direction is specified
        const direction = message.direction || 'both';
        console.log("Show All message received with direction:", direction, "tab:", showAllTabId);
        return this.showAll(showAllTabId, direction);
      case MessageActions.GET_HAS_USER_INTERACTED:
        return Promise.resolve(this.hasUserInteracted);
      case MessageActions.MARK_USER_INTERACTED:
        this.markUserInteracted();
        return Promise.resolve(true);
      case MessageActions.CREATE_LINK:
        console.log(`Received createLink message with ${message.urls?.length} URLs`, message);
        return this.createLink(
          message.urls || [],
          message.title,
          message.description,
          message.tags,
          message.isPrivate
        );
      default:
        console.log("Unknown message action:", message.action);
        return Promise.resolve(null);
    }
  }

  private handleContextMenuClick(info: browser.contextMenus.OnClickData, tab?: browser.tabs.Tab): void {
    if (info.menuItemId === 'smm-record-image' && info.srcUrl) {
      this.markUserInteracted();
      this.addToRecorded(info.srcUrl);
    }
  }

  private handleCommand(command: string): void {
    this.markUserInteracted();

    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0].id) {
        const tabId = tabs[0].id;

        switch (command) {
          case 'prev-image':
            this.navigatePrev(tabId);
            break;
          case 'next-image':
            this.navigateNext(tabId);
            break;
          case 'show-all':
            this.showAll(tabId);
            break;
        }
      }
    });
  }

  private markUserInteracted(): void {
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
      browser.storage.local.set({ hasUserInteracted: true });
      this.updateBadge();
    }
  }

  private showNotification(message: string): void {
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/show-me-more-48.png'),
      title: 'Show Me More',
      message: message
    });
  }

  private updateBadge(): void {
    if (this.recordedImages.length) {
      browser.browserAction.setBadgeText({ text: this.recordedImages.length.toString() });
      browser.browserAction.setBadgeBackgroundColor({ color: '#4a90e2' });
    }
  }

  private updateRecordingState(): void {
    browser.browserAction.setIcon({
      path: this.isRecording ? {
        16: 'icons/show-me-more-recording-16.png',
        32: 'icons/show-me-more-recording-32.png',
        48: 'icons/show-me-more-recording-48.png',
        96: 'icons/show-me-more-recording-96.png'
      } : {
        16: 'icons/show-me-more-16.png',
        32: 'icons/show-me-more-32.png',
        48: 'icons/show-me-more-48.png',
        96: 'icons/show-me-more-96.png'
      }
    });

    browser.storage.local.set({ isRecording: this.isRecording });
  }

  addToRecorded(url: string): boolean {
    if (!url) return false;

    // Mark as interacted since this is a direct action
    this.markUserInteracted();

    // Check if already exists
    const exists = this.recordedImages.some(item => item.url === url);
    if (exists) {
      this.showNotification(`${url}\nAlready exists in recorded items`);
      return false;
    }

    // Add to recorded images
    this.recordedImages.push({
      url: url,
      timestamp: Date.now()
    });

    // Save to storage
    browser.storage.local.set({ recordedImages: this.recordedImages });

    // Update badge and notify
    this.updateBadge();
    this.showNotification(`Added to recorded images:\n${url}`);

    return true;
  }

  toggleRecording(): void {
    // Mark as interacted since this is a direct action
    this.markUserInteracted();

    this.isRecording = !this.isRecording;
    this.updateRecordingState();

    // Notify content scripts
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, {
            action: MessageActions.RECORDING_STATE_CHANGED,
            isRecording: this.isRecording
          }).catch(() => {
            // Ignore errors for tabs that don't have our content script
          });
        }
      });
    });
  }

  removeFromRecordedItems(index: number): void {
    if (index >= 0 && index < this.recordedImages.length) {
      this.recordedImages.splice(index, 1);
      browser.storage.local.set({ recordedImages: this.recordedImages });
      this.updateBadge();
    }
  }

  resetRecorded(): void {
    this.recordedImages = [];
    browser.storage.local.set({ recordedImages: this.recordedImages });
    this.updateBadge();
  }

  private async navigatePrev(tabId?: number): Promise<boolean> {
    if (!tabId) return Promise.resolve(false);

    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab.url) return Promise.resolve(false);

      const oURI = UrlParser.parseURI(tab.url);
      const oURICopy = { ...oURI };

      let nextURI = UrlParser.changeURINumber(oURI, 'down');
      nextURI = UrlParser.checkTransition10To9(oURICopy, nextURI);

      if (nextURI) {
        console.log("Navigating to previous:", nextURI);
        await browser.tabs.update(tabId, { url: nextURI });
        return Promise.resolve(true);
      }

      return Promise.resolve(false);
    } catch (error) {
      console.error("Error in navigatePrev:", error);
      return Promise.resolve(false);
    }
  }

  private async navigateNext(tabId?: number): Promise<boolean> {
    if (!tabId) return Promise.resolve(false);

    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab.url) return Promise.resolve(false);

      const oURI = UrlParser.parseURI(tab.url);
      let nextURI = UrlParser.changeURINumber(oURI, 'up');

      if (nextURI) {
        console.log("Navigating to next:", nextURI);
        await browser.tabs.update(tabId, { url: nextURI });
        return Promise.resolve(true);
      }

      return Promise.resolve(false);
    } catch (error) {
      console.error("Error in navigateNext:", error);
      return Promise.resolve(false);
    }
  }

  private async showAll(tabId?: number, direction: CrawlDirection = 'both'): Promise<boolean> {
    if (!tabId) return Promise.resolve(false);

    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab.url) return Promise.resolve(false);

      console.log("ShowAll for URL:", tab.url, "Direction:", direction);

      // Check if current URL has a number sequence we can iterate
      const parsedURI = UrlParser.parseURI(tab.url);
      if (!parsedURI || !parsedURI.num) {
        this.showNotification('This URL does not contain a number sequence to show all images.');
        return Promise.resolve(false);
      }

      // Open the gallery page with the current URL as a parameter
      const galleryUrl = browser.runtime.getURL('gallery/gallery.html') +
                       '?source=' + encodeURIComponent(tab.url) +
                       '&direction=' + direction;

      console.log("Opening gallery with URL:", galleryUrl);
      await browser.tabs.create({ url: galleryUrl });
      return Promise.resolve(true);
    } catch (error) {
      console.error("Error in showAll:", error);
      return Promise.resolve(false);
    }
  }

  async createLink(
    urls: string[],
    title?: string,
    description?: string,
    tags?: string[],
    isPrivate?: boolean
  ): Promise<string | null> {
    if (urls.length === 0) return Promise.resolve(null);

    try {
      console.log(`Creating link for ${urls.length} URLs. First URL:`, urls[0]);

      // Create FormData as expected by the server
      const formData = new FormData();

      // Add metadata
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      if (tags && tags.length > 0) {
        tags.forEach((tag, index) => {
          formData.append(`tags[${index}]`, tag);
        });
      }
      if (isPrivate !== undefined) formData.append('isPrivate', isPrivate.toString());

      // Add image URLs
      urls.forEach((url, index) => {
        formData.append(`images[${index}]`, url);
      });

      console.log("Sending request to:", this.createURI);

      const response = await fetch(this.createURI, {
        method: 'POST',
        body: formData
      });

      console.log("createLink response:", response);

      if (!response.ok) {
        console.log("Failed to create link:", response);
        console.error('Error creating link: Server returned', response.status);
        return null;
      }

      // Try to parse as JSON first
      try {
        const jsonData = await response.json();
        console.log("Received JSON response:", jsonData);

        if (jsonData && jsonData.url) {
          return jsonData.url;
        } else if (jsonData && jsonData.result) {
          return jsonData.result;
        }
      } catch (jsonError) {
        console.log("Response is not JSON, trying text/XML parsing");

        // If JSON parsing fails, try the original XML format
        const textData = await response.text();
        console.log("Received text response:", textData);

        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(textData, "text/xml");

          const status = xmlDoc.getElementsByTagName('Status')[0]?.textContent;
          const result = xmlDoc.getElementsByTagName('Result')[0]?.textContent;

          if (status === 'OK' && result) {
            return decodeURIComponent(result);
          }
        } catch (xmlError) {
          console.error("Failed to parse XML response:", xmlError);
        }
      }

      return null;
    } catch (e) {
      console.error('Error creating link:', e);
      return null;
    }
  }
}

// Enable console logging
console.log("Initializing Show Me More background script");

// Initialize the background script
const showMeMore = new ShowMeMore();

// Make available for debugging
(window as any).showMeMore = showMeMore;
