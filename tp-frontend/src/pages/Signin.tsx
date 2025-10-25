import { authClient } from "../lib/auth-client";
import styles from "../assets/styles/Signin.module.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // ✅ ใช้สำหรับ redirect

  const handleGoogleLogin = async () => {
  await authClient.signIn.social({
    provider: "google",
    disableRedirect: false,
    callbackURL: "http://localhost:5173/", // ✅ หลัง login สำเร็จ
  });
};


  const handleEmailSignUp = async () => {
    try {
      // ✅ ตรวจสอบว่า email ไม่ว่าง
      if (!email) {
        alert("❌ กรุณากรอกอีเมลก่อน");
        return;
      }

      // ✅ ตรวจสอบรูปแบบอีเมลเบื้องต้น
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        alert(
          "❌ รูปแบบอีเมลไม่ถูกต้อง (ต้องมี '@' และ '.com' เช่น example@gmail.com)"
        );
        return;
      }

      // ✅ ตรวจสอบ password อย่างน้อย 4 ตัวอักษร
      if (!password || password.length < 4) {
        alert("❌ รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
        return;
      }

      const username = email.split("@")[0];

      const res = await fetch("http://localhost:3000/api/normal-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: username }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ " + data.message);
        localStorage.setItem("email", email); // ✅ บันทึก email ไว้ใช้ตรวจใน Home
        navigate("/");
      } else {
        alert("❌ " + (data.error || "Signup failed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <img
        src="/icon-web-more.png"
        alt="Lukchang Vibe"
        className={styles.logo}
      />

      <h2 className={styles.title}>Hello Again! This is Lukchang Vibe</h2>

      <div className={styles.formBox}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />

        <button onClick={handleEmailSignUp} className={styles.primaryBtn}>
          Sign Up/Log In with Email
        </button>

        <hr className={styles.divider} />

        <button onClick={handleGoogleLogin} className={styles.primaryBtn}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className={styles.googleIcon}
          />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
