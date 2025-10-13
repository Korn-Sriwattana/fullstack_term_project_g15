import { authClient } from "../lib/auth-client";
import { useState } from "react";

export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({ provider: "google" });
  };

  const handleEmailSignUp = async () => {
    await authClient.signUp.email({
      email,
      password,
      name: "New User",
    });
  };

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
        style={{ width: "100px", marginBottom: "1rem" }}
      />

      <h2
        style={{
          color: "#a855f7",
          marginBottom: "2rem",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Hello Again! This is Lukchang Vibe
      </h2>

      {/* ✅ กล่องรวม input + ปุ่ม กำหนดความกว้างเท่ากัน */}
      <div
        style={{
          width: "400px", // ปรับให้เท่าความยาวข้อความหัวข้อ
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            backgroundColor: "#fafafa",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            backgroundColor: "#fafafa",
          }}
        />

        {/* ปุ่ม Email */}
        <button
          onClick={handleEmailSignUp}
          style={{
            width: "100%",
            backgroundColor: "#a855f7",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "12px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Sign Up/Log In with Email
        </button>

        <hr
          style={{
            width: "100%",
            border: "none",
            borderTop: "1px solid #ddd",
            margin: "10px 0",
          }}
        />

        {/* ปุ่ม Google */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            backgroundColor: "#a855f7",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "12px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
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
    </div>
  );
}
