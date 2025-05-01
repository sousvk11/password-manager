const { Model, DataTypes } = require('sequelize');
const crypto = require('crypto-js');
const sequelize = require('../database/connection');

class Credential extends Model {
  decryptPassword() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const bytes = crypto.AES.decrypt(this.password, encryptionKey);
    return bytes.toString(crypto.enc.Utf8);
  }

  decryptToken() {
    if (!this.token) return null;
    
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const bytes = crypto.AES.decrypt(this.token, encryptionKey);
    return bytes.toString(crypto.enc.Utf8);
  }
}

Credential.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  websiteName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  url: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING
  },
  userId: {
    type: DataTypes.STRING
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  token: {
    type: DataTypes.TEXT
  },
  description: {
    type: DataTypes.TEXT
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lastModified: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Credential',
  tableName: 'credentials',
  timestamps: true,
  hooks: {
    beforeCreate: (credential) => {
      const encryptionKey = process.env.ENCRYPTION_KEY;
      
      // Encrypt password
      if (credential.password) {
        credential.password = crypto.AES.encrypt(credential.password, encryptionKey).toString();
      }
      
      // Encrypt token if present
      if (credential.token) {
        credential.token = crypto.AES.encrypt(credential.token, encryptionKey).toString();
      }
    },
    beforeUpdate: (credential) => {
      const encryptionKey = process.env.ENCRYPTION_KEY;
      
      // Only encrypt if the password was changed and is not already encrypted
      if (credential.changed('password') && credential.password && !credential.password.startsWith('U2')) {
        credential.password = crypto.AES.encrypt(credential.password, encryptionKey).toString();
      }
      
      // Only encrypt if the token was changed and is not already encrypted
      if (credential.changed('token') && credential.token && !credential.token.startsWith('U2')) {
        credential.token = crypto.AES.encrypt(credential.token, encryptionKey).toString();
      }
    }
  }
});

module.exports = Credential;
