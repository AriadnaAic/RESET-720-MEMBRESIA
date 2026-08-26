// ⚠️ PEGA AQUÍ TUS LLAVES DE FIREBASE ⚠️
// Las obtienes en: Firebase Console > Configuración del proyecto > Tus apps > Config
// Instrucciones completas en README.md, Paso 2.
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1lisPYpj13LEj4rEHTP9QuSh0VU8zOGk",
authDomain: "reset-720.firebaseapp.com",
projectId: "reset-720",
storageBucket: "reset-720.firebasestorage.app",
messagingSenderId: "746156796611",
appId: "1:746156796611:web:131e02d9ceb2b800b41076",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ============ Helpers de cuentas ============
   Los clientes inician sesión con "nombre y primer apellido" (sin correo real).
   Por dentro, Firebase Auth necesita un correo, así que se arma uno interno
   con ese nombre + un dominio ficticio. Es un truco válido y común para
   apps internas; si más adelante quieres recuperación de contraseña por
   correo real, cambia esto por el email real del cliente (ver README).
*/
function nombreAEmail(nombre) {
  const limpio = nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "");
  return `${limpio}@clientes.reset720.app`;
}

export async function registrarCliente(nombre, password) {
  const email = nombreAEmail(nombre);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "usuarios", cred.user.uid), {
    nombre: nombre.trim(),
    role: "cliente",
  });
  await setDoc(doc(db, "datos", cred.user.uid), { ingresos: [], gastos: [] });
  return cred.user.uid;
}

export async function entrarCliente(nombre, password) {
  const email = nombreAEmail(nombre);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

export async function entrarCoach(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

export async function salir() {
  await signOut(auth);
}

export function alCambiarSesion(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function obtenerPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data() : null;
}

export async function obtenerDatos(uid) {
  const snap = await getDoc(doc(db, "datos", uid));
  return snap.exists() ? snap.data() : { ingresos: [], gastos: [] };
}

export async function guardarDatos(uid, data) {
  await setDoc(doc(db, "datos", uid), data);
}

// Solo el coach tiene permiso (ver firestore.rules) de leer todos los clientes.
export async function obtenerTodosLosClientes() {
  const q = query(collection(db, "usuarios"), where("role", "==", "cliente"));
  const snap = await getDocs(q);
  const clientes = [];
  for (const d of snap.docs) {
    const datos = await obtenerDatos(d.id);
    clientes.push({ uid: d.id, nombre: d.data().nombre, ...datos });
  }
  return clientes;
}
