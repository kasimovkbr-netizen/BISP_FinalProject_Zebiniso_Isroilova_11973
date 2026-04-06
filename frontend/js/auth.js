import { auth } from "./firebase.js";
import { db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  setDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { toast } from "./toast.js";

// 🔥 Flag: registratsiya jarayonida redirect ni to'xtatish uchun
let isRegistering = false;

/* =======================
   AUTH GUARD (FINAL)
======================= */
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;

  const isIndex = path.endsWith("/") || path.endsWith("index.html");

  const isLogin = path.includes("login.html");
  const isRegister = path.includes("register.html");
  const isAuthPage = isLogin || isRegister;

  const isDashboard = path.includes("dashboard.html");

  // 🚫 login bo'lmagan user dashboardga kira olmaydi
  if (!user && isDashboard) {
    window.location.href = "./login.html";
    return;
  }

  // 🔥 Registratsiya jarayonida redirect qilmaslik
  if (isRegistering) {
    return;
  }

  // 🚫 login bo'lgan user login/registerga kirmaydi
  if (user && isAuthPage) {
    window.location.href = "./dashboard.html";
    return;
  }

  // ✅ AUTH PAGE
  const authPage = document.getElementById("authPage");
  if (authPage) {
    authPage.style.display = "block";
  }

  // ✅ INDEX
  if (isIndex) {
    const app = document.getElementById("app");
    if (app) app.style.display = "block";
  }
});

/* =======================
   DOM READY
======================= */
document.addEventListener("DOMContentLoaded", () => {
  /* ========= REGISTER ========= */
  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = registerForm.querySelector("#email").value;
      const password = registerForm.querySelector("#password").value;

      try {
        // 🔥 Registratsiya boshlanmoqda
        isRegistering = true;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        const user = userCredential.user;

        console.log("Creating Firestore doc for:", user.uid);

        // 🔥 Firestore ga yozish (bu tugashini kutamiz)
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "parent",
          createdAt: serverTimestamp(),
        });

        console.log("Firestore document successfully created");

        // 🔥 Endi redirect qilishimiz mumkin
        isRegistering = false;
        window.location.href = "./dashboard.html";
      } catch (err) {
        console.error("REGISTER ERROR:", err);
        toast(friendlyAuthError(err.message), "error");
        isRegistering = false;
      }
    });
  }

  /* ========= LOGIN ========= */
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = loginForm.querySelector("#email").value;
      const password = loginForm.querySelector("#password").value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "./dashboard.html";
      } catch (err) {
        toast(friendlyAuthError(err.message), "error");
      }
    });
  }

  /* ========= FORGOT PASSWORD ========= */
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordSection = document.getElementById(
    "forgotPasswordSection",
  );
  const sendResetBtn = document.getElementById("sendResetBtn");

  if (forgotPasswordLink && forgotPasswordSection) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      forgotPasswordSection.style.display =
        forgotPasswordSection.style.display === "none" ? "block" : "none";
    });
  }

  if (sendResetBtn) {
    sendResetBtn.addEventListener("click", async () => {
      const email = document.getElementById("resetEmail").value;
      const resetMessage = document.getElementById("resetMessage");
      try {
        await sendPasswordResetEmail(auth, email);
        resetMessage.textContent = "✅ Reset email sent! Check your inbox.";
      } catch (err) {
        resetMessage.textContent = err.message;
      }
    });
  }
});

/* =======================
   FRIENDLY ERROR MESSAGES
======================= */
function friendlyAuthError(message) {
  if (!message) return "Something went wrong. Please try again.";
  if (
    message.includes("invalid-credential") ||
    message.includes("wrong-password") ||
    message.includes("user-not-found")
  ) {
    return "Incorrect email or password.";
  }
  if (message.includes("email-already-in-use")) {
    return "This email is already registered.";
  }
  if (message.includes("weak-password")) {
    return "Password must be at least 6 characters.";
  }
  if (message.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (message.includes("too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }
  return message;
}
