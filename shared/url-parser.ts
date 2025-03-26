// Show Me More - URL Parsing Module
import { ParsedURI, ChangeDirection } from './types';

/**
 * URL Parser class for handling image sequence URLs
 */
export class UrlParser {
  /**
   * Parse a URL to identify numbered sequences
   * @param uri The URL to parse
   * @returns ParsedURI object containing the parts of the URL
   */
  static parseURI(uri: string): ParsedURI {
    // Log the URI for debugging
    console.log("Parsing URI:", uri);

    // Handle URLs with query parameters or anchors
    const cleanUri = uri.split('?')[0].split('#')[0];

    const lastSlash = cleanUri.lastIndexOf('/');
    if (lastSlash === -1) {
      return { first: '', num: false, last: cleanUri };
    }

    const baseURI = cleanUri.substring(0, lastSlash);
    const fileName = cleanUri.substring(lastSlash + 1);

    console.log("Base URI:", baseURI, "Filename:", fileName);
    return this.parseFile(baseURI, fileName);
  }

  /**
   * Parse a filename to identify number sequences
   * @param baseURI The base URL before the filename
   * @param fileName The filename to parse
   * @returns ParsedURI object
   */
  private static parseFile(baseURI: string, fileName: string): ParsedURI {
    console.log("Parsing file:", fileName);

    const oURI: ParsedURI = {
      first: baseURI,
      num: false,
      last: fileName
    };

    // First check if filename is just a number
    if (/^\d+$/.test(fileName)) {
      oURI.first += '/';
      oURI.num = fileName;
      oURI.last = '';
      console.log("Found numeric filename:", oURI);
      return oURI;
    }

    // Check for file extension
    const reExt = /(.*)\.([^\.]+)$/i;
    if (reExt.test(fileName)) {
      const extension = fileName.replace(reExt, "$2");
      const file = fileName.replace(reExt, "$1");

      // Find numbers in the filename
      const reNumber = /\d+/g;
      const matches = file.match(reNumber);

      if (matches && matches.length > 0) {
        // Use the last number in the filename
        const lastNumber = matches[matches.length - 1];
        const posNumber = file.lastIndexOf(lastNumber);

        const startFile = file.substring(0, posNumber);
        const endFile = file.substring(posNumber + lastNumber.length) + '.' + extension;

        oURI.first += '/' + startFile;
        oURI.num = lastNumber;
        oURI.last = endFile;

        console.log("Found numbered file:", oURI);
        return oURI;
      }
    }

    // Couldn't find a number in the filename
    oURI.first += '/';
    oURI.last = fileName;
    console.log("No number found in filename:", oURI);

    return oURI;
  }

  /**
   * Pad a number with leading zeros to a specified length
   * @param num The number to pad (or false if none)
   * @param length The desired length
   * @returns Padded number string or empty string if num is false
   */
  private static numToLength(num: string | false, length: number): string {
    if (num === false) return '';

    let numStr = num.toString();
    while (numStr.length < length) {
      numStr = '0' + numStr;
    }
    return numStr;
  }

  /**
   * Change the number in a parsed URI
   * @param oURI The parsed URI object
   * @param direction Direction to change the number ('up' or 'down')
   * @param forceZero Whether to force leading zeros
   * @returns New URL string or false if invalid
   */
  static changeURINumber(oURI: ParsedURI, direction: ChangeDirection, forceZero?: boolean): string | false {
    if (!oURI || !oURI.num) return false;

    const numLength = oURI.num.length;
    const hasZero = /^0/.test(oURI.num);
    let num = parseInt(oURI.num, 10);

    if (direction === 'up') {
      num = num + 1;
      oURI.num = hasZero ? this.numToLength(num.toString(), numLength) : num.toString();
    } else if (direction === 'down') {
      num = num - 1;
      if (num < 0) return false;

      if (hasZero || forceZero) {
        oURI.num = this.numToLength(num.toString(), numLength);
      } else {
        oURI.num = num.toString();
      }
    } else {
      oURI.num = this.numToLength(num.toString(), numLength);
    }

    return oURI.first + oURI.num + oURI.last;
  }

  /**
   * Check for special case of transitioning from 10 to 9
   * @param oURICopy Original URI to check
   * @param nextURI Calculated next URI
   * @returns The URI to use
   */
  static checkTransition10To9(oURICopy: ParsedURI, nextURI: string | false): string | false {
    if (oURICopy.num && (parseInt(oURICopy.num, 10) % 10) === 0) {
      if (nextURI) {
        // In a real implementation, you would check if the URL exists
        return nextURI;
      }
    }
    return nextURI;
  }
}
