import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,

  login: async (username, password) => {
    set({ loading: true })
    try {
      const user = await window.api.login(username, password)
      if (user) {
        set({ user, isAuthenticated: true, loading: false })
        return user
      }
      set({ loading: false })
      return null
    } catch (error) {
      set({ loading: false })
      return null
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true })
  }
}))
