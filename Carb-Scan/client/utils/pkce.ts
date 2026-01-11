import * as Crypto from "expo-crypto";

export async function generateCodeVerifier(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return uint8ArrayToBase64URL(new Uint8Array(randomBytes));
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return base64ToBase64URL(hash);
}

export async function generateState(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return uint8ArrayToBase64URL(new Uint8Array(randomBytes));
}

function uint8ArrayToBase64URL(bytes: Uint8Array): string {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  const len = bytes.length;
  
  for (let i = 0; i < len; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < len ? bytes[i + 1] : 0;
    const byte3 = i + 2 < len ? bytes[i + 2] : 0;
    
    const triplet = (byte1 << 16) | (byte2 << 8) | byte3;
    
    result += base64Chars[(triplet >> 18) & 0x3f];
    result += base64Chars[(triplet >> 12) & 0x3f];
    
    if (i + 1 < len) {
      result += base64Chars[(triplet >> 6) & 0x3f];
    }
    
    if (i + 2 < len) {
      result += base64Chars[triplet & 0x3f];
    }
  }
  
  return result;
}

function base64ToBase64URL(base64: string): string {
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface PKCEParams {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export async function generatePKCEParams(): Promise<PKCEParams> {
  const [state, codeVerifier] = await Promise.all([
    generateState(),
    generateCodeVerifier(),
  ]);
  
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  return {
    state,
    codeVerifier,
    codeChallenge,
  };
}
