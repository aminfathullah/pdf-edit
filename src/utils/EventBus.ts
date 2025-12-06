/**
 * EventBus - Centralized Event Management
 * 
 * Provides a publish-subscribe pattern for communication between modules.
 */

type EventListener<T = unknown> = (data: T) => void | Promise<void>;

export class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private onceListeners: Map<string, EventListener[]> = new Map();

  /**
   * Subscribe to an event
   * @param event Event name
   * @param listener Callback function
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener as EventListener);

    // Return unsubscribe function
    return () => this.unsubscribe(event, listener);
  }

  /**
   * Subscribe to an event for a single execution
   * @param event Event name
   * @param listener Callback function
   */
  once<T = unknown>(event: string, listener: EventListener<T>): void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }
    this.onceListeners.get(event)!.push(listener as EventListener);
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param listener Callback function to remove
   */
  unsubscribe<T = unknown>(event: string, listener: EventListener<T>): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener as EventListener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Publish an event synchronously
   * @param event Event name
   * @param data Event data
   */
  publish<T = unknown>(event: string, data?: T): void {
    // Regular listeners
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in listener for event "${event}":`, error);
      }
    });

    // Once listeners
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners && onceListeners.length > 0) {
      onceListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in once listener for event "${event}":`, error);
        }
      });
      this.onceListeners.set(event, []);
    }
  }

  /**
   * Publish an event asynchronously
   * @param event Event name
   * @param data Event data
   */
  async publishAsync<T = unknown>(event: string, data?: T): Promise<void> {
    const listeners = this.listeners.get(event) || [];
    const onceListeners = this.onceListeners.get(event) || [];

    for (const listener of [...listeners, ...onceListeners]) {
      try {
        await Promise.resolve(listener(data));
      } catch (error) {
        console.error(`Error in async listener for event "${event}":`, error);
      }
    }

    if (onceListeners.length > 0) {
      this.onceListeners.set(event, []);
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event Event name
   */
  listenerCount(event: string): number {
    const regular = this.listeners.get(event)?.length || 0;
    const once = this.onceListeners.get(event)?.length || 0;
    return regular + once;
  }

  /**
   * Remove all listeners for an event
   * @param event Event name
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  // Aliases for common patterns
  on<T = unknown>(event: string, listener: EventListener<T>): () => void {
    return this.subscribe(event, listener);
  }

  off<T = unknown>(event: string, listener: EventListener<T>): void {
    this.unsubscribe(event, listener);
  }

  emit<T = unknown>(event: string, data?: T): void {
    this.publish(event, data);
  }

  clear(event: string): void {
    this.removeAllListeners(event);
  }

  clearAll(): void {
    this.removeAllListeners();
  }
}

// Global event bus instance
export const eventBus = new EventBus();
