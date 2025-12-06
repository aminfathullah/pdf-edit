/**
 * Tests for EventBus utility
 */

import { EventBus, eventBus } from '@utils/EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on/emit', () => {
    it('should register and call event listeners', () => {
      const callback = jest.fn();
      bus.on('test', callback);
      
      bus.emit('test', { data: 'hello' });
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should support multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      bus.on('test', callback1);
      bus.on('test', callback2);
      bus.emit('test', 'data');
      
      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should not call listeners of different events', () => {
      const callback = jest.fn();
      bus.on('event1', callback);
      
      bus.emit('event2', 'data');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove event listener', () => {
      const callback = jest.fn();
      bus.on('test', callback);
      bus.off('test', callback);
      
      bus.emit('test', 'data');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should only remove specified listener', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      bus.on('test', callback1);
      bus.on('test', callback2);
      bus.off('test', callback1);
      bus.emit('test', 'data');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should call listener only once', () => {
      const callback = jest.fn();
      bus.once('test', callback);
      
      bus.emit('test', 'first');
      bus.emit('test', 'second');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });
  });

  describe('clear', () => {
    it('should remove all listeners for an event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      bus.on('test', callback1);
      bus.on('test', callback2);
      bus.clear('test');
      bus.emit('test', 'data');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should remove all listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      bus.on('event1', callback1);
      bus.on('event2', callback2);
      bus.clearAll();
      
      bus.emit('event1', 'data');
      bus.emit('event2', 'data');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('singleton instance', () => {
    it('should export a shared instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });
  });
});
