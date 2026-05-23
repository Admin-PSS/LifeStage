// Save after login/register
export const saveAuth = (authResponse) => {
  const user = {
    ...authResponse.user,
    email: authResponse.email ?? authResponse.user?.email ?? "",
    emailConfirmed: authResponse.emailConfirmed ?? false,
  };
  localStorage.setItem("ls_token", authResponse.accessToken);
  localStorage.setItem("ls_user", JSON.stringify(user));
};

// Get token for API calls
export const getToken = () => localStorage.getItem("ls_token");

// Get current user
export const getUser = () => {
  const u = localStorage.getItem("ls_user");
  return u ? JSON.parse(u) : null;
};

// Logout
export const logout = () => {
  localStorage.removeItem("ls_token");
  localStorage.removeItem("ls_user");
};

export const isLoggedIn = () => !!getToken();
