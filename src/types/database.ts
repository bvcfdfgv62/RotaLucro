export type Viagem = {
  id: string;
  user_id: string;
  data: string;
  origem: string;
  destino: string;
  parada?: string | null;
  km: number;
  dias: number;
  valor_frete: number;
  custo_total: number;
  lucro: number;
  margem: number;
  created_at: string;
};

export type Agregado = {
  id: string;
  user_id: string;
  nome: string;
  placa: string;
  tipo_caminhao: string;
  consumo_medio: number;
  valor_km: number | null;
  status: 'Ativo' | 'Inativo';
  created_at: string;
};

export type Carga = {
  id: string;
  user_id: string;
  nome: string;
  tipo: string;
  peso: number;
  observacoes: string | null;
  created_at: string;
};
