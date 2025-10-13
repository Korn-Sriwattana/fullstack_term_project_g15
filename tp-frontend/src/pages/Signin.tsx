import { authClient } from "../lib/auth-client";
import styles from "../assets/styles/Signin.module.css";
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
    <div className={styles.container}>
      <img
        src="/icon-web-more.png"
        alt="Lukchang Vibe"
        className={styles.logo}
      />
      <h2 className={styles.title}>Hello Again! This is Lukchang Vibe</h2>
      <button onClick={handleGoogleLogin} className={styles.googleBtn}>
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className={styles.googleIcon}
        />
        Continue with Google
      </button>
    </div>
  );
}
