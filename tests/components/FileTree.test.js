import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileTree from '../../client/src/components/FileTree';

// Mock the API service
jest.mock('../../client/src/services/api', () => ({
  api: {
    getFiles: jest.fn(),
    createFile: jest.fn(),
    createFolder: jest.fn(),
    deleteFile: jest.fn(),
    deleteFolder: jest.fn(),
    renameItem: jest.fn()
  }
}));

// Mock file type detector
jest.mock('../../client/src/utils/fileTypeDetector', () => ({
  detectFileType: jest.fn((filename) => {
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.jpg') || filename.endsWith('.png')) return 'image';
    return 'text';
  }),
  getFileIcon: jest.fn((type) => {
    switch (type) {
      case 'markdown': return '📝';
      case 'image': return '🖼️';
      default: return '📄';
    }
  })
}));

import { api } from '../../client/src/services/api';

const mockFiles = [
  {
    name: 'Documents',
    type: 'directory',
    path: 'Documents',
    children: [
      {
        name: 'README.md',
        type: 'file',
        path: 'Documents/README.md',
        fileType: 'markdown'
      }
    ]
  },
  {
    name: 'image.jpg',
    type: 'file',
    path: 'image.jpg',
    fileType: 'image'
  }
];

describe('FileTree Component', () => {
  const defaultProps = {
    selectedFile: null,
    onFileSelect: jest.fn(),
    onFilesChange: jest.fn(),
    showToast: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.getFiles.mockResolvedValue(mockFiles);
  });

  test('renders loading state initially', () => {
    render(<FileTree {...defaultProps} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders file tree after loading', async () => {
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
    });
  });

  test('displays file icons correctly', async () => {
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('📝')).toBeInTheDocument(); // README.md icon
      expect(screen.getByText('🖼️')).toBeInTheDocument(); // image.jpg icon
    });
  });

  test('expands and collapses directories', async () => {
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      const documentsFolder = screen.getByText('Documents');
      expect(documentsFolder).toBeInTheDocument();
    });

    // Initially, README.md should not be visible (directory collapsed)
    expect(screen.queryByText('README.md')).not.toBeInTheDocument();

    // Click to expand directory
    const documentsFolder = screen.getByText('Documents');
    fireEvent.click(documentsFolder);

    // Now README.md should be visible
    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
    });
  });

  test('calls onFileSelect when file is clicked', async () => {
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      const imageFile = screen.getByText('image.jpg');
      fireEvent.click(imageFile);
    });

    expect(defaultProps.onFileSelect).toHaveBeenCalledWith('image.jpg');
  });

  test('shows context menu on right click', async () => {
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      const imageFile = screen.getByText('image.jpg');
      fireEvent.contextMenu(imageFile);
    });

    await waitFor(() => {
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  test('creates new file through context menu', async () => {
    api.createFile.mockResolvedValue({ message: 'File created successfully' });
    
    render(<FileTree {...defaultProps} />);
    
    // Right-click to show context menu
    await waitFor(() => {
      const treeContainer = screen.getByRole('tree');
      fireEvent.contextMenu(treeContainer);
    });

    // Click "New File"
    await waitFor(() => {
      const newFileButton = screen.getByText('New File');
      fireEvent.click(newFileButton);
    });

    // Enter file name in prompt (we need to mock window.prompt)
    window.prompt = jest.fn(() => 'new-file.md');
    
    await waitFor(() => {
      expect(api.createFile).toHaveBeenCalledWith('new-file.md', '');
      expect(defaultProps.showToast).toHaveBeenCalledWith('File created successfully', 'success');
    });
  });

  test('creates new folder through context menu', async () => {
    api.createFolder.mockResolvedValue({ message: 'Folder created successfully' });
    
    render(<FileTree {...defaultProps} />);
    
    // Right-click to show context menu
    await waitFor(() => {
      const treeContainer = screen.getByRole('tree');
      fireEvent.contextMenu(treeContainer);
    });

    // Click "New Folder"
    await waitFor(() => {
      const newFolderButton = screen.getByText('New Folder');
      fireEvent.click(newFolderButton);
    });

    window.prompt = jest.fn(() => 'new-folder');
    
    await waitFor(() => {
      expect(api.createFolder).toHaveBeenCalledWith('new-folder');
      expect(defaultProps.showToast).toHaveBeenCalledWith('Folder created successfully', 'success');
    });
  });

  test('renames file through context menu', async () => {
    api.renameItem.mockResolvedValue({ message: 'Item renamed successfully' });
    
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      const imageFile = screen.getByText('image.jpg');
      fireEvent.contextMenu(imageFile);
    });

    await waitFor(() => {
      const renameButton = screen.getByText('Rename');
      fireEvent.click(renameButton);
    });

    window.prompt = jest.fn(() => 'renamed-image.jpg');
    
    await waitFor(() => {
      expect(api.renameItem).toHaveBeenCalledWith('image.jpg', 'renamed-image.jpg');
      expect(defaultProps.showToast).toHaveBeenCalledWith('Item renamed successfully', 'success');
    });
  });

  test('deletes file through context menu', async () => {
    api.deleteFile.mockResolvedValue({ message: 'File deleted successfully' });
    
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      const imageFile = screen.getByText('image.jpg');
      fireEvent.contextMenu(imageFile);
    });

    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });

    window.confirm = jest.fn(() => true);
    
    await waitFor(() => {
      expect(api.deleteFile).toHaveBeenCalledWith('image.jpg');
      expect(defaultProps.showToast).toHaveBeenCalledWith('File deleted successfully', 'success');
    });
  });

  test('handles API errors gracefully', async () => {
    api.getFiles.mockRejectedValue(new Error('Network error'));
    
    render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      expect(defaultProps.showToast).toHaveBeenCalledWith('Error loading files: Network error', 'error');
    });
  });

  test('refreshes file tree when onFilesChange is called', async () => {
    const { rerender } = render(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      expect(api.getFiles).toHaveBeenCalledTimes(1);
    });

    // Simulate external file change
    defaultProps.onFilesChange();
    rerender(<FileTree {...defaultProps} />);
    
    await waitFor(() => {
      expect(api.getFiles).toHaveBeenCalledTimes(2);
    });
  });

  test('highlights selected file', async () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedFile: 'image.jpg'
    };
    
    render(<FileTree {...propsWithSelection} />);
    
    await waitFor(() => {
      const selectedFile = screen.getByText('image.jpg');
      expect(selectedFile.closest('.file-item')).toHaveClass('selected');
    });
  });
});