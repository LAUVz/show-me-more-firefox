// Show Me More - Shared Type Definitions

/**
 * Represents a parsed URI with identified number sequence
 */
export interface ParsedURI {
  /** The part of the URL before the number sequence */
  first: string;
  /** The number sequence, or false if no number was found */
  num: string | false;
  /** The part of the URL after the number sequence */
  last: string;
}

/**
 * Represents an image recorded by the user
 */
export interface RecordedImage {
  /** URL of the recorded image */
  url: string;
  /** Timestamp when the image was recorded */
  timestamp: number;
}

/**
 * Direction options for crawling image sequences
 */
export type CrawlDirection = 'both' | 'prev' | 'next';

/**
 * Direction options for URL number manipulation
 */
export type ChangeDirection = 'up' | 'down';
