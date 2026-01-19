import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useNavigate, useSearchParams } from "react-router-dom";

const AuthPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialMode = params.get("mode") || "register";
  const [mode, setMode] = useState(initialMode);

  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // حافظ على URL متزامن
    setParams({ mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const getStrength = () => {
    if (password.length > 10 && /[A-Z]/.test(password) && /\d/.test(password)) return "Strong";
    if (password.length > 6) return "Medium";
    if (password.length > 0) return "Weak";
    return "";
  };

  const strength = getStrength();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);

      // بعد التسجيل → Big Five
      navigate("/big5");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);

      const hasCompletedBig5 = localStorage.getItem("big5_completed") === "true";
      const hasCompletedProfile = localStorage.getItem("profile_completed") === "true";

      if (!hasCompletedBig5) return navigate("/big5");
      if (!hasCompletedProfile) return navigate("/profile");
      return navigate("/dashboard");
    } catch (err) {
      if (err.code === "auth/user-not-found") setError("No account found. Please register.");
      else if (err.code === "auth/wrong-password") setError("Incorrect password.");
      else setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060318] flex items-center justify-center overflow-hidden font-inter">
      <div className="absolute top-1/3 left-1/2 w-[500px] h-[500px] bg-[#2b62d1]/40 rounded-full blur-[150px] -translate-x-1/2"></div>

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-xl">
        <h1 className="text-4xl font-space font-bold text-white text-center mb-6">
          {mode === "register" ? "Create Account" : "Welcome Back"}
        </h1>

        <form className="flex flex-col gap-5" onSubmit={mode === "register" ? handleRegister : handleLogin}>
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/50 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/50 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {mode === "register" && strength && (
            <p
              className={`text-sm ${
                strength === "Strong" ? "text-green-400" : strength === "Medium" ? "text-yellow-400" : "text-red-400"
              }`}
            >
              Password Strength: {strength}
            </p>
          )}

          {mode === "register" && (
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/50 focus:outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold hover:scale-[1.02] transition disabled:opacity-50"
          >
            {loading ? "Processing..." : mode === "register" ? "Create Account" : "Login"}
          </button>
        </form>

        <p className="text-center text-white/70 mt-6">
          {mode === "register" ? (
            <>
              Already have an account?{" "}
              <span onClick={() => setMode("login")} className="text-cyan-400 cursor-pointer hover:underline">
                Login
              </span>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <span onClick={() => setMode("register")} className="text-cyan-400 cursor-pointer hover:underline">
                Register
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
