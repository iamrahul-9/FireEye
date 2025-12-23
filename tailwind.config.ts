import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class", // Forces dark mode to look for the 'class' attribute, not system preference
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-inter)"],
                heading: ["var(--font-outfit)"],
            },
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: "var(--color-primary)",
                secondary: "var(--color-secondary)",
            },
        },
    },
    plugins: [],
};
export default config;
