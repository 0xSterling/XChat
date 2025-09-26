import { keccak256, toUtf8Bytes } from 'ethers';

export type CipherBlob = { iv: string; data: string };

export async function deriveAesKeyFromAddress(address: string): Promise<CryptoKey> {
  // Derive a 32-byte key by keccak256(address)
  const hashHex = keccak256(toUtf8Bytes(address.toLowerCase()));
  const keyBytes = hexToBytes(hashHex);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptMessage(key: CryptoKey, plaintext: string): Promise<CipherBlob> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { iv: bytesToHex(iv), data: bytesToBase64(new Uint8Array(ct)) };
}

export async function decryptMessage(key: CryptoKey, blob: CipherBlob): Promise<string> {
  const dec = new TextDecoder();
  const iv = hexToBytes(blob.iv);
  const data = base64ToBytes(blob.data);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return dec.decode(pt);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const len = clean.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof window === 'undefined') return '';
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof window === 'undefined') return new Uint8Array();
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

