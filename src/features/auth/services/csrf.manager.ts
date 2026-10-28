import axios from "axios";
import type { CsrfResponse } from "../types/auth.types";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";

let cachedToken: string | null = null;
let fetchingPromise: Promise<string> | null = null;

export const csrfManager = {
  getToken(): string | null {
    return cachedToken;
  },

  setToken(token: string | null): void {
    cachedToken = token;
  },

  async fetchToken(): Promise<string> {
    if (cachedToken) {
      return cachedToken;
    }
    if (fetchingPromise) {
      return fetchingPromise;
    }

    fetchingPromise = axios
      .get<CsrfResponse>(`${apiBaseUrl}/auth/csrf`, {
        withCredentials: true,
      })
      .then((res) => {
        cachedToken = res.data.csrfToken;
        return cachedToken;
      })
      .catch((error) => {
        cachedToken = null;
        throw error;
      })
      .finally(() => {
        fetchingPromise = null;
      });

    return fetchingPromise;
  },

  clear(): void {
    cachedToken = null;
    fetchingPromise = null;
  },
};
