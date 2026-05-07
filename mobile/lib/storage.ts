// ============================================
// UniSage Mobile — Async Storage Wrapper
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Type-safe wrapper around AsyncStorage with JSON serialization.
 * Used for caching content, offline queue, and non-sensitive data.
 * Sensitive data (JWT) goes into SecureStore via auth.ts.
 */
const storage = {
  /** Get a parsed JSON value */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  /** Store a JSON-serializable value */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('[storage] set failed:', key, err);
    }
  },

  /** Remove a single key */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn('[storage] remove failed:', key, err);
    }
  },

  /** Remove multiple keys */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (err) {
      console.warn('[storage] multiRemove failed:', err);
    }
  },

  /** Get all keys in storage */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch {
      return [];
    }
  },

  /** Clear all storage (use with caution) */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (err) {
      console.warn('[storage] clear failed:', err);
    }
  },
};

export default storage;
