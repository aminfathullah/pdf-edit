/**
 * EditManager - Edit State and History Management
 * 
 * Tracks all edits, manages undo/redo, and maintains edit state.
 */

import type { Edit, EditOperation, TextStyle, BoundingBox } from '@core/types';
import { EDIT_CONFIG, EVENTS } from '@core/constants';
import { generateId } from '@utils/helpers';
import { eventBus } from '@utils/EventBus';
import { createLogger } from '@utils/logger';

const logger = createLogger('EditManager');

export class EditManager {
  private edits: Map<string, Edit> = new Map();
  private history: EditOperation[] = [];
  private historyIndex = -1;
  private activeEditId: string | null = null;

  /**
   * Start a new edit operation
   */
  startEdit(
    pageNum: number,
    blockId: string,
    originalText: string,
    position: { x: number; y: number },
    boundingBox: BoundingBox,
    originalStyle: TextStyle
  ): Edit {
    const editId = generateId('edit');

    const edit: Edit = {
      id: editId,
      pageNumber: pageNum,
      timestamp: new Date(),
      type: 'text-replace',
      originalText,
      newText: originalText, // Initially same as original
      position,
      originalStyle,
      newStyle: { ...originalStyle },
      boundingBox,
      erasureArea: { ...boundingBox },
      status: 'pending',
    };

    this.edits.set(editId, edit);
    this.activeEditId = editId;

    logger.info(`Edit started: ${editId} on page ${pageNum}`);

    eventBus.publish(EVENTS.EDIT_STARTED, {
      editId,
      blockId,
      originalText,
      position,
      style: originalStyle,
    });

    return edit;
  }

  /**
   * Confirm and apply an edit
   */
  confirmEdit(
    editId: string,
    newText: string,
    newStyle?: Partial<TextStyle>
  ): Edit {
    const edit = this.edits.get(editId);
    if (!edit) {
      throw new Error(`Edit not found: ${editId}`);
    }

    // Update edit
    edit.newText = newText;
    if (newStyle) {
      edit.newStyle = { ...edit.newStyle, ...newStyle };
    }
    edit.status = 'applied';
    edit.timestamp = new Date();

    // Add to history
    const operation: EditOperation = {
      id: edit.id,
      pageNum: edit.pageNumber,
      blockId: edit.id, // Using edit ID as block ID reference
      originalText: edit.originalText,
      newText: edit.newText,
      originalStyle: edit.originalStyle,
      newStyle: edit.newStyle,
      timestamp: edit.timestamp,
    };

    // Remove any redo items
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(operation);
    this.historyIndex++;

    // Limit history size
    if (this.history.length > EDIT_CONFIG.MAX_HISTORY_SIZE) {
      this.history.shift();
      this.historyIndex--;
    }

    this.activeEditId = null;

    logger.info(`Edit confirmed: ${editId}, new text: "${newText.substring(0, 50)}..."`);

    eventBus.publish(EVENTS.EDIT_CONFIRMED, {
      editId,
      originalText: edit.originalText,
      newText,
      style: edit.newStyle,
    });

    return edit;
  }

  /**
   * Cancel an active edit
   */
  cancelEdit(editId: string): void {
    const edit = this.edits.get(editId);
    if (!edit) {
      logger.warn(`Attempted to cancel non-existent edit: ${editId}`);
      return;
    }

    this.edits.delete(editId);
    if (this.activeEditId === editId) {
      this.activeEditId = null;
    }

    logger.info(`Edit cancelled: ${editId}`);

    eventBus.publish(EVENTS.EDIT_CANCELLED, { editId });
  }

  /**
   * Undo the last edit
   */
  undo(): EditOperation | null {
    if (!this.canUndo()) {
      logger.debug('Nothing to undo');
      return null;
    }

    const operation = this.history[this.historyIndex];
    const edit = this.edits.get(operation.id);

    if (edit) {
      edit.status = 'undone';
    }

    this.historyIndex--;

    logger.info(`Undo: ${operation.id}`);

    eventBus.publish(EVENTS.EDIT_UNDONE, { operation });

    return operation;
  }

  /**
   * Redo a previously undone edit
   */
  redo(): EditOperation | null {
    if (!this.canRedo()) {
      logger.debug('Nothing to redo');
      return null;
    }

    this.historyIndex++;
    const operation = this.history[this.historyIndex];
    const edit = this.edits.get(operation.id);

    if (edit) {
      edit.status = 'applied';
    }

    logger.info(`Redo: ${operation.id}`);

    eventBus.publish(EVENTS.EDIT_REDONE, { operation });

    return operation;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Get an edit by ID
   */
  getEdit(editId: string): Edit | undefined {
    return this.edits.get(editId);
  }

  /**
   * Get all edits for a specific page
   */
  getPageEdits(pageNum: number): Edit[] {
    return Array.from(this.edits.values()).filter(
      (edit) => edit.pageNumber === pageNum && edit.status === 'applied'
    );
  }

  /**
   * Get all applied edits
   */
  getAllAppliedEdits(): Edit[] {
    return Array.from(this.edits.values()).filter(
      (edit) => edit.status === 'applied'
    );
  }

  /**
   * Get the active edit (if any)
   */
  getActiveEdit(): Edit | null {
    if (!this.activeEditId) return null;
    return this.edits.get(this.activeEditId) || null;
  }

  /**
   * Get edit count for a page
   */
  getEditCount(pageNum: number): number {
    return this.getPageEdits(pageNum).length;
  }

  /**
   * Get total edit count
   */
  getTotalEditCount(): number {
    return this.getAllAppliedEdits().length;
  }

  /**
   * Get edit history
   */
  getHistory(): EditOperation[] {
    return [...this.history];
  }

  /**
   * Clear all edits
   */
  clearAll(): void {
    this.edits.clear();
    this.history = [];
    this.historyIndex = -1;
    this.activeEditId = null;
    logger.info('All edits cleared');
  }

  /**
   * Clear edits for a specific page
   */
  clearPage(pageNum: number): void {
    for (const [id, edit] of this.edits) {
      if (edit.pageNumber === pageNum) {
        this.edits.delete(id);
      }
    }
    logger.info(`Edits cleared for page ${pageNum}`);
  }

  /**
   * Export edits as JSON
   */
  exportEdits(): string {
    const edits = Array.from(this.edits.values());
    return JSON.stringify(edits, null, 2);
  }

  /**
   * Import edits from JSON
   */
  importEdits(json: string): void {
    try {
      const edits = JSON.parse(json) as Edit[];
      for (const edit of edits) {
        this.edits.set(edit.id, edit);
      }
      logger.info(`Imported ${edits.length} edits`);
    } catch (error) {
      logger.error('Failed to import edits', error);
      throw error;
    }
  }
}

// Export singleton instance
let editManagerInstance: EditManager | null = null;

export function getEditManager(): EditManager {
  if (!editManagerInstance) {
    editManagerInstance = new EditManager();
  }
  return editManagerInstance;
}
