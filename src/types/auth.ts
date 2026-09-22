// User types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  cultivationType?: string;
  cropName?: string;
  cultivationAddress?: string;
  isSeller?: boolean;
  isAdmin?: boolean;
  profileImageUrl?: string;
}

// Auth request/response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
  phoneNumber: string;
}

export interface SignInResponseData {
  name: string;
  refreshToken?: string;
  accessToken?: string;
}

export interface AuthResponse {
  user: User;
}

export interface OAuthSignInResponse {
  isNewUser: boolean;
  name: string;
}

// User statistics
export interface UserStats {
  totalDiagnoses: number;
  totalRecommendations: number;
  healthyBees: number;
  diseaseDetected: number;
}
