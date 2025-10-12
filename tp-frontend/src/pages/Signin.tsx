import { authClient } from "../lib/auth-client";

export default function Signin() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({ provider: "google" });
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
      {/* โลโก้เว็บ */}
      <img
        src="src\assets\images\logo.png"
        alt="Lukchang Vibe"
        style={{ width: "120px", marginBottom: "1rem" }}
      />

      <h2 style={{ color: "#a855f7", marginBottom: "2rem" }}>
        Hello Again! This is Lukchang Vibe
      </h2>

      {/* ปุ่ม Google Login */}
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
