// React is implicit in test environment
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as validators from '@utils/validators';
import { UploadArea } from '@ui/components/UploadArea';

describe('UploadArea component', () => {
  test('calls onFileSelect when a valid PDF is selected via input', async () => {
    const mockHandler = jest.fn();
    // Mock validator to succeed
    jest.spyOn(validators, 'validatePDFMagicBytes').mockResolvedValue({ isValid: true } as any);
    render(<UploadArea onFileSelect={mockHandler} />);

    // Query for hidden input via selector
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });

    // Simulate change event
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(mockHandler).toHaveBeenCalled());
    const calledWith = mockHandler.mock.calls[0][0] as File;
    expect(calledWith.name).toBe('test.pdf');
  });

  test('shows error when a file has PDF MIME/type but invalid magic bytes', async () => {
    const mockHandler = jest.fn();
    // Mock validator to return invalid
    jest.spyOn(validators, 'validatePDFMagicBytes').mockResolvedValue({ isValid: false, error: 'Invalid PDF header' } as any);
    render(<UploadArea onFileSelect={mockHandler} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // A PDF MIME type but content doesn't start with '%PDF-'
    const file = new File(['NOT_PDF_HEADER'], 'fake.pdf', { type: 'application/pdf' });

    // Simulate change event
    fireEvent.change(fileInput, { target: { files: [file] } });

    const alert = await screen.findByRole('alert');
    expect(alert).toBeTruthy();
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('shows error when a non-PDF file is selected', () => {
    const mockHandler = jest.fn();
    render(<UploadArea onFileSelect={mockHandler} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['notpdf'], 'not-a-pdf.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(mockHandler).not.toHaveBeenCalled();
  });
});
