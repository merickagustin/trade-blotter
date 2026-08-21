export interface AuthUser {
  username: string
}

export interface LoginModalProps {
  onLogin: (username: string, password: string) => Promise<void>
}
