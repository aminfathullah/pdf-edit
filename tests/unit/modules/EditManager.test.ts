/**
 * Tests for EditManager module
 */

import { EditManager } from '@modules/editing/EditManager';
import type { TextStyle, BoundingBox } from '@core/types';

describe('EditManager', () => {
  let editManager: EditManager;

  const mockStyle: TextStyle = {
    fontFamily: 'Arial',
    fontSize: 12,
    color: '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    lineHeight: 1.2,
    backgroundColor: 'transparent',
  };

  const mockBoundingBox: BoundingBox = {
    x: 100,
    y: 100,
    width: 200,
    height: 24,
  };

  beforeEach(() => {
    editManager = new EditManager();
  });

  describe('startEdit', () => {
    it('should create a new edit', () => {
      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );

      expect(edit).toBeDefined();
      expect(edit.id).toBeDefined();
      expect(edit.originalText).toBe('Original text');
      expect(edit.newText).toBe('Original text');
      expect(edit.status).toBe('pending');
      expect(edit.pageNumber).toBe(1);
    });

    it('should set edit as active', () => {
      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );

      const activeEdit = editManager.getActiveEdit();
      expect(activeEdit).toBeDefined();
      expect(activeEdit?.id).toBe(edit.id);
    });
  });

  describe('confirmEdit', () => {
    it('should update edit with new text', () => {
      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );

      const confirmedEdit = editManager.confirmEdit(edit.id, 'New text');

      expect(confirmedEdit.newText).toBe('New text');
      expect(confirmedEdit.status).toBe('applied');
    });

    it('should throw error for non-existent edit', () => {
      expect(() => {
        editManager.confirmEdit('non-existent-id', 'New text');
      }).toThrow();
    });
  });

  describe('cancelEdit', () => {
    it('should cancel an active edit', () => {
      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );

      editManager.cancelEdit(edit.id);

      const activeEdit = editManager.getActiveEdit();
      expect(activeEdit).toBeNull();
    });
  });

  describe('getPageEdits', () => {
    it('should return edits for specific page', () => {
      // Create and confirm edit on page 1
      const edit1 = editManager.startEdit(
        1,
        'block-1',
        'Text 1',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit1.id, 'New Text 1');

      // Create and confirm edit on page 2
      const edit2 = editManager.startEdit(
        2,
        'block-2',
        'Text 2',
        { x: 100, y: 200 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit2.id, 'New Text 2');

      const page1Edits = editManager.getPageEdits(1);
      const page2Edits = editManager.getPageEdits(2);

      expect(page1Edits).toHaveLength(1);
      expect(page2Edits).toHaveLength(1);
      expect(page1Edits[0].newText).toBe('New Text 1');
      expect(page2Edits[0].newText).toBe('New Text 2');
    });
  });

  describe('undo/redo', () => {
    it('should support undo operation', () => {
      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit.id, 'New text');

      expect(editManager.canUndo()).toBe(true);
      
      const undoneEdit = editManager.undo();
      expect(undoneEdit).toBeDefined();
    });

    it('should support redo operation', () => {
      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit.id, 'New text');
      editManager.undo();

      expect(editManager.canRedo()).toBe(true);
      
      const redoneEdit = editManager.redo();
      expect(redoneEdit).toBeDefined();
    });
  });

  describe('clearAll', () => {
    it('should clear all edits', () => {
      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit.id, 'New text');

      editManager.clearAll();

      expect(editManager.getTotalEditCount()).toBe(0);
      expect(editManager.getActiveEdit()).toBeNull();
    });
  });

  describe('getEditCount', () => {
    it('should return count of edits for a page', () => {
      expect(editManager.getEditCount(1)).toBe(0);

      const edit = editManager.startEdit(
        1,
        'block-1',
        'Original text',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit.id, 'New text');

      expect(editManager.getEditCount(1)).toBe(1);
    });
  });

  describe('getTotalEditCount', () => {
    it('should return total count of all edits', () => {
      expect(editManager.getTotalEditCount()).toBe(0);

      const edit1 = editManager.startEdit(
        1,
        'block-1',
        'Text 1',
        { x: 100, y: 100 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit1.id, 'New Text 1');

      const edit2 = editManager.startEdit(
        2,
        'block-2',
        'Text 2',
        { x: 100, y: 200 },
        mockBoundingBox,
        mockStyle
      );
      editManager.confirmEdit(edit2.id, 'New Text 2');

      expect(editManager.getTotalEditCount()).toBe(2);
    });
  });
});
