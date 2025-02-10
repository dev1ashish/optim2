import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeyStore {
  keys: Record<string, string>;
  setKey: (provider: string, key: string) => void;
  getKey: (provider: string) => string;
  removeKey: (provider: string) => void;
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set, get) => ({
      keys: {},
      setKey: (provider: string, key: string) => 
        set((state) => ({ keys: { ...state.keys, [provider]: key } })),
      getKey: (provider: string) => get().keys[provider] || '',
      removeKey: (provider: string) =>
        set((state) => {
          const { [provider]: _, ...rest } = state.keys;
          return { keys: rest };
        }),
    }),
    {
      name: 'api-keys-storage',
    }
  )
);
