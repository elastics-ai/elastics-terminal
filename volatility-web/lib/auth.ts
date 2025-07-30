import NextAuth from "next-auth"
import AzureAd from "next-auth/providers/azure-ad"
import Credentials from "next-auth/providers/credentials"
import type { NextAuthConfig } from "next-auth"

// Check if Azure AD configuration is available
const hasAzureConfig = !!(
  process.env.AUTH_AZURE_AD_CLIENT_ID &&
  process.env.AUTH_AZURE_AD_CLIENT_SECRET &&
  process.env.AUTH_AZURE_AD_TENANT_ID
)

// Use Azure AD if configured, otherwise fall back to local development mode
const providers = hasAzureConfig 
  ? [
      AzureAd({
        clientId: process.env.AUTH_AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AUTH_AZURE_AD_TENANT_ID!,
      })
    ]
  : [
      // Local development provider - allows default user
      Credentials({
        id: "local-dev",
        name: "Local Development",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          // For local development, accept the default user
          if (
            credentials?.email === "wojciech@elastics.ai" || 
            credentials?.email === "wojtek@elastics.ai"
          ) {
            return {
              id: "local-dev-user",
              name: "Wojtek",
              email: "wojciech@elastics.ai",
              image: null,
            }
          }
          return null
        },
      })
    ]

export const config = {
  providers,
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and profile info to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      if (profile) {
        token.profile = profile
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user info from a provider
      session.accessToken = token.accessToken as string
      session.idToken = token.idToken as string
      session.refreshToken = token.refreshToken as string
      session.expiresAt = token.expiresAt as number
      
      // Add Azure AD specific user information
      if (token.profile) {
        const profile = token.profile as any
        session.user.id = profile.sub || profile.oid
        session.user.tenantId = profile.tid
        session.user.upn = profile.upn
        session.user.roles = profile.roles || []
      }
      
      return session
    },
    async signIn({ user, account, profile }) {
      // You can add custom sign-in logic here
      // For example, check if user is allowed to access the application
      return true
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      try {
        if (new URL(url).origin === baseUrl) return url
      } catch (error) {
        // Handle invalid URLs by returning baseUrl
        return baseUrl
      }
      return baseUrl
    }
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)