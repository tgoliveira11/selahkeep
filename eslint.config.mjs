import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: ["coverage/**", "public/swagger-ui/**", "public/worklets/**", ".claude/**"],
  },
  ...nextConfig,
  {
    rules: {
      // Existing auth redirect effects; refactor separately from P0 security work.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
