// Show Me More - Message Types and Communication

import { ParsedURI, CrawlDirection, ChangeDirection } from './types';

/**
 * Message action types
 */
export const MessageActions = {
  // Recording actions
  RECORD_IMAGE: 'recordImage',
  GET_RECORDED_IMAGES: 'getRecordedImages',
  GET_IS_RECORDING: 'getIsRecording',
  TOGGLE_RECORDING: 'toggleRecording',
  RESET_RECORDED: 'resetRecorded',
  REMOVE_IMAGE: 'removeImage',
  RECORDING_STATE_CHANGED: 'recordingStateChanged',

  // URL parsing and navigation
  PARSE_URI: 'parseURI',
  CHANGE_URI_NUMBER: 'changeURINumber',
  NAVIGATE_NEXT: 'navigateNext',
  NAVIGATE_PREV: 'navigatePrev',
  SHOW_ALL: 'showAll',

  // User interaction
  GET_HAS_USER_INTERACTED: 'getHasUserInteracted',
  MARK_USER_INTERACTED: 'markUserInteracted',

  // Sharing
  CREATE_LINK: 'createLink'
} as const;

// Define message types with proper TypeScript typing

/**
 * Base message interface
 */
export interface BaseMessage {
  action: string;
}

/**
 * Record image message
 */
export interface RecordImageMessage extends BaseMessage {
  action: typeof MessageActions.RECORD_IMAGE;
  url: string;
}

/**
 * Parse URI message
 */
export interface ParseURIMessage extends BaseMessage {
  action: typeof MessageActions.PARSE_URI;
  uri: string;
}

/**
 * Change URI number message
 */
export interface ChangeURINumberMessage extends BaseMessage {
  action: typeof MessageActions.CHANGE_URI_NUMBER;
  oURI: ParsedURI;
  direction: ChangeDirection;
  forceZero?: boolean;
}

/**
 * Navigation message
 */
export interface NavigationMessage extends BaseMessage {
  action: typeof MessageActions.NAVIGATE_NEXT | typeof MessageActions.NAVIGATE_PREV;
  tabId?: number;
}

/**
 * Show all message
 */
export interface ShowAllMessage extends BaseMessage {
  action: typeof MessageActions.SHOW_ALL;
  tabId?: number;
  direction?: CrawlDirection;
}

/**
 * Remove image message
 */
export interface RemoveImageMessage extends BaseMessage {
  action: typeof MessageActions.REMOVE_IMAGE;
  index: number;
}

/**
 * Create link message
 */
export interface CreateLinkMessage extends BaseMessage {
  action: typeof MessageActions.CREATE_LINK;
  urls: string[];
}

/**
 * Recording state changed message
 */
export interface RecordingStateChangedMessage extends BaseMessage {
  action: typeof MessageActions.RECORDING_STATE_CHANGED;
  isRecording: boolean;
}

/**
 * Union type of all possible messages
 */
export type ShowMeMoreMessage =
  | RecordImageMessage
  | ParseURIMessage
  | ChangeURINumberMessage
  | NavigationMessage
  | ShowAllMessage
  | RemoveImageMessage
  | CreateLinkMessage
  | RecordingStateChangedMessage
  | BaseMessage;

/**
 * Send a message to the background script
 * @param message Message to send
 * @returns Promise with the response
 */
export async function sendMessage<T>(message: ShowMeMoreMessage): Promise<T> {
  return browser.runtime.sendMessage(message);
}

/**
 * Send a message to a specific tab
 * @param tabId ID of the tab to send the message to
 * @param message Message to send
 * @returns Promise with the response
 */
export async function sendTabMessage<T>(tabId: number, message: ShowMeMoreMessage): Promise<T> {
  return browser.tabs.sendMessage(tabId, message);
}
