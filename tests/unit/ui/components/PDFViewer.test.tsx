// React import not required in new JSX runtime
import { render, fireEvent } from '@testing-library/react';
import { PDFViewer } from '@ui/components/PDFViewer';
import type { TextBlock } from '@core/types';

describe('PDFViewer', () => {
  test('maps mouse coordinates to scaled canvas correctly and triggers text click', () => {
    // Create an empty containerRef and allow the component to assign it
    const ref = { current: null } as any;

    const block: TextBlock = {
      id: 'b1',
      text: 'Hello',
      boxes: [],
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000', backgroundColor: 'transparent', lineHeight: 1.2 },
      source: 'digital',
      confidence: 1,
      x: 10,
      y: 10,
      width: 50,
      height: 12,
      pageNumber: 1,
    };

    const onTextClick = jest.fn();
    const onCanvasClick = jest.fn();

    render(
      <div data-testid="root">
        <PDFViewer
          containerRef={ref}
          textBlocks={[block]}
          selectedBlock={null}
          onTextClick={onTextClick}
          onCanvasClick={onCanvasClick}
          isEditing={false}
          viewport={{ zoom: 2, panX: 0, panY: 0, currentPage: 1 }}
        />
      </div>
    );

    // Simulate mousemove near center of block
    // After render, append a wrapper element into the actual container element
    const actualContainer = ref.current as HTMLElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-canvas-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '200px';
    wrapper.style.height = '200px';
    actualContainer.appendChild(wrapper);
    const rect = wrapper.getBoundingClientRect();
    const clientX = rect.left + (block.x + 2) * 2 + 1; // Add 1 for inside
    const clientY = rect.top + (block.y + 2) * 2 + 1;

    const viewerContainer = actualContainer as Element;
    fireEvent.mouseMove(viewerContainer, { clientX, clientY });
    fireEvent.click(viewerContainer, { clientX, clientY });

    expect(onTextClick).toHaveBeenCalled();
  });

  test('shows tooltip with hovered text', () => {
    const ref = { current: null } as any;

    const block: TextBlock = {
      id: 'b1',
      text: 'Tooltip text',
      boxes: [],
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000', backgroundColor: 'transparent', lineHeight: 1.2 },
      source: 'digital',
      confidence: 1,
      x: 10,
      y: 10,
      width: 50,
      height: 12,
      pageNumber: 1,
    };

    const { getByRole } = render(
      <div data-testid="root">
        <PDFViewer
          containerRef={ref}
          textBlocks={[block]}
          selectedBlock={null}
          onTextClick={() => {}}
          onCanvasClick={() => {}}
          isEditing={false}
          viewport={{ zoom: 2, panX: 0, panY: 0, currentPage: 1 }}
        />
      </div>
    );

    // Append a wrapper to the container ref so that mouse coordinate math has a rect
    const actualContainer = ref.current as HTMLElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-canvas-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '200px';
    wrapper.style.height = '200px';
    actualContainer.appendChild(wrapper);

    const rect = wrapper.getBoundingClientRect();
    const clientX = rect.left + (block.x + 2) * 2 + 1;
    const clientY = rect.top + (block.y + 2) * 2 + 1;

    const viewer = actualContainer as Element;
    fireEvent.mouseMove(viewer, { clientX, clientY });

    // Tooltip should appear
    const tooltip = getByRole('tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain(block.text);
  });

  test('adds source and confidence classes to text highlight', () => {
    const ref = { current: null } as any;

    const block: TextBlock = {
      id: 'b2',
      text: 'Scanned low conf',
      boxes: [],
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000', backgroundColor: 'transparent', lineHeight: 1.2 },
      source: 'ocr',
      confidence: 0.4,
      x: 10,
      y: 10,
      width: 50,
      height: 12,
      pageNumber: 1,
    };

    const { container } = render(
      <div data-testid="root">
        <PDFViewer
          containerRef={ref}
          textBlocks={[block]}
          selectedBlock={null}
          onTextClick={() => {}}
          onCanvasClick={() => {}}
          isEditing={false}
          viewport={{ zoom: 1, panX: 0, panY: 0, currentPage: 1 }}
        />
      </div>
    );

    const actualContainer = ref.current as HTMLElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-canvas-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '200px';
    wrapper.style.height = '200px';
    actualContainer.appendChild(wrapper);

    // Query for highlight element by class and id
    const hit = container.querySelector('.text-block-highlight.source-scanned.low-confidence');
    expect(hit).toBeTruthy();
  });
});
