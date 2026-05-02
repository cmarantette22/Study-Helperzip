// @refresh reset
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useGetMe, useLogin, useLogout, useChangePassword } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  mustChangePassword: boolean;
  subscriptionStatus?: string | null;
  planType?: string | null;
  pauseDate?: string | null;
  handle?: string | null;
  school?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: meData, isLoading: meLoading, refetch: refetchUser } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  useEffect(() => {
    if (!meLoading) {
      if (meData) {
        setUser(meData as AuthUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [meData, meLoading]);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const changePasswordMutation = useChangePassword();

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const result = await loginMutation.mutateAsync({ data: { email, password } });
    const authUser = result as unknown as AuthUser;
    setUser(authUser);
    return authUser;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    setUser(null);
    queryClient.clear();
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const result = await changePasswordMutation.mutateAsync({
      data: { currentPassword, newPassword },
    });
    setUser(result as unknown as AuthUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword, refetchUser: () => refetchUser() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
