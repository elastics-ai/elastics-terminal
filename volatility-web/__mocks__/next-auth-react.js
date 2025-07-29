import React from 'react';

export const useSession = jest.fn(() => ({
  data: {
    user: {
      name: 'Test User',
      email: 'test@example.com',
    },
  },
  status: 'authenticated',
}));

export const signIn = jest.fn();
export const signOut = jest.fn();

export const SessionProvider = ({ children }) => React.createElement('div', {}, children);

export const getSession = jest.fn();
export const getCsrfToken = jest.fn();
export const getProviders = jest.fn();