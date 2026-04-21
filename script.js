(() => {
  'use strict';

  // ── DOM refs ──
  const scenePanel = document.getElementById('scenePanel');
  const yetiWrapper = document.getElementById('yetiWrapper');
  const yetiBody = document.getElementById('yetiBody');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePwd = document.getElementById('togglePwd');

  // ── State ──
  const state = {
    mouseX: 0,           // normalized -1 to 1
    mouseY: 0,
    targetX: 0,
    targetY: 0,
    currentX: 0,         // lerped values
    currentY: 0,
    isPasswordFocused: false,
    isTypingEmail: false,
  };

  // ── Config ──
  const BODY_DAMPING = 0.06;       // slow, weighted body movement
  const BODY_MAX_ROTATE = 10;      // degrees
  const BODY_MAX_SHIFT = 15;       // pixels

  // ── Lerp helper ──
  function lerp(current, target, factor) {
    return current + (target - current) * factor;
  }

  // ── Mouse tracking ──
  document.addEventListener('mousemove', (e) => {
    // Normalize to -1..1 based on full viewport
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // ── Focus tracking: Yeti looks at what user is typing ──
  emailInput.addEventListener('focus', () => {
    state.isTypingEmail = true;
    state.isPasswordFocused = false;
    yetiWrapper.classList.remove('shy');
    // Target: look toward the form (right side, middle height)
    state.targetX = 0.6;
    state.targetY = 0.1;
  });

  emailInput.addEventListener('blur', () => {
    state.isTypingEmail = false;
  });

  // Email input: eyes follow cursor position in the field
  emailInput.addEventListener('input', () => {
    const len = emailInput.value.length;
    // Shift gaze right as they type more characters
    const progress = Math.min(len / 30, 1);
    state.targetX = 0.3 + progress * 0.5;
  });

  passwordInput.addEventListener('focus', () => {
    state.isPasswordFocused = true;
    state.isTypingEmail = false;
    yetiWrapper.classList.add('shy');
    // Yeti looks down/away — shy about password
    state.targetX = 0;
    state.targetY = 0.5;
  });

  passwordInput.addEventListener('blur', () => {
    state.isPasswordFocused = false;
    yetiWrapper.classList.remove('shy');
  });

  // ── Password toggle ──
  togglePwd.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    if (isPassword) {
      // Yeti peeks!
      yetiWrapper.classList.remove('shy');
      yetiWrapper.classList.add('peek');
      state.targetY = 0.2;
      setTimeout(() => yetiWrapper.classList.remove('peek'), 300);
    } else {
      yetiWrapper.classList.add('shy');
      state.targetY = 0.5;
    }
  });

  // ── Animation loop ──
  function animate() {
    // If user is interacting with form fields, use fixed targets
    // Otherwise, follow mouse
    if (!state.isTypingEmail && !state.isPasswordFocused) {
      state.targetX = state.mouseX;
      state.targetY = state.mouseY;
    }

    // Lerp body
    state.currentX = lerp(state.currentX, state.targetX, BODY_DAMPING);
    state.currentY = lerp(state.currentY, state.targetY, BODY_DAMPING);

    // Apply body transform: tilt + shift for parallax effect
    const bodyRotateY = state.currentX * BODY_MAX_ROTATE;
    const bodyRotateX = -state.currentY * (BODY_MAX_ROTATE * 0.5);
    const bodyShiftX = state.currentX * BODY_MAX_SHIFT;
    const bodyShiftY = state.currentY * (BODY_MAX_SHIFT * 0.5);

    yetiBody.style.transform = `
      translateX(${bodyShiftX}px)
      translateY(${bodyShiftY}px)
      rotateY(${bodyRotateY}deg)
      rotateX(${bodyRotateX}deg)
    `;

    requestAnimationFrame(animate);
  }

  // ── Idle breathing animation ──
  let breathPhase = 0;
  function breathe() {
    breathPhase += 0.02;
    const breathScale = 1 + Math.sin(breathPhase) * 0.008;
    const breathY = Math.sin(breathPhase) * 2;
    yetiWrapper.style.transform = `translateX(-50%) translateY(${breathY}px) scale(${breathScale})`;
    requestAnimationFrame(breathe);
  }

  // ── Kick off ──
  animate();
  breathe();
})();
