import animate from "tailwindcss-animate";

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
        border: "#cad3dd",
        input: "#cad3dd",
        ring: "#0f766e",
        background: "#f4f6f8",
        foreground: "#1f2933",
        primary: {
          DEFAULT: "#0f766e",
          foreground: "#ffffff"
        },
        destructive: {
          DEFAULT: "#b42318",
          foreground: "#ffffff"
        },
        muted: {
          DEFAULT: "#eef3f7",
          foreground: "#52616f"
        }
      }
    }
  },
  plugins: [animate]
};
