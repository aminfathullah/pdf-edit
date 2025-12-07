import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { EditBox } from '@ui/components/EditBox';

describe('EditBox component', () => {
  test('renders with initial style badges and toggles style panel', async () => {
    const style = { fontFamily: 'Arial, sans-serif', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000000', backgroundColor: 'transparent', lineHeight: 1.2 } as any;
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <EditBox originalText="Hello" style={style} position={{ x: 10, y: 10 }} onConfirm={onConfirm} onCancel={onCancel} />
    );

    // Badges displayed
    expect(screen.getByText('Arial')).toBeTruthy();
    expect(screen.getByText('14px')).toBeTruthy();

    // Toggle style panel
    const toggle = screen.getByRole('button', { name: 'Toggle style panel' });
    fireEvent.click(toggle);

    // Change font size
    const fontSizeInput = await screen.findByLabelText('Font size');
    fireEvent.change(fontSizeInput, { target: { value: '18' } });

    const confirmButton = screen.getByText('✓ Apply');
    fireEvent.click(confirmButton);

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    const calledStyle = (onConfirm.mock.calls[0][1] as any);
    expect(calledStyle.fontSize).toBe(18);
  });
});
