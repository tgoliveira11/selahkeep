"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: (config: Record<string, unknown>) => void;
  }
}

export function SwaggerUi() {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/swagger-ui/swagger-ui.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "/swagger-ui/swagger-ui-bundle.js";
    script.async = true;
    script.onload = () => {
      window.SwaggerUIBundle?.({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
      });
    };
    document.head.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  return <div id="swagger-ui" className="min-h-screen bg-white" />;
}
