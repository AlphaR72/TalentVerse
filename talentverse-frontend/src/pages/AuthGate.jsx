import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../firebase/firebase";

const AuthGate = ({ children }) => {
  const user = auth.currentUser;
  const { pathname } = useLocation();

  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  const hasCompletedBig5 = localStorage.getItem("big5_completed") === "true";
  const hasCompletedProfile = localStorage.getItem("profile_completed") === "true";

  // مسارات مسموحة قبل Big5
  const allowedWithoutBig5 = ["/big5", "/big5-results", "/auth", "/"];

  // مسارات مسموحة قبل Profile
  const allowedWithoutProfile = ["/big5", "/big5-results", "/profile", "/auth", "/"];

  // 1) صفحات Big5 مسموحة دائمًا
  if (pathname.startsWith("/big5")) return children;

  // 2) إذا Big5 مو مكتمل → إجبار على /big5
  if (!hasCompletedBig5 && !allowedWithoutBig5.includes(pathname)) {
    return <Navigate to="/big5" replace />;
  }

  // 3) إذا Big5 مكتمل و Profile مو مكتمل → إجبار على /profile
  if (hasCompletedBig5 && !hasCompletedProfile && !allowedWithoutProfile.includes(pathname)) {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default AuthGate;
