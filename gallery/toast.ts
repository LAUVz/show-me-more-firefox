// Show Me More - Toast Notification Component

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast notification options
 */
export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Manages toast notifications in the UI
 */
export class Toast {
  private static container: HTMLElement | null = null;
  private static readonly defaultDuration = 10000; // 3.5 seconds

  /**
   * Initialize the toast container
   */
  private static initialize(): void {
    // Check if container already exists
    if (document.getElementById('toast-container')) {
      this.container = document.getElementById('toast-container');
      return;
    }

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   * @param options Toast options or message string
   */
  public static show(options: ToastOptions | string): void {
    // Initialize container if not already
    this.initialize();

    // Parse options
    const opts: ToastOptions = typeof options === 'string'
      ? { message: options }
      : options;

    const {
      message,
      type = 'info',
      duration = this.defaultDuration
    } = opts;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.setProperty('--duration', `${duration / 1000}s`);

    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      this.remove(toast);
    });
    toast.appendChild(closeButton);

    // Add to container
    this.container?.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        this.remove(toast);
      }
    }, duration);
  }

  /**
   * Remove a toast element
   * @param toast Toast element to remove
   */
  private static remove(toast: HTMLElement): void {
    // Remove element after animation
    toast.addEventListener('animationend', (e) => {
      if (e.animationName === 'toast-out') {
        toast.remove();
      }
    });

    // Force animation to play
    toast.style.animation = 'toast-out 0.3s ease-in forwards';
  }

  /**
   * Show success toast
   * @param message Message to display
   * @param duration Optional duration in ms
   */
  public static success(message: string, duration?: number): void {
    this.show({
      message,
      type: 'success',
      duration
    });
  }

  /**
   * Show error toast
   * @param message Message to display
   * @param duration Optional duration in ms
   */
  public static error(message: string, duration?: number): void {
    this.show({
      message,
      type: 'error',
      duration
    });
  }

  /**
   * Show info toast
   * @param message Message to display
   * @param duration Optional duration in ms
   */
  public static info(message: string, duration?: number): void {
    this.show({
      message,
      type: 'info',
      duration
    });
  }

  /**
   * Show warning toast
   * @param message Message to display
   * @param duration Optional duration in ms
   */
  public static warning(message: string, duration?: number): void {
    this.show({
      message,
      type: 'warning',
      duration
    });
  }
}
