import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "");

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
	});
}

createRoot(document.getElementById("root")!).render(<App />);
