// axios-interceptor.js or wherever you have it
import axios from "axios";
import { toast } from "sonner";   // ← Change this

axios.defaults.baseURL = import.meta.env.VITE_API_URL + "/api";

axios.interceptors.response.use(
  response => response,
  error => {
    // ❌ No internet / network issue
    if (!error.response) {
      toast.error("Network error. Please check your internet connection.");
      return Promise.reject(error);
    }

    // Server errors
    if (error.response.status >= 500) {
      toast.error("Server error. Please try again later.");
    }

    // Validation errors
    if (error.response.status === 422) {
      const message = error.response.data?.message || "Validation error";
      toast.error(message);
    }

    return Promise.reject(error);
  }
);