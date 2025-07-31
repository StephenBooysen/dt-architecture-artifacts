import React from 'react';

const Users = () => {
  return (
    <>
      <div className="content-header">
        <h1>Users Management</h1>
        <p>Manage system users and their roles</p>
      </div>
      
      <div className="users-section">
        <div className="users-table-container" id="usersTableContainer">
          <div className="loading-message" id="loadingMessage">Loading users...</div>
          <div className="error-message" id="errorMessage" style={{display: 'none'}}>Failed to load users</div>
        </div>
      </div>

      {/* Edit User Modal */}
      <div className="modal" id="editUserModal" style={{display: 'none'}}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>Edit User</h2>
            <button className="modal-close" id="closeModal">&times;</button>
          </div>
          <form id="editUserForm">
            <div className="form-group">
              <label htmlFor="editUsername">Username:</label>
              <input type="text" id="editUsername" required />
            </div>
            <div className="form-group">
              <label>Roles:</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" id="roleRead" value="read" />
                  Read
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" id="roleWrite" value="write" />
                  Write
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" id="roleAdmin" value="admin" />
                  Admin
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" id="cancelEdit">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
      
      <script dangerouslySetInnerHTML={{__html: `
        let users = [];
        let currentEditingUser = null;

        // Load users on page load
        document.addEventListener('DOMContentLoaded', loadUsers);

        async function loadUsers() {
          try {
            const response = await fetch('/api/users');
            if (response.ok) {
              users = await response.json();
              renderUsersTable();
            } else {
              showError('Failed to load users');
            }
          } catch (error) {
            showError('Error loading users: ' + error.message);
          }
        }

        function renderUsersTable() {
          const container = document.getElementById('usersTableContainer');
          const loadingMessage = document.getElementById('loadingMessage');
          const errorMessage = document.getElementById('errorMessage');
          
          loadingMessage.style.display = 'none';
          errorMessage.style.display = 'none';
          
          const tableHtml = \`
            <table class="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Date Created</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                \${users.map(user => \`
                  <tr>
                    <td>\${user.username}</td>
                    <td>\${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>\${user.roles ? user.roles.join(', ') : 'None'}</td>
                    <td>
                      <button class="btn btn-sm btn-primary" data-user-id="\${user.id}">
                        Edit
                      </button>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \`;
          
          container.innerHTML = tableHtml;
          
          // Add event listeners to edit buttons
          const editButtons = container.querySelectorAll('button[data-user-id]');
          editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              const userId = e.target.getAttribute('data-user-id');
              editUser(userId);
            });
          });
        }

        function showError(message) {
          const loadingMessage = document.getElementById('loadingMessage');
          const errorMessage = document.getElementById('errorMessage');
          
          loadingMessage.style.display = 'none';
          errorMessage.style.display = 'block';
          errorMessage.textContent = message;
        }

        function editUser(userId) {
          currentEditingUser = users.find(user => user.id === userId);
          if (!currentEditingUser) return;

          // Populate form
          document.getElementById('editUsername').value = currentEditingUser.username;
          
          // Clear checkboxes
          document.getElementById('roleRead').checked = false;
          document.getElementById('roleWrite').checked = false;
          document.getElementById('roleAdmin').checked = false;
          
          // Set current roles
          if (currentEditingUser.roles) {
            currentEditingUser.roles.forEach(role => {
              const checkbox = document.getElementById('role' + role.charAt(0).toUpperCase() + role.slice(1));
              if (checkbox) checkbox.checked = true;
            });
          }

          // Show modal
          document.getElementById('editUserModal').style.display = 'flex';
        }

        // Modal event handlers
        document.getElementById('closeModal').addEventListener('click', closeEditModal);
        document.getElementById('cancelEdit').addEventListener('click', closeEditModal);

        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          if (!currentEditingUser) return;

          const username = document.getElementById('editUsername').value;
          const roles = [];
          
          if (document.getElementById('roleRead').checked) roles.push('read');
          if (document.getElementById('roleWrite').checked) roles.push('write');
          if (document.getElementById('roleAdmin').checked) roles.push('admin');

          try {
            const response = await fetch(\`/api/users/\${currentEditingUser.id}\`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, roles })
            });

            if (response.ok) {
              const updatedUser = await response.json();
              // Update local users array
              const userIndex = users.findIndex(u => u.id === currentEditingUser.id);
              if (userIndex !== -1) {
                users[userIndex] = updatedUser;
              }
              renderUsersTable();
              closeEditModal();
              alert('User updated successfully');
            } else {
              const error = await response.json();
              alert('Error: ' + error.error);
            }
          } catch (error) {
            alert('Error: ' + error.message);
          }
        });

        function closeEditModal() {
          document.getElementById('editUserModal').style.display = 'none';
          currentEditingUser = null;
        }

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
          const modal = document.getElementById('editUserModal');
          if (e.target === modal) {
            closeEditModal();
          }
        });
      `}} />
      
      <style dangerouslySetInnerHTML={{__html: `
        .users-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .users-table-container {
          padding: 2rem;
        }

        .loading-message, .error-message {
          text-align: center;
          padding: 2rem;
          color: #5e6c84;
        }

        .error-message {
          color: #de350b;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .users-table th,
        .users-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #dfe1e6;
        }

        .users-table th {
          background: #f4f5f7;
          font-weight: 600;
          color: #172b4d;
          font-size: 0.875rem;
        }

        .users-table td {
          color: #172b4d;
          font-size: 0.875rem;
        }

        .users-table tr:hover {
          background: #f4f5f7;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: 1px solid #dfe1e6;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          background: #ffffff;
          color: #172b4d;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          line-height: 1;
        }

        .btn-primary {
          background: #0052cc;
          color: white;
          border-color: #0052cc;
        }

        .btn-primary:hover {
          background: #0747a6;
          border-color: #0747a6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .btn-secondary {
          background: #ffffff;
          color: #172b4d;
          border-color: #dfe1e6;
        }

        .btn-secondary:hover {
          background: #f4f5f7;
          border-color: #c1c7d0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.8125rem;
        }

        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          align-items: center;
          justify-content: center;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          padding: 1.5rem 2rem 1rem;
          border-bottom: 1px solid #dfe1e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #5e6c84;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #172b4d;
        }

        .modal form {
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #172b4d;
          font-size: 0.875rem;
        }

        .form-group input[type="text"] {
          width: 100%;
          padding: 0.75rem;
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .form-group input[type="text"]:focus {
          outline: none;
          border-color: #0052cc;
          box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 400 !important;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          margin: 0;
          width: auto;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }
      `}} />
    </>
  );
};

export default Users;