const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'users.json');

class UserStorage {
  constructor() {
    this.users = [];
    this.loadUsers();
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      this.users = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.users = [];
        await this.saveUsers();
      } else {
        console.error('Error loading users:', error);
        this.users = [];
      }
    }
  }

  async saveUsers() {
    try {
      await fs.writeFile(USERS_FILE, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  async createUser(username, password) {
    if (this.findUserByUsername(username)) {
      throw new Error('User already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    this.users.push(user);
    await this.saveUsers();
    
    return { id: user.id, username: user.username, createdAt: user.createdAt, roles: user.roles || [] };
  }

  findUserByUsername(username) {
    return this.users.find(user => user.username === username);
  }

  findUserById(id) {
    return this.users.find(user => user.id === id);
  }

  async validatePassword(username, password) {
    const user = this.findUserByUsername(username);
    if (!user) {
      return false;
    }

    return await bcrypt.compare(password, user.password);
  }

  async authenticate(username, password) {
    const user = this.findUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return { id: user.id, username: user.username, createdAt: user.createdAt, roles: user.roles || [] };
  }

  getAllUsers() {
    return this.users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    }));
  }
}

module.exports = new UserStorage();