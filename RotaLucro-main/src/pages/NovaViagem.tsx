import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Agregado, Carga } from "../types/database";
import {
  MapPin,
  Navigation,
  DollarSign,
  Fuel,
  Truck,
  Calculator,
  Loader2,
  AlertCircle,
  Users,
  Package,
} from "lucide-react";

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type CalculationResult = {
  km: number;
  horas: number;
  dias: number;
  combustivelLitros: number;
  custoCombustivel: number;
  pedagio: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  custoAdicional: number;
  detalhesCustoAdicional: string[];
  routeCoordinates: [number, number][];
  origemCoords: [number, number];
  destinoCoords: [number, number];
};

export const NovaViagem = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [parada, setParada] = useState("");
  const [valorFrete, setValorFrete] = useState("");
  const [precoDiesel, setPrecoDiesel] = useState("5.89");
  const [consumo, setConsumo] = useState("2.05");

  // Agregados and Cargas state
  const [agregados, setAgregados] = useState<Agregado[]>([]);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [selectedAgregadoId, setSelectedAgregadoId] = useState("");
  const [selectedCargaId, setSelectedCargaId] = useState("");

  const [result, setResult] = useState<CalculationResult & { paradaCoords?: [number, number] } | null>(null);

  React.useEffect(() => {
    if (user) {
      fetchAgregadosAndCargas();
    }
  }, [user]);

  const fetchAgregadosAndCargas = async () => {
    try {
      const [agregadosRes, cargasRes] = await Promise.all([
        supabase.from("agregados").select("*").eq("user_id", user?.id).eq("status", "Ativo"),
        supabase.from("cargas").select("*").eq("user_id", user?.id)
      ]);

      if (agregadosRes.data) setAgregados(agregadosRes.data);
      if (cargasRes.data) setCargas(cargasRes.data);
    } catch (error) {
      console.error("Erro ao buscar agregados e cargas:", error);
    }
  };

  const handleAgregadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAgregadoId(id);
    if (id) {
      const agregado = agregados.find(a => a.id === id);
      if (agregado) {
        setConsumo(agregado.consumo_medio.toString());
      }
    }
  };

  const getCoordinates = async (city: string): Promise<[number, number]> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`,
        {
          headers: {
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        }
      );
      if (!response.ok) throw new Error("Erro na API de geolocalização");
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      throw new Error(`Não foi possível encontrar as coordenadas para: ${city}`);
    } catch (error: any) {
      if (error.message === "Failed to fetch") {
        throw new Error("Erro de conexão com o serviço de mapas (Nominatim).");
      }
      throw error;
    }
  };

  const getRoute = async (start: [number, number], end: [number, number], waypoint?: [number, number]) => {
    try {
      // OSRM expects lon,lat
      let coordinatesString = `${start[1]},${start[0]}`;
      if (waypoint) {
        coordinatesString += `;${waypoint[1]},${waypoint[0]}`;
      }
      coordinatesString += `;${end[1]},${end[0]}`;

      const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro na API de rotas");
      const data = await response.json();

      if (data.code !== "Ok") {
        throw new Error("Não foi possível calcular a rota.");
      }

      return data.routes[0];
    } catch (error: any) {
      if (error.message === "Failed to fetch") {
        throw new Error("Erro de conexão com o serviço de rotas (OSRM).");
      }
      throw error;
    }
  };

  const calculateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const frete = parseFloat(valorFrete);
      const diesel = parseFloat(precoDiesel);
      const cons = parseFloat(consumo);

      if (isNaN(frete) || isNaN(diesel) || isNaN(cons)) {
        throw new Error(
          "Por favor, preencha os valores numéricos corretamente.",
        );
      }

      // 1. Get Coordinates
      const origemCoords = await getCoordinates(origem);
      const destinoCoords = await getCoordinates(destino);
      let paradaCoords: [number, number] | undefined;

      if (parada.trim() !== "") {
        paradaCoords = await getCoordinates(parada);
      }

      // 2. Get Route from OSRM
      const route = await getRoute(origemCoords, destinoCoords, paradaCoords);

      const distanceMeters = route.distance;
      const durationSeconds = route.duration;

      // Convert coordinates from GeoJSON (lon, lat) to Leaflet (lat, lon)
      const routeCoordinates: [number, number][] =
        route.geometry.coordinates.map((coord: [number, number]) => [
          coord[1],
          coord[0],
        ]);

      // 3. Math
      let finalConsumo = cons;
      let custoAdicional = 0;
      let detalhesCustoAdicional: string[] = [];

      const kmCalculado = distanceMeters / 1000;
      const horas = durationSeconds / 3600;
      const dias = Math.ceil(kmCalculado / 600);

      const cargaSelecionada = cargas.find(c => c.id === selectedCargaId);

      if (cargaSelecionada) {
        if (cargaSelecionada.peso > 10000) {
          finalConsumo = finalConsumo * 0.95; // Aumenta o consumo em 5% (reduz km/l)
          detalhesCustoAdicional.push("Consumo +5% (Peso > 10t)");
        }
        if (cargaSelecionada.tipo === 'Refrigerada') {
          const custoRefri = kmCalculado * 0.50; // R$ 0.50 por KM
          custoAdicional += custoRefri;
          detalhesCustoAdicional.push(`Refrigeração: R$ ${custoRefri.toFixed(2)}`);
        }
        if (cargaSelecionada.tipo === 'Perigosa') {
          const custoPerigo = frete * 0.15; // 15% do frete
          custoAdicional += custoPerigo;
          detalhesCustoAdicional.push(`Taxa Periculosidade: R$ ${custoPerigo.toFixed(2)}`);
        }
      }

      const combustivelLitros = kmCalculado / finalConsumo;
      const custoCombustivel = combustivelLitros * diesel;

      const pedagio = kmCalculado * 0.3;

      const custoTotal = custoCombustivel + pedagio + custoAdicional;
      const lucro = frete - custoTotal;
      const margem = (lucro / frete) * 100;

      const calcResult = {
        km: kmCalculado,
        horas,
        dias,
        combustivelLitros,
        custoCombustivel,
        pedagio,
        custoTotal,
        lucro,
        margem,
        custoAdicional,
        detalhesCustoAdicional,
        routeCoordinates,
        origemCoords,
        destinoCoords,
        paradaCoords,
      };

      setResult(calcResult);

      setResult(calcResult);

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao calcular a rota.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!user || !result) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: dbError } = await supabase.from("viagens").insert([
        {
          user_id: user.id,
          data: new Date().toISOString(),
          origem,
          destino,
          parada: parada.trim() !== "" ? parada : null,
          km: result.km,
          dias: result.dias,
          valor_frete: parseFloat(valorFrete),
          custo_total: result.custoTotal,
          lucro: result.lucro,
          margem: result.margem,
        },
      ]);

      if (dbError) {
        if (dbError.message === "Failed to fetch") {
          setError("Rota calculada, mas não foi possível salvar no histórico. Verifique as variáveis de ambiente do Supabase.");
        } else {
          console.error("Erro ao salvar no banco:", dbError);
          setError("Ocorreu um erro ao salvar a rota no histórico.");
        }
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao salvar a rota.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nova Viagem</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium">
          Viagem calculada e salva com sucesso no seu histórico!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Dados da Rota
            </h2>

            <form onSubmit={calculateRoute} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Agregado (Opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      value={selectedAgregadoId}
                      onChange={handleAgregadoChange}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors appearance-none bg-white"
                    >
                      <option value="">Selecione...</option>
                      {agregados.map(a => (
                        <option key={a.id} value={a.id}>{a.nome} ({a.placa})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Carga (Opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      value={selectedCargaId}
                      onChange={(e) => setSelectedCargaId(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors appearance-none bg-white"
                    >
                      <option value="">Selecione...</option>
                      {cargas.map(c => (
                        <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cidade de Origem
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                    placeholder="Ex: São Paulo, SP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cidade de Destino
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                    placeholder="Ex: Rio de Janeiro, RJ"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cidade de Parada (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={parada}
                    onChange={(e) => setParada(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                    placeholder="Ex: Campinas, SP"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Valores
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Valor do Frete (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={valorFrete}
                      onChange={(e) => setValorFrete(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                      placeholder="5000.00"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Preço Diesel (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={precoDiesel}
                        onChange={(e) => setPrecoDiesel(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                        placeholder="5.90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Consumo (km/l)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={consumo}
                        onChange={(e) => setConsumo(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                        placeholder="2.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Calculator className="w-5 h-5 mr-2" />
                    Calcular Rota e Resultado
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Map */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 h-[400px] overflow-hidden relative z-0">
                <MapContainer
                  bounds={[result.origemCoords, result.destinoCoords]}
                  className="h-full w-full rounded-xl z-0"
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={result.origemCoords}>
                    <Popup>Origem: {origem}</Popup>
                  </Marker>
                  <Marker position={result.destinoCoords}>
                    <Popup>Destino: {destino}</Popup>
                  </Marker>
                  {result.paradaCoords && (
                    <Marker position={result.paradaCoords}>
                      <Popup>Parada: {parada}</Popup>
                    </Marker>
                  )}
                  <Polyline
                    positions={result.routeCoordinates}
                    color="#2563eb"
                    weight={5}
                    opacity={0.7}
                  />
                </MapContainer>
              </div>

              {/* Result Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Distância
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.km.toFixed(0)} km
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Tempo Est.
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.horas.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Duração
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.dias} dias
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Combustível
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.combustivelLitros.toFixed(0)} L
                  </p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Resumo Financeiro
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600">Valor do Frete</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(parseFloat(valorFrete))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600">Custo Combustível</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(result.custoCombustivel)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600">Pedágio Estimado</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(result.pedagio)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">
                        Custo Total
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(result.custoTotal)}
                      </span>
                    </div>

                    {result.detalhesCustoAdicional && result.detalhesCustoAdicional.length > 0 && (
                      <div className="py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium block mb-1">Custos Adicionais da Carga:</span>
                        <ul className="text-sm text-red-600 space-y-1">
                          {result.detalhesCustoAdicional.map((detalhe, idx) => (
                            <li key={idx}>• {detalhe}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">
                          Lucro Líquido
                        </p>
                        <p
                          className={`text-3xl font-bold ${result.lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {formatCurrency(result.lucro)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 font-medium mb-1">
                          Margem
                        </p>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${result.margem >= 20
                              ? "bg-emerald-100 text-emerald-800"
                              : result.margem >= 0
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                        >
                          {result.margem.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <button
                        onClick={handleSaveRoute}
                        disabled={saving || success}
                        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : success ? (
                          "Rota Salva!"
                        ) : (
                          "Gravar Rota no Histórico"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <MapPin className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600 mb-2">
                Nenhuma rota calculada
              </p>
              <p className="max-w-md">
                Preencha os dados ao lado e clique em calcular para visualizar o
                mapa e o resumo financeiro da viagem.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
