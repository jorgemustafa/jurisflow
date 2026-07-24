import animate from "tailwindcss-animate";

const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

/** @type {import("tailwindcss").Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px"
      },
      colors: {
        white: "var(--color-white)",
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: withOpacity("--ring-accent-rgb"),
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary-800)",
          foreground: "var(--color-text-inverse)",
          hover: "var(--color-primary-850)"
        },
        destructive: {
          DEFAULT: "var(--color-danger)",
          foreground: "var(--color-text-inverse)"
        },
        muted: {
          DEFAULT: "var(--color-surface-muted)",
          foreground: "var(--color-text)"
        }
      }
    }
  },
  plugins: [animate]
};
