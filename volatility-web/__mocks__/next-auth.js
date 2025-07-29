export default function NextAuth() {
  return {
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    unstable_update: jest.fn(),
  };
}

export const handlers = {
  GET: jest.fn(),
  POST: jest.fn(),
};

export const auth = jest.fn();
export const signIn = jest.fn();
export const signOut = jest.fn();
export const unstable_update = jest.fn();