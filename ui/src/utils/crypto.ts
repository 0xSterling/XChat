import CryptoJS from 'crypto-js';

export class CryptoUtils {
  // Generate a random password that looks like an Ethereum address
  static generatePasswordAddress(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(20);
    return '0x' + randomBytes.toString();
  }

  // AES encrypt message with password
  static encryptMessage(message: string, password: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(message, password).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // AES decrypt message with password
  static decryptMessage(encryptedMessage: string, password: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Failed to decrypt - invalid password or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Validate Ethereum address format
  static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}