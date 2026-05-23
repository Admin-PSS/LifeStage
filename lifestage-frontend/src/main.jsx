import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import AuthPage from './AuthPage.jsx'
import LifeStagePlatform from './lifestage-platform.jsx'
import ProfilePage from './ProfilePage.jsx'
import TermsPage from './TermsPage.jsx'
import PrivacyPage from './PrivacyPage.jsx'
import { ConfirmEmailPage } from './EmailConfirmation.jsx'
import { getUser, getToken, logout, saveAuth } from './auth.js'

function App() {
  const [user, setUser] = useState(() => {
    // Process OAuth callback first so saveAuth() runs before getUser()
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      const storedUser = {
        userName:    params.get("userName")    || params.get("userId") || "user",
        displayName: params.get("displayName") || "User",
      };
      saveAuth({ accessToken: token, user: storedUser });
      window.history.replaceState({}, "", "/");
    }
    return getUser();
  });
  const [profileUsername, setProfileUsername] = useState(null);
  const [page, setPage] = useState(() => {
    const path = window.location.pathname;
    if (path === "/terms")   return "terms";
    if (path === "/privacy") return "privacy";
    if (new URLSearchParams(window.location.search).get("token")) return "feed";
    if (path === "/confirm-email") return "confirm-email";
    return "feed";
  });

  // Listen for internal navigation events from Terms/Privacy pages
  useEffect(() => {
    const handler = (e) => {
      setPage(e.detail);
      window.history.pushState({}, "", "/" + e.detail);
    };
    window.addEventListener("ls:navigate", handler);
    return () => window.removeEventListener("ls:navigate", handler);
  }, []);

  // Backfill missing profile fields (email, emailConfirmed, real userName/displayName)
  useEffect(() => {
    const token = getToken();
    if (!token || !user) return;
    // Always fetch if userName looks like a GUID or displayName is placeholder
    const looksLikeGuid = /^[0-9a-f-]{36}$/i.test(user.userName || "");
    const missingEmail = !user.email || user.emailConfirmed === undefined;
    if (!looksLikeGuid && !missingEmail) return;
    fetch((import.meta.env.VITE_API_URL || "") + "/api/users/me", { headers: { Authorization: "Bearer " + token } })
      .then(r => {
        if (r.status === 401) { logout(); setUser(null); return null; }
        return r.ok ? r.json() : null;
      })
      .then(me => {
        if (!me) return;
        const updated = {
          ...user,
          email:          me.email          ?? user.email          ?? "",
          emailConfirmed: me.emailConfirmed ?? false,
          userName:       me.userName       ?? user.userName,
          displayName:    me.displayName    ?? user.displayName,
        };
        localStorage.setItem("ls_user", JSON.stringify(updated));
        setUser(updated);
      })
      .catch(() => {});
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setPage("feed");
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setPage("feed");
  };

  const handleUserUpdate = (updated) => setUser(updated);

  const goBack = () => { setPage("feed"); setProfileUsername(null); window.history.pushState({}, "", "/"); };

  const goToProfile = (username) => {
    setProfileUsername(username || null);
    setPage("profile");
  };

  // Legal pages — accessible without login
  if (page === "terms")   return <TermsPage   onBack={goBack} />;
  if (page === "privacy") return <PrivacyPage onBack={goBack} />;

  // Email confirmation page
  if (page === "confirm-email") {
    return (
      <ConfirmEmailPage
        onSuccess={(authData) => {
          if (authData?.user) {
            saveAuth(authData);
            setUser(authData.user);
          }
          window.history.replaceState({}, "", "/");
          setPage("feed");
        }}
      />
    );
  }

  // Not logged in
  if (!user || !getToken()) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  // Profile page
  if (page === "profile") {
    return (
      <ProfilePage
        user={user}
        viewUsername={profileUsername}
        onBack={goBack}
        onUserUpdate={handleUserUpdate}
        onProfileClick={goToProfile}
      />
    );
  }

  // Main feed
  return (
    <LifeStagePlatform
      user={user}
      onLogout={handleLogout}
      onProfile={goToProfile}
    />
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
