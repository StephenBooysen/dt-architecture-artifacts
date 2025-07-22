import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarkdownEditor from '../../client/src/components/MarkdownEditor';
import userEvent from '@testing-library/user-event';

// Mock the API service
jest.mock('../../client/src/services/api', () => ({
  api: {
    saveFile: jest.fn(),
    getFileContent: jest.fn()
  }
}));

// Mock react-markdown and syntax highlighter
jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }) {
    return <div data-testid="markdown-preview">{children}</div>;
  };
});

jest.mock('react-syntax-highlighter', () => ({
  Prism: function MockPrism({ children }) {
    return <pre data-testid="code-block">{children}</pre>;
  }
}));

import { api } from '../../client/src/services/api';

describe('MarkdownEditor Component', () => {
  const defaultProps = {
    filePath: 'test.md',
    showToast: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders editor with loading state', () => {
    api.getFileContent.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<MarkdownEditor {...defaultProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('loads and displays file content', async () => {
    const mockContent = '# Test Content\n\nThis is a test markdown file.';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(mockContent);
    });
  });

  test('shows split view with editor and preview', async () => {
    const mockContent = '# Test Heading';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-preview')).toBeInTheDocument();
    });
  });

  test('updates preview when content changes', async () => {
    const user = userEvent.setup();
    const mockContent = '# Initial Content';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(mockContent);
    });

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '# Updated Content\n\nNew paragraph');
    
    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('# Updated Content\n\nNew paragraph');
  });

  test('auto-saves content after typing stops', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    const mockContent = '# Initial Content';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    api.saveFile.mockResolvedValue({ message: 'File saved successfully' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(mockContent);
    });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, ' - Updated');
    
    // Fast-forward time to trigger auto-save
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(api.saveFile).toHaveBeenCalledWith('test.md', '# Initial Content - Updated');
      expect(defaultProps.showToast).toHaveBeenCalledWith('File saved successfully', 'success');
    });
    
    jest.useRealTimers();
  });

  test('shows save status indicator', async () => {
    const mockContent = '# Test Content';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  test('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    const mockContent = '';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    api.saveFile.mockResolvedValue({ message: 'File saved successfully' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox');
    
    // Test Ctrl+S to save
    await user.type(textarea, 'Some content');
    await user.keyboard('{Control>}s{/Control}');
    
    await waitFor(() => {
      expect(api.saveFile).toHaveBeenCalledWith('test.md', 'Some content');
    });
  });

  test('shows error message when file loading fails', async () => {
    api.getFileContent.mockRejectedValue(new Error('File not found'));
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(defaultProps.showToast).toHaveBeenCalledWith('Error loading file: File not found', 'error');
    });
  });

  test('shows error message when auto-save fails', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    const mockContent = '# Initial Content';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    api.saveFile.mockRejectedValue(new Error('Network error'));
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(mockContent);
    });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, ' - Updated');
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(defaultProps.showToast).toHaveBeenCalledWith('Error saving file: Network error', 'error');
    });
    
    jest.useRealTimers();
  });

  test('handles file path changes', async () => {
    const mockContent1 = '# File 1';
    const mockContent2 = '# File 2';
    
    api.getFileContent
      .mockResolvedValueOnce({ content: mockContent1, fileType: 'markdown' })
      .mockResolvedValueOnce({ content: mockContent2, fileType: 'markdown' });
    
    const { rerender } = render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(mockContent1);
    });

    // Change file path
    rerender(<MarkdownEditor {...defaultProps} filePath="another-file.md" />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(mockContent2);
    });
    
    expect(api.getFileContent).toHaveBeenCalledTimes(2);
    expect(api.getFileContent).toHaveBeenLastCalledWith('another-file.md');
  });

  test('shows unsaved changes indicator', async () => {
    const user = userEvent.setup();
    const mockContent = '# Initial Content';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(mockContent);
    });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, ' - Modified');
    
    // Should show "Unsaved changes" indicator
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  test('provides toolbar with formatting buttons', async () => {
    const mockContent = '';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Heading')).toBeInTheDocument();
      expect(screen.getByTitle('Link')).toBeInTheDocument();
      expect(screen.getByTitle('Code')).toBeInTheDocument();
    });
  });

  test('applies formatting when toolbar buttons are clicked', async () => {
    const user = userEvent.setup();
    const mockContent = 'selected text';
    api.getFileContent.mockResolvedValue({ content: mockContent, fileType: 'markdown' });
    
    render(<MarkdownEditor {...defaultProps} />);
    
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox');
    
    // Select some text
    await user.selectOptions(textarea, { startOffset: 0, endOffset: 8 });
    
    // Click bold button
    const boldButton = screen.getByTitle('Bold');
    await user.click(boldButton);
    
    expect(textarea).toHaveValue('**selected** text');
  });
});