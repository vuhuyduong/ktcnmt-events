import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        boxShake: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg) scale(1.06)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translate3d(-8px, -4px, 0) rotate(-6deg) scale(1.1)" },
          "20%, 40%, 60%, 80%": { transform: "translate3d(8px, 4px, 0) rotate(6deg) scale(1.1)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        cardFlipIn: {
          "0%": { transform: "perspective(1000px) rotateY(90deg) scale(0.85)", opacity: "0" },
          "60%": { transform: "perspective(1000px) rotateY(-8deg) scale(1.02)", opacity: "1" },
          "100%": { transform: "perspective(1000px) rotateY(0deg) scale(1)", opacity: "1" },
        },
      },
      animation: {
        "box-shake": "boxShake 0.45s ease-in-out infinite",
        "float-slow": "floatSlow 3s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "card-flip": "cardFlipIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;
