import { create } from 'zustand'

export const useUiStore = create((set, get) => ({
  theme: 'light',
  sidebarOpen: true,
  currentPage: 'dashboard',

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light'
    set({ theme: newTheme })
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    window.api.setSetting({ key: 'theme', value: newTheme })
  },

  setTheme: (theme) => {
    set({ theme })
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },

  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen })
  },

  setCurrentPage: (page) => {
    set({ currentPage: page })
  }
}))
