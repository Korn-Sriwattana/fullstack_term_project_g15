// src/pages/Signin.tsx
import { useEffect } from "react";
import { useUser } from "../components/userContext";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export default function Signin() {
  const { setUser, setToken } = useUser();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    // ✅ เริ่ม Google OAuth ผ่าน BetterAuth
    await authClient.signIn.social({ provider: "google" });
  };

  // ✅ หลัง redirect กลับมาจาก Google -> ขอ token จาก backend
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/auth/token", {
          credentials: "include", // ใช้ cookie ของ BetterAuth แค่ครั้งเดียว
        });
        if (!res.ok) throw new Error("Failed to fetch token");

        const data = await res.json();
        setUser(data.user);
        setToken(data.token);

        navigate("/profile");
      } catch (err) {
        console.error("Error fetching token:", err);
      }
    };

    // ตรวจว่ามี code (callback จาก Google) หรือไม่
    const params = new URLSearchParams(window.location.search);
    if (params.get("code")) fetchToken();
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
      }}
    >
      <img
        src="src/assets/images/logo.png"
        alt="Lukchang Vibe"
        style={{ width: "120px", marginBottom: "1rem" }}
      />

      <h2 style={{ color: "#a855f7", marginBottom: "2rem" }}>
        Hello Again! This is Lukchang Vibe
      </h2>

      <button
        onClick={handleGoogleLogin}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          backgroundColor: "#fff",
          color: "#444",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "10px 20px",
          cursor: "pointer",
          fontSize: "16px",
          boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
          transition: "0.2s ease",
        }}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          style={{ width: "20px", height: "20px" }}
        />
        Continue with Google
      </button>
    </div>
  );
}
