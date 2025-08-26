const USERNAME_KEY = "webrtc-username";

export const saveUsername = (username: string): void => {
  try {
    if (username.trim()) {
      localStorage.setItem(USERNAME_KEY, username.trim());
    }
  } catch (error) {
    console.warn("Failed to save username to localStorage:", error);
  }
};

export const loadUsername = (): string => {
  try {
    return localStorage.getItem(USERNAME_KEY) || "";
  } catch (error) {
    console.warn("Failed to load username from localStorage:", error);
    return "";
  }
};

export const clearUsername = (): void => {
  try {
    localStorage.removeItem(USERNAME_KEY);
  } catch (error) {
    console.warn("Failed to clear username from localStorage:", error);
  }
};
