// SpendSwift Application Configuration

export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api',
    timeout: 10000,
    retries: 3,
  },

  // Authentication
  auth: {
    tokenKey: 'auth_token',
    refreshThreshold: 300, // 5 minutes before expiry
  },

  // Demo Credentials (for development only)
  demo: {
    admin: {
      email: 'admin@spendswift.com',
      password: 'password123',
      role: 'ADMIN'
    },
    manager: {
      email: 'sarah.johnson@spendswift.com',
      password: 'password123',
      role: 'DIRECT_MANAGER'
    },
    user: {
      email: 'mohamed.ali@spendswift.com',
      password: 'password123',
      role: 'USER'
    }
  },

  // App Information
  app: {
    name: 'SpendSwift',
    version: '1.0.0',
    description: 'Purchase Request Management System',
  },

  // Features
  features: {
    notifications: true,
    realTimeUpdates: false,
    fileUploads: true,
    analytics: true,
  },

  // UI Configuration
  ui: {
    theme: 'system', // 'light' | 'dark' | 'system'
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ar'],
    itemsPerPage: 15,
  },

  // Development
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
