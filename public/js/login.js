document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".toggle-password");
  const input = document.getElementById("password");
  const icon = toggle.querySelector("span");

  toggle.addEventListener("click", () => {
    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";
    icon.textContent = isPassword ? "visibility_off" : "visibility";
  });
});
