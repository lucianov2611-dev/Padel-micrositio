import { CircleDot } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

// UI simples
const Button = ({ className = "", children, ...props }) => (
  <button className={`px-4 py-2 rounded-2xl shadow-sm hover:shadow transition disabled:opacity-50 ${className}`} {...props}>
    {children}
  </button>
);
const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl shadow p-4 bg-white ${className}`}>{children}</div>
);
const Input = ({ className = "", ...props }) => (
  <input className={`w-full px-3 py-2 rounded-xl border outline-none focus:ring ${className}`} {...props} />
);
const Select = ({ className = "", children, ...props }) => (
  <select className={`w-full px-3 py-2 rounded-xl border outline-none focus:ring ${className}`} {...props}>{children}</select>
);
const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full bg-gray-100 ${className}`}>{children}</span>
);

// Datos mock
const mockClub = {
  id: "club-1",
  name: "Pádel Arena Godoy",
  city: "Godoy Cruz, Mendoza",
  courts: [
    { id: "c1", name: "Cancha 1", surface: "Césped sintético", indoor: false },
    { id: "c2", name: "Cancha 2", surface: "Césped sintético", indoor: true },
    { id: "c3", name: "Cancha 3", surface: "Muro", indoor: false },
  ],
  merch: [
    { id: "m1", name: "Remera oficial", price: 14990, stock: 32 },
    { id: "m2", name: "Gorra del club", price: 9990, stock: 12 },
    { id: "m3", name: "Grip PRO x3", price: 6990, stock: 50 },
  ],
  settings: { slotMinutes: 60, openHour: 8, closeHour: 23, prepaymentPercent: 30, cancellationHours: 6 },
};

const currency = (n) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n / 100);

const buildSlots = (openHour, closeHour, minutes) => {
  const slots = [];
  const start = new Date(); start.setHours(openHour, 0, 0, 0);
  const end = new Date(); end.setHours(closeHour, 0, 0, 0);
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + minutes * 60000)) {
    const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    slots.push({ id: label, label, date: new Date(d) });
  }
  return slots;
};

// Analytics mock
const seedRandom = (seed = 42) => { let s = seed % 2147483647; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const generateMockAnalytics = (club) => {
  const rnd = seedRandom(2025);
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (29 - i));
    const weekday = date.getDay();
    const base = [0.8,0.9,1.0,1.0,1.2,1.4,1.6][weekday];
    const views = Math.round(200 * base * (0.8 + rnd() * 0.4));
    const visitors = Math.round(views * (0.35 + rnd() * 0.15));
    const bookings = Math.round(visitors * (0.18 + rnd() * 0.06));
    const prepaids = Math.round(bookings * (club.settings.prepaymentPercent/100) * (0.9 + rnd() * 0.2));
    return { date, weekday, views, visitors, bookings, prepaids };
  });

  const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2,"0")}:00`, bookings: 0 }));
  days.forEach((d) => {
    for (let i = 0; i < d.bookings; i++) {
      let h = Math.floor(8 + rnd() * 12);
      if (rnd() > 0.5) h = Math.floor(18 + rnd() * 4);
      hourCounts[h].bookings += 1;
    }
  });

  const dow = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const dayCounts = dow.map((d, i) => ({ day: d, bookings: 0 }));
  days.forEach((d) => { dayCounts[d.weekday].bookings += d.bookings; });

  const timeseries = days.map((d) => ({
    date: d.date.toLocaleDateString(),
    Vistas: d.views,
    Reservas: d.bookings,
    "Pagos anticipados": d.prepaids,
  }));

  const totals = days.reduce((acc, d) => ({
    views: acc.views + d.views, visitors: acc.visitors + d.visitors,
    bookings: acc.bookings + d.bookings, prepaids: acc.prepaids + d.prepaids,
  }), { views:0, visitors:0, bookings:0, prepaids:0 });

  const convRate = totals.bookings / Math.max(totals.visitors, 1);
  return { hourCounts, dayCounts, timeseries, totals, convRate };
};

// Vista pública
const PublicClub = ({ club, onOpenAdmin }) => {
  const [selectedCourt, setSelectedCourt] = useState(club.courts[0].id);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const slots = useMemo(() => buildSlots(club.settings.openHour, club.settings.closeHour, club.settings.slotMinutes), [club.settings]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <p className="text-sm text-gray-500">{club.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>Pagos seguros</Badge>
          <Badge>Mobile-first</Badge>
          <Button className="bg-gray-100" onClick={onOpenAdmin}>Admin</Button>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <Card>
          <h2 className="font-semibold mb-2">Reservar cancha</h2>
          <div className="grid gap-2">
            <label className="text-sm text-gray-600">Elegí la cancha</label>
            <Select value={selectedCourt} onChange={(e) => setSelectedCourt(e.target.value)}>
              {club.courts.map((c) => (<option key={c.id} value={c.id}>{c.name} {c.indoor ? "(techada)" : ""}</option>))}
            </Select>
            <label className="text-sm text-gray-600 mt-3">Horario</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-auto pr-1">
              {slots.map((s) => (
                <button key={s.id} onClick={() => setSelectedSlot(s.id)}
                  className={`text-sm px-3 py-2 rounded-xl border hover:shadow ${selectedSlot === s.id ? "bg-orange-50 border-orange-400" : "bg-white"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <Button className="mt-3 bg-orange-500 text-white" disabled={!selectedSlot}>Confirmar y pagar anticipo</Button>
            <p className="text-xs text-gray-500 mt-2">Anticipo: {club.settings.prepaymentPercent}% · Cancelación hasta {club.settings.cancellationHours}h antes.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-2">Merchandising oficial</h2>
          <div className="grid gap-3">
            {club.merch.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">Stock: {item.stock}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{currency(item.price)}</span>
                  <Button className="bg-gray-900 text-white text-sm">Agregar</Button>
                </div>
              </div>
            ))}
            <Button className="bg-orange-500 text-white mt-2 w-full">Finalizar compra</Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-2">Horarios de hoy</h2>
          <div className="grid gap-2 text-sm max-h-56 overflow-auto pr-1">
            {club.courts.map((c) => (
              <div key={c.id} className="border rounded-xl p-2">
                <p className="font-medium">{c.name}</p>
                <p className="text-gray-500">{c.surface} {c.indoor ? "· Techada" : ""}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {buildSlots(club.settings.openHour, club.settings.closeHour, club.settings.slotMinutes).slice(0, 6).map((s) => (
                    <span key={s.id} className="px-2 py-1 text-xs rounded-lg bg-gray-100">{s.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <footer className="text-xs text-gray-500 text-center">
        © {new Date().getFullYear()} {club.name} · Reservas y tienda en una sola página
      </footer>
    </div>
  );
};

// KPI y Analytics (con Recharts)
const KPI = ({ label, value, sub }) => (
  <Card>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
    {sub && <p className="text-xs text-gray-500">{sub}</p>}
  </Card>
);

const AnalyticsSection = ({ club }) => {
  const { hourCounts, dayCounts, timeseries, totals, convRate } = useMemo(() => generateMockAnalytics(club), [club]);
  const fmt = new Intl.NumberFormat();
  const rate = (convRate * 100).toFixed(1) + "%";

  return (
    <section className="grid gap-4">
      <h3 className="text-lg font-semibold">Analítica del micrositio</h3>
      <div className="grid md:grid-cols-4 gap-4">
        <KPI label="Vistas (30d)" value={fmt.format(totals.views)} />
        <KPI label="Visitantes (30d)" value={fmt.format(totals.visitors)} />
        <KPI label="Reservas (30d)" value={fmt.format(totals.bookings)} />
        <KPI label="Tasa de conversión" value={rate} sub="Reservas / Visitantes" />
      </div>

      <Card>
        <p className="font-medium mb-2">Evolución: vistas, reservas y pagos anticipados</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide={false} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Vistas" />
              <Line type="monotone" dataKey="Reservas" />
              <Line type="monotone" dataKey="Pagos anticipados" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <p className="font-medium mb-2">Picos por hora (reservas)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="font-medium mb-2">Reservas por día de la semana</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default function App() {
  const [mode, setMode] = useState("public");
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Demo · Micrositio para clubes de pádel</h1>
          <div className="flex items-center gap-2">
            <Button className={`${mode==='public'?'bg-orange-500 text-white':'bg-gray-100'}`} onClick={()=>setMode('public')}>Vista pública</Button>
            <Button className={`${mode==='admin'?'bg-orange-500 text-white':'bg-gray-100'}`} onClick={()=>setMode('admin')}>Admin</Button>
          </div>
        </div>
        {mode === 'public' ? (
          <PublicClub club={mockClub} onOpenAdmin={()=>setMode('admin')} />
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card>
                <h3 className="font-semibold mb-2">Canchas</h3>
                <p className="text-sm text-gray-500">Gestión básica de canchas (demo). Esta sección es solo visual.</p>
              </Card>
              <Card>
                <h3 className="font-semibold mb-2">Merchandising</h3>
                <p className="text-sm text-gray-500">Gestión básica de productos (demo). Esta sección es solo visual.</p>
              </Card>
            </div>
            <AnalyticsSection club={mockClub} />
          </>
        )}
      </div>
    </div>
  );
            }
