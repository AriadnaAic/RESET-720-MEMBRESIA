import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LogOut, User, Lock, Plus, Minus, Clock, RefreshCw, ChevronDown, ChevronUp, Search, ShieldCheck, Mail } from "lucide-react";
import {
  registrarCliente, entrarCliente, entrarCoach, salir, alCambiarSesion,
  obtenerPerfil, obtenerDatos, guardarDatos, obtenerTodosLosClientes,
} from "./firebase.js";

/* ============ Utilidades ============ */
const nowISO = () => new Date().toISOString();
function fmtHora(iso) { return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); }
function fmtDiaCorto(iso) { return new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }); }
function startOfWeek(d) { const date = new Date(d); const day = date.getDay(); const diff = (day === 0 ? -6 : 1) - day; date.setDate(date.getDate() + diff); date.setHours(0,0,0,0); return date; }
function endOfWeek(d) { const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return e; }
function enSemana(iso, start, end) { const t = new Date(iso).getTime(); return t >= start.getTime() && t <= end.getTime(); }
function money(n) { return (n||0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }); }

const TIPOS_INGRESO = [
  { id: "sueldo", label: "Sueldo", emoji: "💰" },
  { id: "venta", label: "Venta", emoji: "🛍️" },
  { id: "extra", label: "Extra", emoji: "🎁" },
  { id: "otro", label: "Otro", emoji: "✨" },
];
const CATEGORIAS_GASTO = [
  { id: "comida", label: "Comida", emoji: "🍔" },
  { id: "transporte", label: "Transporte", emoji: "🚌" },
  { id: "hogar", label: "Hogar", emoji: "🏠" },
  { id: "diversion", label: "Diversión", emoji: "🎉" },
  { id: "salud", label: "Salud", emoji: "💊" },
  { id: "otro", label: "Otro", emoji: "📦" },
];
const CHIPS_INGRESO = [100, 200, 500, 1000];
const CHIPS_GASTO = [20, 50, 100, 200];

/* ============ App raíz: escucha sesión real de Firebase ============ */
export default function App() {
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [perfil, setPerfil] = useState(null); // { uid, nombre, role }

  useEffect(() => {
    const unsub = alCambiarSesion(async (user) => {
      if (!user) { setPerfil(null); setCargandoSesion(false); return; }
      const datosPerfil = await obtenerPerfil(user.uid);
      if (datosPerfil) setPerfil({ uid: user.uid, ...datosPerfil });
      setCargandoSesion(false);
    });
    return unsub;
  }, []);

  if (cargandoSesion) return <div style={loadingStyle}>Cargando…</div>;
  if (!perfil) return <Login onLogin={setPerfil} />;
  if (perfil.role === "coach") return <CoachDashboard nombre={perfil.nombre} onLogout={async () => { await salir(); setPerfil(null); }} />;
  return <Panel uid={perfil.uid} nombre={perfil.nombre} onLogout={async () => { await salir(); setPerfil(null); }} />;
}

/* ============ Login ============ */
function Login({ onLogin }) {
  const [rol, setRol] = useState("cliente");
  const [modo, setModo] = useState("login");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [emailCoach, setEmailCoach] = useState("");
  const [passCoach, setPassCoach] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function submitCliente() {
    setError("");
    if (nombre.trim().split(/\s+/).filter(Boolean).length < 2) {
      setError("Escribe tu nombre y tu primer apellido, ej: Ana Torres 🙂");
      return;
    }
    if (!password) { setError("Falta tu contraseña 👀"); return; }
    setCargando(true);
    try {
      let uid, perfil;
      if (modo === "registro") {
        uid = await registrarCliente(nombre, password);
        perfil = await obtenerPerfil(uid);
      } else {
        uid = await entrarCliente(nombre, password);
        perfil = await obtenerPerfil(uid);
      }
      onLogin({ uid, ...perfil });
    } catch (e) {
      setError(traducirError(e));
    }
    setCargando(false);
  }

  async function submitCoach() {
    setError("");
    if (!emailCoach || !passCoach) { setError("Falta tu correo o contraseña de coach 👀"); return; }
    setCargando(true);
    try {
      const uid = await entrarCoach(emailCoach, passCoach);
      const perfil = await obtenerPerfil(uid);
      if (!perfil || perfil.role !== "coach") {
        setError("Esta cuenta no tiene permiso de coach.");
        setCargando(false);
        return;
      }
      onLogin({ uid, ...perfil });
    } catch (e) {
      setError(traducirError(e));
    }
    setCargando(false);
  }

  return (
    <div style={pageStyle}>
      <div style={starsBg} />
      <div style={{ maxWidth: 360, margin: "0 auto", position: "relative", zIndex: 2, paddingTop: 60 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo-mark.png" alt="RESET" style={{ width: 110, height: "auto", margin: "0 auto", display: "block" }} />
          <div style={{ fontSize: 13, color: "#c9c5e0", marginTop: 10 }}>Tu dinero, en un vistazo 👀</div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <RolTab active={rol === "cliente"} onClick={() => { setRol("cliente"); setError(""); }}>Cliente</RolTab>
          <RolTab active={rol === "coach"} onClick={() => { setRol("coach"); setError(""); }}>Coach</RolTab>
        </div>

        {rol === "cliente" ? (
          <div style={loginCardStyle}>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <TabBtn active={modo === "login"} onClick={() => setModo("login")}>Entrar</TabBtn>
              <TabBtn active={modo === "registro"} onClick={() => setModo("registro")}>Crear cuenta</TabBtn>
            </div>
            <FieldWithIcon icon={<User size={15} color="#8783a1" />}>
              <input style={loginInputStyle} placeholder="Nombre y primer apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </FieldWithIcon>
            <div style={{ height: 10 }} />
            <FieldWithIcon icon={<Lock size={15} color="#8783a1" />}>
              <input style={loginInputStyle} placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitCliente()} />
            </FieldWithIcon>
            {error && <div style={{ ...alertBox, marginTop: 12 }}>{error}</div>}
            <button onClick={submitCliente} disabled={cargando} style={loginBtnStyle}>
              {cargando ? "Un momento…" : modo === "login" ? "Entrar 🚀" : "Crear mi cuenta ✨"}
            </button>
          </div>
        ) : (
          <div style={loginCardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#f5c451", marginBottom: 14 }}>
              <ShieldCheck size={13} /> Acceso exclusivo del coach
            </div>
            <FieldWithIcon icon={<Mail size={15} color="#8783a1" />}>
              <input style={loginInputStyle} placeholder="Correo del coach" value={emailCoach} onChange={(e) => setEmailCoach(e.target.value)} />
            </FieldWithIcon>
            <div style={{ height: 10 }} />
            <FieldWithIcon icon={<Lock size={15} color="#8783a1" />}>
              <input style={loginInputStyle} placeholder="Contraseña" type="password" value={passCoach} onChange={(e) => setPassCoach(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitCoach()} />
            </FieldWithIcon>
            {error && <div style={{ ...alertBox, marginTop: 12 }}>{error}</div>}
            <button onClick={submitCoach} disabled={cargando} style={loginBtnStyle}>{cargando ? "Un momento…" : "Entrar al panel 🔑"}</button>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 10, color: "#5f5a7d", marginTop: 14, lineHeight: 1.6 }}>
          Los datos de los clientes son visibles para su coach dentro de este panel.
        </div>
      </div>
    </div>
  );
}

function traducirError(e) {
  const c = e?.code || "";
  if (c.includes("wrong-password") || c.includes("invalid-credential")) return "Usuario o contraseña incorrectos.";
  if (c.includes("email-already-in-use")) return "Ese nombre ya está registrado, mejor entra 😉";
  if (c.includes("weak-password")) return "Tu contraseña necesita al menos 6 caracteres.";
  if (c.includes("user-not-found")) return "No encontramos esa cuenta.";
  return "Algo salió mal, intenta de nuevo.";
}

function RolTab({ active, onClick, children }) {
  return <button onClick={onClick} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid " + (active ? "transparent" : "#2a2350"), background: active ? "linear-gradient(90deg, #7c3aed, #22d3ee)" : "rgba(124,58,237,0.06)", color: active ? "#05040c" : "#8783a1", fontWeight: 800, fontSize: 12.5, letterSpacing: 1, cursor: "pointer" }}>{children}</button>;
}
function TabBtn({ active, onClick, children }) {
  return <button onClick={onClick} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1px solid " + (active ? "transparent" : "#2a2350"), background: active ? "linear-gradient(90deg, #7c3aed, #22d3ee)" : "transparent", color: active ? "#05040c" : "#8783a1", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{children}</button>;
}
function FieldWithIcon({ icon, children }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f0a23", border: "1px solid #2a2350", borderRadius: 12, padding: "0 12px" }}>{icon}{children}</div>;
}

/* ============ Panel del cliente ============ */
function Panel({ uid, nombre, onLogout }) {
  const [data, setData] = useState({ ingresos: [], gastos: [] });
  const [loaded, setLoaded] = useState(false);
  const [modo, setModo] = useState(null);

  useEffect(() => { (async () => { setData(await obtenerDatos(uid)); setLoaded(true); })(); }, [uid]);

  const update = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      guardarDatos(uid, next);
      return next;
    });
  }, [uid]);

  const start = useMemo(() => startOfWeek(new Date()), []);
  const end = useMemo(() => endOfWeek(new Date()), []);
  const ingresoSemana = useMemo(() => data.ingresos.filter((i) => enSemana(i.fecha, start, end)).reduce((a,b)=>a+b.monto,0), [data.ingresos, start, end]);
  const gastoSemana = useMemo(() => data.gastos.filter((g) => enSemana(g.fecha, start, end)).reduce((a,b)=>a+b.monto,0), [data.gastos, start, end]);
  const disponible = ingresoSemana - gastoSemana;
  const pctGastado = ingresoSemana > 0 ? Math.min(100, (gastoSemana/ingresoSemana)*100) : 0;

  const mensaje = useMemo(() => {
    if (ingresoSemana === 0) return { texto: "Agrega lo que ganaste esta semana para arrancar 💪", color: "#c9c5e0" };
    if (pctGastado < 50) return { texto: "¡Vas muy bien! Sigue así 🚀", color: "#4ade80" };
    if (pctGastado < 80) return { texto: "Vas a la mitad, ojo con los gastos 👀", color: "#f5c451" };
    if (pctGastado < 100) return { texto: "¡Aguas! Ya casi se acaba tu dinero de la semana ⚠️", color: "#fb923c" };
    return { texto: "Te pasaste esta semana 😬 hay que ajustar", color: "#f87171" };
  }, [ingresoSemana, pctGastado]);

  function addIngreso(monto, tipo) {
    if (!monto || monto <= 0) return;
    update((prev) => ({ ...prev, ingresos: [{ id: crypto.randomUUID(), monto, tipo, fecha: nowISO() }, ...prev.ingresos] }));
    setModo(null);
  }
  function addGasto(monto, categoria, nota) {
    if (!monto || monto <= 0) return;
    update((prev) => ({ ...prev, gastos: [{ id: crypto.randomUUID(), monto, categoria, nota: nota || "", fecha: nowISO() }, ...prev.gastos] }));
    setModo(null);
  }
  function deleteIngreso(id) { update((prev) => ({ ...prev, ingresos: prev.ingresos.filter((i) => i.id !== id) })); }
  function deleteGasto(id) { update((prev) => ({ ...prev, gastos: prev.gastos.filter((g) => g.id !== id) })); }

  const movimientos = useMemo(() => {
    const todos = [...data.ingresos.map((i) => ({ ...i, esIngreso: true })), ...data.gastos.map((g) => ({ ...g, esIngreso: false }))];
    return todos.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
  }, [data]);

  if (!loaded) return <div style={loadingStyle}>Cargando…</div>;

  return (
    <div style={pageStyle}>
      <div style={starsBg} />
      <div style={{ maxWidth: 400, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo-mark.png" alt="RESET" style={{ width: 28, height: "auto" }} />
            <div style={{ fontSize: 13, color: "#c9c5e0" }}>Hola, <b style={{ color: "#f4f2fb" }}>{nombre}</b> 👋</div>
          </div>
          <button onClick={onLogout} style={logoutBtnStyle}><LogOut size={13} />Salir</button>
        </div>

        <div style={heroCardStyle}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#8783a1", marginBottom: 6 }}>TE QUEDAN ESTA SEMANA</div>
          <div style={{ fontSize: 38, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: disponible >= 0 ? "#f4f2fb" : "#f87171", marginBottom: 10 }}>{money(disponible)}</div>
          <RingBar pct={pctGastado} />
          <div style={{ fontSize: 12.5, color: mensaje.color, fontWeight: 700, marginTop: 10 }}>{mensaje.texto}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 12, fontSize: 11.5 }}>
            <span style={{ color: "#8783a1" }}>Ganaste <b style={{ color: "#22d3ee" }}>{money(ingresoSemana)}</b></span>
            <span style={{ color: "#8783a1" }}>Gastaste <b style={{ color: "#ec4899" }}>{money(gastoSemana)}</b></span>
          </div>
        </div>

        {modo === null && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <BigActionBtn icon={<Plus size={20} />} label="Gané dinero" color="#22d3ee" onClick={() => setModo("ingreso")} />
            <BigActionBtn icon={<Minus size={20} />} label="Gasté dinero" color="#ec4899" onClick={() => setModo("gasto")} />
          </div>
        )}
        {modo === "ingreso" && <QuickAddIngreso onAdd={addIngreso} onCancel={() => setModo(null)} />}
        {modo === "gasto" && <QuickAddGasto onAdd={addGasto} onCancel={() => setModo(null)} />}

        {modo === null && (
          <div style={movCardStyle}>
            <div style={{ fontSize: 10.5, letterSpacing: 1.5, color: "#8783a1", marginBottom: 8 }}>ÚLTIMOS MOVIMIENTOS</div>
            {movimientos.length === 0 && <div style={emptyStyle}>Aún no tienes nada registrado.</div>}
            {movimientos.map((m) => (
              <div key={m.id} style={movRowStyle}>
                <span style={{ fontSize: 16 }}>{m.esIngreso ? TIPOS_INGRESO.find(t=>t.id===m.tipo)?.emoji||"💰" : CATEGORIAS_GASTO.find(c=>c.id===m.categoria)?.emoji||"📦"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "#e5e2f2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.esIngreso ? TIPOS_INGRESO.find(t=>t.id===m.tipo)?.label||"Ingreso" : (m.nota || CATEGORIAS_GASTO.find(c=>c.id===m.categoria)?.label||"Gasto")}
                  </div>
                  <div style={{ fontSize: 10, color: "#6f6a8f", display: "flex", alignItems: "center", gap: 3 }}><Clock size={9} />{fmtDiaCorto(m.fecha)} · {fmtHora(m.fecha)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: m.esIngreso ? "#22d3ee" : "#ec4899" }}>{m.esIngreso?"+":"−"}{money(m.monto)}</div>
                <button onClick={() => m.esIngreso ? deleteIngreso(m.id) : deleteGasto(m.id)} style={{ ...iconBtnStyle, marginLeft: 2 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ textAlign: "center", fontSize: 10.5, color: "#5f5a7d", marginTop: 16 }}>Todo se guarda solo. Un registro a la vez, un paso más cerca 💫</div>
      </div>
    </div>
  );
}

function BigActionBtn({ icon, label, color, onClick }) {
  return <button onClick={onClick} style={{ ...bigBtnStyle, borderColor: color }}><span style={{ color, display: "flex" }}>{icon}</span><span style={{ fontSize: 13, fontWeight: 700, color: "#f4f2fb" }}>{label}</span></button>;
}

function RingBar({ pct }) {
  const size=140, stroke=12, r=(size-stroke)/2, cx=size/2, cy=size/2, circ=2*Math.PI*r;
  const color = pct<50?"#4ade80":pct<80?"#f5c451":pct<100?"#fb923c":"#f87171";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ margin:"0 auto", display:"block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1533" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ} transform={`rotate(-90 ${cx} ${cy})`} style={{ transition:"stroke-dashoffset 0.5s ease" }} />
      <text x={cx} y={cy-2} textAnchor="middle" fill="#f4f2fb" fontSize="22" fontWeight="800" fontFamily="ui-monospace, monospace">{Math.round(pct)}%</text>
      <text x={cx} y={cy+16} textAnchor="middle" fill="#8783a1" fontSize="9" letterSpacing="1">GASTADO</text>
    </svg>
  );
}

function QuickAddIngreso({ onAdd, onCancel }) {
  const [tipo, setTipo] = useState(TIPOS_INGRESO[0].id);
  const [monto, setMonto] = useState(null);
  const [custom, setCustom] = useState("");
  const montoFinal = custom ? parseFloat(custom) : monto;
  return (
    <div style={quickCardStyle}>
      <div style={quickTitleStyle}>💰 ¿Cuánto ganaste?</div>
      <div style={chipsRow}>{CHIPS_INGRESO.map((c) => <Chip key={c} active={monto===c && !custom} onClick={() => { setMonto(c); setCustom(""); }} color="#22d3ee">{money(c)}</Chip>)}</div>
      <input style={{ ...inputStyle, width:"100%", marginBottom:14, textAlign:"center", fontSize:16 }} placeholder="Otra cantidad" inputMode="decimal" value={custom} onChange={(e) => { setCustom(e.target.value); setMonto(null); }} />
      <div style={{ ...quickTitleStyle, marginTop:2 }}>¿De dónde llegó?</div>
      <div style={chipsRow}>{TIPOS_INGRESO.map((t) => <Chip key={t.id} active={tipo===t.id} onClick={() => setTipo(t.id)} color="#22d3ee">{t.emoji} {t.label}</Chip>)}</div>
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={onCancel} style={cancelBtnStyle}>Cancelar</button>
        <button onClick={() => montoFinal>0 && onAdd(montoFinal, tipo)} disabled={!(montoFinal>0)} style={{ ...confirmBtnStyle, background:"linear-gradient(90deg, #22d3ee, #7c3aed)", opacity: montoFinal>0?1:0.5 }}>Guardar 🚀</button>
      </div>
    </div>
  );
}

function QuickAddGasto({ onAdd, onCancel }) {
  const [categoria, setCategoria] = useState(CATEGORIAS_GASTO[0].id);
  const [monto, setMonto] = useState(null);
  const [custom, setCustom] = useState("");
  const [nota, setNota] = useState("");
  const montoFinal = custom ? parseFloat(custom) : monto;
  return (
    <div style={quickCardStyle}>
      <div style={quickTitleStyle}>💸 ¿Cuánto gastaste?</div>
      <div style={chipsRow}>{CHIPS_GASTO.map((c) => <Chip key={c} active={monto===c && !custom} onClick={() => { setMonto(c); setCustom(""); }} color="#ec4899">{money(c)}</Chip>)}</div>
      <input style={{ ...inputStyle, width:"100%", marginBottom:14, textAlign:"center", fontSize:16 }} placeholder="Otra cantidad" inputMode="decimal" value={custom} onChange={(e) => { setCustom(e.target.value); setMonto(null); }} />
      <div style={{ ...quickTitleStyle, marginTop:2 }}>¿En qué fue?</div>
      <div style={chipsRow}>{CATEGORIAS_GASTO.map((c) => <Chip key={c.id} active={categoria===c.id} onClick={() => setCategoria(c.id)} color="#ec4899">{c.emoji} {c.label}</Chip>)}</div>
      <input style={{ ...inputStyle, width:"100%", textAlign:"center", fontSize:13 }} placeholder="¿Qué compraste? (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={onCancel} style={cancelBtnStyle}>Cancelar</button>
        <button onClick={() => montoFinal>0 && onAdd(montoFinal, categoria, nota)} disabled={!(montoFinal>0)} style={{ ...confirmBtnStyle, background:"linear-gradient(90deg, #ec4899, #c026d3)", opacity: montoFinal>0?1:0.5 }}>Guardar 🚀</button>
      </div>
    </div>
  );
}

function Chip({ active, onClick, color, children }) {
  return <button onClick={onClick} style={{ padding:"8px 12px", borderRadius:999, border:"1px solid "+(active?color:"#2a2350"), background: active?color:"#0f0a23", color: active?"#05040c":"#c9c5e0", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{children}</button>;
}

/* ============ Panel del coach ============ */
function CoachDashboard({ nombre, onLogout }) {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(null);
  const start = useMemo(() => startOfWeek(new Date()), []);
  const end = useMemo(() => endOfWeek(new Date()), []);

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    const lista = (await obtenerTodosLosClientes()).map((c) => {
      const ingresoSemana = c.ingresos.filter((i) => enSemana(i.fecha, start, end)).reduce((a,b)=>a+b.monto,0);
      const gastoSemana = c.gastos.filter((g) => enSemana(g.fecha, start, end)).reduce((a,b)=>a+b.monto,0);
      const movimientos = [...c.ingresos.map(i=>({...i, esIngreso:true})), ...c.gastos.map(g=>({...g, esIngreso:false}))]
        .sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,6);
      return { nombre: c.nombre, ingresoSemana, gastoSemana, disponible: ingresoSemana-gastoSemana, movimientos };
    });
    lista.sort((a,b) => a.nombre.localeCompare(b.nombre));
    setClientes(lista);
    setCargando(false);
  }, [start, end]);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);
  const filtrados = clientes.filter((c) => c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  return (
    <div style={pageStyle}>
      <div style={starsBg} />
      <div style={{ maxWidth: 440, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/logo-mark.png" alt="RESET" style={{ width: 34, height: "auto" }} />
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#f4f2fb" }}>RESET</div>
              <div style={{ fontSize:10, letterSpacing:2, color:"#8783a1" }}>720 · PANEL COACH</div>
            </div>
          </div>
          <button onClick={onLogout} style={logoutBtnStyle}><LogOut size={13} />Salir</button>
        </div>
        <div style={{ fontSize:12.5, color:"#c9c5e0", marginBottom:16 }}>Hola, <b style={{ color:"#f4f2fb" }}>{nombre}</b> 👋</div>

        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <FieldWithIcon icon={<Search size={14} color="#8783a1" />}>
            <input style={loginInputStyle} placeholder="Buscar cliente…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </FieldWithIcon>
          <button onClick={cargarClientes} style={refreshBtnStyle}><RefreshCw size={14} color="#c9c5e0" /></button>
        </div>

        {cargando && <div style={emptyStyle}>Cargando clientes…</div>}
        {!cargando && filtrados.length===0 && <div style={emptyStyle}>Aún no tienes clientes registrados.</div>}

        {filtrados.map((c) => (
          <div key={c.nombre} style={clientCardStyle}>
            <button onClick={() => setAbierto(abierto===c.nombre?null:c.nombre)} style={clientHeaderBtnStyle}>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:"#f4f2fb" }}>{c.nombre}</div>
                <div style={{ fontSize:11, color:"#8783a1" }}>Le quedan <b style={{ color: c.disponible>=0?"#4ade80":"#f87171" }}>{money(c.disponible)}</b> esta semana</div>
              </div>
              {abierto===c.nombre ? <ChevronUp size={16} color="#8783a1" /> : <ChevronDown size={16} color="#8783a1" />}
            </button>
            <div style={{ display:"flex", gap:16, padding:"0 16px 12px", fontSize:11 }}>
              <span style={{ color:"#8783a1" }}>Ganó <b style={{ color:"#22d3ee" }}>{money(c.ingresoSemana)}</b></span>
              <span style={{ color:"#8783a1" }}>Gastó <b style={{ color:"#ec4899" }}>{money(c.gastoSemana)}</b></span>
            </div>
            {abierto===c.nombre && (
              <div style={{ padding:"0 16px 16px" }}>
                {c.movimientos.length===0 && <div style={emptyStyle}>Sin movimientos aún.</div>}
                {c.movimientos.map((m) => (
                  <div key={m.id} style={movRowStyle}>
                    <span style={{ fontSize:16 }}>{m.esIngreso ? TIPOS_INGRESO.find(t=>t.id===m.tipo)?.emoji||"💰" : CATEGORIAS_GASTO.find(cat=>cat.id===m.categoria)?.emoji||"📦"}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:"#e5e2f2", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {m.esIngreso ? TIPOS_INGRESO.find(t=>t.id===m.tipo)?.label||"Ingreso" : (m.nota || CATEGORIAS_GASTO.find(cat=>cat.id===m.categoria)?.label||"Gasto")}
                      </div>
                      <div style={{ fontSize:9.5, color:"#6f6a8f", display:"flex", alignItems:"center", gap:3 }}><Clock size={9} />{fmtDiaCorto(m.fecha)} · {fmtHora(m.fecha)}</div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, fontFamily:"ui-monospace, monospace", color: m.esIngreso?"#22d3ee":"#ec4899" }}>{m.esIngreso?"+":"−"}{money(m.monto)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{ textAlign:"center", fontSize:10, color:"#5f5a7d", marginTop:18, lineHeight:1.6 }}>Toca "Actualizar" para ver lo último que anotaron tus clientes.</div>
      </div>
    </div>
  );
}

/* ============ Estilos ============ */
const pageStyle = { minHeight:"100vh", background:"radial-gradient(ellipse 120% 80% at 50% -10%, #1a0f3d 0%, #0b0720 45%, #05040c 100%)", color:"#f4f2fb", fontFamily:"'Segoe UI', ui-sans-serif, system-ui, -apple-system, sans-serif", padding:"24px 14px 30px", position:"relative", overflow:"hidden" };
const loadingStyle = { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#05040c", color:"#8783a1" };
const starsBg = { position:"absolute", inset:0, backgroundImage:"radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 70% 15%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 85% 60%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 10% 65%, rgba(255,255,255,0.35), transparent)", backgroundSize:"400px 400px", opacity:0.8, zIndex:1 };
const logoStyle = { fontSize:28, fontWeight:800, letterSpacing:7, background:"linear-gradient(90deg, #c026d3, #7c3aed 45%, #22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" };
const logoSubStyle = { fontSize:11, letterSpacing:4, color:"#8783a1", marginTop:2, display:"flex", alignItems:"center", justifyContent:"center", gap:8 };
const hrLine = { width:24, height:1, background:"#3d3760", display:"inline-block" };
const cardBase = { background:"linear-gradient(160deg, rgba(124,58,237,0.08), rgba(15,10,35,0.6))", border:"1px solid #241f47", borderRadius:18, backdropFilter:"blur(6px)" };
const loginCardStyle = { ...cardBase, padding:"22px 20px" };
const heroCardStyle = { ...cardBase, padding:"22px 18px", textAlign:"center", marginBottom:16 };
const movCardStyle = { ...cardBase, padding:"14px 16px" };
const quickCardStyle = { ...cardBase, padding:"18px 18px", marginBottom:16 };
const clientCardStyle = { ...cardBase, marginBottom:12, overflow:"hidden" };
const clientHeaderBtnStyle = { width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", cursor:"pointer", padding:"14px 16px 6px" };
const inputStyle = { background:"#0f0a23", border:"1px solid #2a2350", borderRadius:10, padding:"10px 10px", color:"#f4f2fb", outline:"none", fontFamily:"ui-monospace, monospace" };
const loginInputStyle = { ...inputStyle, background:"transparent", border:"none", flex:1, padding:"11px 0" };
const loginBtnStyle = { width:"100%", marginTop:16, padding:"12px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(90deg, #7c3aed, #22d3ee)", color:"#05040c", fontWeight:800, fontSize:13, letterSpacing:1 };
const logoutBtnStyle = { display:"flex", alignItems:"center", gap:6, background:"#1a1533", border:"1px solid #2a2350", borderRadius:999, padding:"6px 12px", color:"#c9c5e0", fontSize:11.5, fontWeight:600, cursor:"pointer" };
const refreshBtnStyle = { background:"#1a1533", border:"1px solid #2a2350", borderRadius:10, width:40, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" };
const bigBtnStyle = { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, padding:"18px 8px", borderRadius:18, border:"1.5px solid", background:"rgba(124,58,237,0.08)", cursor:"pointer" };
const quickTitleStyle = { fontSize:13, fontWeight:700, color:"#c9c5e0", marginBottom:10, textAlign:"center" };
const chipsRow = { display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:14 };
const cancelBtnStyle = { flex:1, padding:"12px 0", borderRadius:12, border:"1px solid #2a2350", background:"transparent", color:"#8783a1", fontWeight:700, fontSize:13, cursor:"pointer" };
const confirmBtnStyle = { flex:1.4, padding:"12px 0", borderRadius:12, border:"none", color:"#05040c", fontWeight:800, fontSize:13, cursor:"pointer" };
const movRowStyle = { display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #1c1738" };
const iconBtnStyle = { background:"none", border:"none", cursor:"pointer", color:"#6f6a8f", fontSize:18, lineHeight:1, padding:"0 4px" };
const emptyStyle = { fontSize:12, color:"#6f6a8f", padding:"6px 0" };
const alertBox = { fontSize:11.5, color:"#fca5a5", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.35)", borderRadius:10, padding:"8px 10px" };
