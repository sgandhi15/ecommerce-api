import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestResponseService {
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timeoutId: NodeJS.Timeout;
    }
  >();

  constructor(private eventEmitter: EventEmitter2) {}

  async sendRequest<TResponse>(
    requestEvent: any,
    responseEventName: string,
    timeoutMs: number = 10000,
  ): Promise<TResponse> {
    const requestId = randomUUID();

    return new Promise<TResponse>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store the pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      });

      // Set up one-time listener for the response
      const handleResponse = (response: TResponse & { requestId: string }) => {
        if (response.requestId === requestId) {
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timeoutId);
            this.pendingRequests.delete(requestId);

            // Check if response indicates an error
            if ('error' in response && response.error) {
              pending.reject(new Error(response.error as string));
            } else {
              pending.resolve(response);
            }
          }
          // Remove the listener after handling
          this.eventEmitter.off(responseEventName, handleResponse);
        }
      };

      this.eventEmitter.on(responseEventName, handleResponse);

      // Emit the request with the generated requestId
      const eventName = this.convertToEventName(requestEvent.constructor.name);
      this.eventEmitter.emit(eventName, {
        ...requestEvent,
        requestId,
      });
    });
  }

  handleResponse(responseEventName: string, response: any): void {
    this.eventEmitter.emit(responseEventName, response);
  }

  private convertToEventName(className: string): string {
    // Convert "UserLookupRequestEvent" to "user.lookup.request"
    return className
      .replace('Event', '')
      .replace(/([A-Z])/g, '.$1')
      .toLowerCase()
      .replace(/^\./, '');
  }
}
