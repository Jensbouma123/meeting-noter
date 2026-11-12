import type { PasswordStrength } from "@/components/ui/PasswordField/types";

const STRENGTH_LABELS: Record<number, PasswordStrength["label"]> = {
  0: "Very weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Very strong",
};

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) {
    return { score: 0, label: "Very weak" };
  }

  let points = 0;

  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^a-zA-Z0-9]/.test(password)) points += 1;

  // Penalize trivial passwords
  if (password.length < 8) {
    points = Math.min(points, 1);
  }
  if (/^[a-zA-Z]+$/.test(password) || /^\d+$/.test(password)) {
    points = Math.max(0, points - 1);
  }
  if (/^(.)\1+$/.test(password) || /^(123456|password|qwerty|admin)/i.test(password)) {
    points = Math.min(points, 1);
  }

  let score = 0;
  if (points <= 1) score = 0;
  else if (points === 2) score = 1;
  else if (points === 3 || points === 4) score = 2;
  else if (points === 5) score = 3;
  else score = 4;

  return {
    score,
    label: STRENGTH_LABELS[score],
  };
}
