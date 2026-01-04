import { supabase } from "./config.js";

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const messageDiv = document.getElementById("message");

// SIGNUP
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
  } else {
    alert("Signup successful! Check your email.");
  }
});

// LOGIN + Redirect
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    messageDiv.textContent = error.message;
    messageDiv.style.color = "red";
  } else {
    messageDiv.textContent = "Login Successful!";
    messageDiv.style.color = "lightgreen";

    
  }
});