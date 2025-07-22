import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GitIntegration from '../../client/src/components/GitIntegration';
import userEvent from '@testing-library/user-event';

// Mock the API service
jest.mock('../../client/src/services/api', () => ({
  api: {
    getGitStatus: jest.fn(),
    commitChanges: jest.fn(),
    pushChanges: jest.fn(),
    pullChanges: jest.fn(),
    cloneRepository: jest.fn()
  }
}));

import { api } from '../../client/src/services/api';

const mockGitStatus = {
  current: 'main',
  files: [
    { path: 'README.md', index: 'M', working_dir: ' ' },
    { path: 'src/new-file.js', index: 'A', working_dir: ' ' },
    { path: 'docs/guide.md', index: ' ', working_dir: 'M' }
  ]
};

describe('GitIntegration Component', () => {
  const defaultProps = {
    showToast: jest.fn(),
    onFilesChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.getGitStatus.mockResolvedValue(mockGitStatus);
  });

  test('renders git integration panel', () => {
    render(<GitIntegration {...defaultProps} />);
    
    expect(screen.getByText('Git Integration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh status/i })).toBeInTheDocument();
  });

  test('loads and displays git status', async () => {
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Branch: main')).toBeInTheDocument();
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText('src/new-file.js')).toBeInTheDocument();
      expect(screen.getByText('docs/guide.md')).toBeInTheDocument();
    });
  });

  test('shows different status indicators for files', async () => {
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      // Modified file (M in index)
      expect(screen.getByText('M')).toBeInTheDocument();
      // Added file (A in index)
      expect(screen.getByText('A')).toBeInTheDocument();
      // Working directory changes
      expect(screen.getAllByText('M')).toHaveLength(2); // One for index, one for working dir
    });
  });

  test('commits changes with commit message', async () => {
    const user = userEvent.setup();
    api.commitChanges.mockResolvedValue({ message: 'Changes committed successfully' });
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox', { placeholder: /commit message/i })).toBeInTheDocument();
    });

    const commitInput = screen.getByRole('textbox', { placeholder: /commit message/i });
    const commitButton = screen.getByRole('button', { name: /commit/i });
    
    await user.type(commitInput, 'Add new features and fix bugs');
    await user.click(commitButton);
    
    await waitFor(() => {
      expect(api.commitChanges).toHaveBeenCalledWith('Add new features and fix bugs');
      expect(defaultProps.showToast).toHaveBeenCalledWith('Changes committed successfully', 'success');
    });
  });

  test('prevents commit with empty message', async () => {
    const user = userEvent.setup();
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      const commitButton = screen.getByRole('button', { name: /commit/i });
      expect(commitButton).toBeDisabled();
    });
  });

  test('pushes changes to remote', async () => {
    const user = userEvent.setup();
    api.pushChanges.mockResolvedValue({ message: 'Changes pushed successfully' });
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      const pushButton = screen.getByRole('button', { name: /push/i });
      await user.click(pushButton);
    });
    
    await waitFor(() => {
      expect(api.pushChanges).toHaveBeenCalled();
      expect(defaultProps.showToast).toHaveBeenCalledWith('Changes pushed successfully', 'success');
    });
  });

  test('pulls changes from remote', async () => {
    const user = userEvent.setup();
    api.pullChanges.mockResolvedValue({ message: 'Repository updated successfully' });
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      const pullButton = screen.getByRole('button', { name: /pull/i });
      await user.click(pullButton);
    });
    
    await waitFor(() => {
      expect(api.pullChanges).toHaveBeenCalledWith('main');
      expect(defaultProps.showToast).toHaveBeenCalledWith('Repository updated successfully', 'success');
      expect(defaultProps.onFilesChange).toHaveBeenCalled();
    });
  });

  test('shows clone repository form', async () => {
    const user = userEvent.setup();
    
    render(<GitIntegration {...defaultProps} />);
    
    const cloneButton = screen.getByRole('button', { name: /clone repository/i });
    await user.click(cloneButton);
    
    expect(screen.getByText('Clone Repository')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { placeholder: /repository url/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { placeholder: /branch/i })).toBeInTheDocument();
  });

  test('clones repository with URL and branch', async () => {
    const user = userEvent.setup();
    api.cloneRepository.mockResolvedValue({ message: 'Repository cloned successfully' });
    
    render(<GitIntegration {...defaultProps} />);
    
    // Open clone form
    const cloneButton = screen.getByRole('button', { name: /clone repository/i });
    await user.click(cloneButton);
    
    // Fill in clone form
    const urlInput = screen.getByRole('textbox', { placeholder: /repository url/i });
    const branchInput = screen.getByRole('textbox', { placeholder: /branch/i });
    const submitButton = screen.getByRole('button', { name: /clone/i });
    
    await user.type(urlInput, 'https://github.com/example/repo.git');
    await user.type(branchInput, 'develop');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(api.cloneRepository).toHaveBeenCalledWith('https://github.com/example/repo.git', 'develop');
      expect(defaultProps.showToast).toHaveBeenCalledWith('Repository cloned successfully', 'success');
      expect(defaultProps.onFilesChange).toHaveBeenCalled();
    });
  });

  test('refreshes git status', async () => {
    const user = userEvent.setup();
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      expect(api.getGitStatus).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /refresh status/i });
    await user.click(refreshButton);
    
    await waitFor(() => {
      expect(api.getGitStatus).toHaveBeenCalledTimes(2);
    });
  });

  test('handles git status errors', async () => {
    api.getGitStatus.mockRejectedValue(new Error('Not a git repository'));
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      expect(defaultProps.showToast).toHaveBeenCalledWith('Error loading git status: Not a git repository', 'error');
    });
  });

  test('handles commit errors', async () => {
    const user = userEvent.setup();
    api.commitChanges.mockRejectedValue(new Error('Nothing to commit'));
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      const commitInput = screen.getByRole('textbox', { placeholder: /commit message/i });
      const commitButton = screen.getByRole('button', { name: /commit/i });
      
      user.type(commitInput, 'Test commit');
      user.click(commitButton);
    });
    
    await waitFor(() => {
      expect(defaultProps.showToast).toHaveBeenCalledWith('Error committing changes: Nothing to commit', 'error');
    });
  });

  test('shows loading states during operations', async () => {
    const user = userEvent.setup();
    
    // Mock a slow API call
    api.commitChanges.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ message: 'Success' }), 1000)
    ));
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      const commitInput = screen.getByRole('textbox', { placeholder: /commit message/i });
      const commitButton = screen.getByRole('button', { name: /commit/i });
      
      user.type(commitInput, 'Test commit');
      user.click(commitButton);
    });
    
    expect(screen.getByText('Committing...')).toBeInTheDocument();
  });

  test('shows clean working directory message when no changes', async () => {
    api.getGitStatus.mockResolvedValue({
      current: 'main',
      files: []
    });
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Working directory clean')).toBeInTheDocument();
    });
  });

  test('updates file list after successful operations', async () => {
    const user = userEvent.setup();
    api.commitChanges.mockResolvedValue({ message: 'Success' });
    
    render(<GitIntegration {...defaultProps} />);
    
    await waitFor(() => {
      const commitInput = screen.getByRole('textbox', { placeholder: /commit message/i });
      const commitButton = screen.getByRole('button', { name: /commit/i });
      
      user.type(commitInput, 'Test commit');
      user.click(commitButton);
    });
    
    await waitFor(() => {
      expect(defaultProps.onFilesChange).toHaveBeenCalled();
    });
  });

  test('cancels clone repository form', async () => {
    const user = userEvent.setup();
    
    render(<GitIntegration {...defaultProps} />);
    
    // Open clone form
    const cloneButton = screen.getByRole('button', { name: /clone repository/i });
    await user.click(cloneButton);
    
    expect(screen.getByText('Clone Repository')).toBeInTheDocument();
    
    // Cancel form
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(screen.queryByText('Clone Repository')).not.toBeInTheDocument();
  });
});