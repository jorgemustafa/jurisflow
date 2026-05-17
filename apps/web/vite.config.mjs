export default {
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  optimizeDeps: {
    include: ["@hookform/resolvers/zod", "lucide-react", "react", "react-dom/client", "react-hook-form", "react/jsx-runtime"]
  }
};
