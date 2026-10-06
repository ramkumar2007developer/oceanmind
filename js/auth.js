/* ==========================================================================
   OCEANMIND - AUTHENTICATION & FORM VALIDATION MODULE (auth.js)
   Handles Login & Register page validation, multi-step tabs, and DB mock session.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Password Visibility Toggle
  const passwordToggles = document.querySelectorAll(".password-toggle");
  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input =
        toggle.previousElementSibling ||
        toggle.parentElement.querySelector("input");
      if (input) {
        const type =
          input.getAttribute("type") === "password" ? "text" : "password";
        input.setAttribute("type", type);
        toggle.innerHTML = type === "password" ? "👁️" : "🙈";
      }
    });
  });

  // Multi-step Registration Tab Navigation
  const nextStepBtn = document.getElementById("next-step-btn");
  const prevStepBtn = document.getElementById("prev-step-btn");
  const submitRegBtn = document.getElementById("submit-reg-btn");

  if (nextStepBtn) {
    let currentStep = 1;
    const maxSteps = 3;

    function updateStepUI() {
      // Toggle form step containers
      document.querySelectorAll(".form-step").forEach((el, idx) => {
        el.style.display = idx + 1 === currentStep ? "block" : "none";
      });

      // Update Step Indicators
      document.querySelectorAll(".step-indicator").forEach((el, idx) => {
        const stepNum = idx + 1;
        el.classList.remove("active", "completed");
        if (stepNum === currentStep) {
          el.classList.add("active");
        } else if (stepNum < currentStep) {
          el.classList.add("completed");
        }
      });

      // Button visibilities
      if (prevStepBtn)
        prevStepBtn.style.display = currentStep === 1 ? "none" : "inline-flex";
      if (nextStepBtn)
        nextStepBtn.style.display =
          currentStep === maxSteps ? "none" : "inline-flex";
      if (submitRegBtn)
        submitRegBtn.style.display =
          currentStep === maxSteps ? "inline-flex" : "none";
    }

    nextStepBtn.addEventListener("click", () => {
      if (validateStep(currentStep)) {
        currentStep = Math.min(currentStep + 1, maxSteps);
        updateStepUI();
      }
    });

    if (prevStepBtn) {
      prevStepBtn.addEventListener("click", () => {
        currentStep = Math.max(currentStep - 1, 1);
        updateStepUI();
      });
    }

    updateStepUI();
  }

  // Step Validation Helper
  function validateStep(step) {
    let isValid = true;
    const currentStepContainer = document.querySelector(
      `.form-step[data-step="${step}"]`,
    );
    if (!currentStepContainer) return true;

    const requiredInputs = currentStepContainer.querySelectorAll("[required]");
    requiredInputs.forEach((input) => {
      if (!input.value.trim()) {
        isValid = false;
        input.classList.add("is-invalid");
        showToast(
          `Please complete required field: ${input.getAttribute("placeholder") || "Field"}`,
          "warning",
        );
      } else {
        input.classList.remove("is-invalid");
      }
    });

    // Aadhaar 12-digit check
    const aadhaarInput = document.getElementById("aadhaar_number");
    if (step === 1 && aadhaarInput && aadhaarInput.value) {
      const cleanVal = aadhaarInput.value.replace(/\s+/g, "");
      if (!/^\d{12}$/.test(cleanVal)) {
        isValid = false;
        showToast("Aadhaar Number must be exactly 12 digits", "danger");
      }
    }

    return isValid;
  }

  // Form Submit Listeners
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      showToast("Authenticating with OceanMind Border Command...", "info");

      try {
        const res = await authApi.login({ email, password });
        localStorage.setItem("access_token", res.access_token);

        // Fetch current user details via GET /api/auth/me
        try {
          const me = await authApi.getMe();
          localStorage.setItem(
            "oceanmind_user",
            JSON.stringify({
              email: me.email,
              role: me.role,
              first_name: me.first_name,
              last_name: me.last_name,
              user_id: me.user_id,
            }),
          );
        } catch (meErr) {
          console.warn("Could not fetch user details:", meErr);
        }

        showToast("Login successful! Loading command console...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } catch (err) {
        showToast(err.message || "Login failed", "danger");
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateStep(3)) return;

      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById(
        "reg-confirm-password",
      ).value;

      if (password !== confirmPassword) {
        showToast("Passwords do not match!", "danger");
        return;
      }

      const rawAadhaar = document.getElementById("aadhaar_number").value || "";
      const cleanAadhaar = rawAadhaar.replace(/\D/g, "");
      const rawPhone = document.getElementById("phone").value || "";
      const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

      const rawRole = document.getElementById("role")?.value || "fisherman";
      let role = "fisherman";
      if (rawRole.toLowerCase().includes("owner")) role = "owner";
      else if (rawRole.toLowerCase().includes("authority")) role = "authority";

      const userData = {
        first_name: document.getElementById("first_name").value.trim(),
        last_name: document.getElementById("last_name").value.trim(),
        date_of_birth: document.getElementById("date_of_birth").value,
        nationality: document.getElementById("nationality").value.trim(),
        state: document.getElementById("state").value.trim(),
        district: document.getElementById("district").value.trim(),
        aadhaar_number: cleanAadhaar,
        phone: cleanPhone,
        email: document.getElementById("email").value.trim(),
        password: password,
        role: role,
      };

      showToast(
        "Registering vessel & fisherman into PostgreSQL schema...",
        "info",
      );

      try {
        await authApi.signup(userData);

        try {
          const loginRes = await authApi.login({
            email: userData.email,
            password: userData.password,
          });
          localStorage.setItem("access_token", loginRes.access_token);

          try {
            const me = await authApi.getMe();
            localStorage.setItem(
              "oceanmind_user",
              JSON.stringify({
                email: me.email,
                role: me.role,
                first_name: me.first_name,
                last_name: me.last_name,
                user_id: me.user_id,
              }),
            );
          } catch (meErr) {
            console.warn("Could not fetch signed-in user details:", meErr);
          }

          showToast(
            "Registration successful! Welcome to your dashboard.",
            "success",
          );
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1000);
        } catch (loginErr) {
          showToast(
            "Registration successful! Please login with your credentials.",
            "success",
          );
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1500);
        }
      } catch (err) {
        showToast(err.message || "Registration failed", "danger");
      }
    });
  }
});

// Global Toast Utility
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span>${message}</span>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
