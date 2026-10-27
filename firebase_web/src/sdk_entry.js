// Gói Firebase SDK (bản modular) thành một tệp để trang chạy không cần CDN.
// Dựng lại bằng: npm run build
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, set, push, query, limitToLast, serverTimestamp, remove } from "firebase/database";
window.FB = { initializeApp, getAuth, signInAnonymously, onAuthStateChanged, getDatabase, ref, onValue, set, push, query, limitToLast, serverTimestamp, remove };
