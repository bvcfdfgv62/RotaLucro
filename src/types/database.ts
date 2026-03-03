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
