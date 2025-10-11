import { useEffect } from "react";
import { authClient } from "../lib/auth-client";

export default function Signin() {
  // ✅ ใช้ useSession แบบถูกต้อง
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      // ถ้ามี session แล้วให้ redirect กลับหน้าแรก
      window.location.href = "/";
    }
  }, [session]);

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
    });
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Sign in</h2>
      <button
        onClick={handleGoogleLogin}
        style={{
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "5px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Continue with Google
      </button>
    </div>
  );
}
