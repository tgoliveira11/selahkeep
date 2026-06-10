import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // Existing auth redirect effects; refactor separately from P0 security work.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
