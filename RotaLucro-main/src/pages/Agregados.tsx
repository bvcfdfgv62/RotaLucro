import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Agregado } from '../types/database';
import { Plus, Edit2, Trash2, X, Loader2, CheckCircle } from 'lucide-react';

export const Agregados = () => {
  const { user } = useAuth();
  const [agregados, setAgregados] = useState<Agregado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    placa: '',
    tipo_caminhao: 'Truck',
    consumo_medio: '',
    valor_km: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
  });

  useEffect(() => {
    fetchAgregados();
  }, [user]);

  const fetchAgregados = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('agregados')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgregados(data || []);
    } catch (error) {
      console.error('Erro ao buscar agregados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (agregado?: Agregado) => {
    if (agregado) {
      setEditingId(agregado.id);
      setFormData({
        nome: agregado.nome,
        placa: agregado.placa,
        tipo_caminhao: agregado.tipo_caminhao,
        consumo_medio: agregado.consumo_medio.toString(),
        valor_km: agregado.valor_km ? agregado.valor_km.toString() : '',
        status: agregado.status,
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        placa: '',
        tipo_caminhao: 'Truck',
        consumo_medio: '',
        valor_km: '',
        status: 'Ativo',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        user_id: user.id,
        nome: formData.nome,
        placa: formData.placa,
        tipo_caminhao: formData.tipo_caminhao,
        consumo_medio: parseFloat(formData.consumo_medio),
        valor_km: formData.valor_km ? parseFloat(formData.valor_km) : null,
        status: formData.status,
      };

      if (editingId) {
        const { error } = await supabase
          .from('agregados')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        setSuccessMsg('Agregado atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('agregados')
          .insert([payload]);
        if (error) throw error;
        setSuccessMsg('Agregado cadastrado com sucesso!');
      }

      fetchAgregados();
      handleCloseModal();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar agregado. Verifique se a tabela foi criada no Supabase.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este agregado?')) return;

    try {
      const { error } = await supabase
        .from('agregados')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setSuccessMsg('Agregado excluído com sucesso!');
      fetchAgregados();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir agregado.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Controle de Agregados</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo Agregado
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
          <CheckCircle className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Placa</th>
                <th className="px-6 py-4">Tipo de Caminhão</th>
                <th className="px-6 py-4">Consumo (km/l)</th>
                <th className="px-6 py-4">Valor por KM</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agregados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Nenhum agregado cadastrado.
                  </td>
                </tr>
              ) : (
                agregados.map((agregado) => (
                  <tr key={agregado.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{agregado.nome}</td>
                    <td className="px-6 py-4 text-slate-600">{agregado.placa}</td>
                    <td className="px-6 py-4 text-slate-600">{agregado.tipo_caminhao}</td>
                    <td className="px-6 py-4 text-slate-600">{agregado.consumo_medio}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {agregado.valor_km ? `R$ ${agregado.valor_km.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agregado.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {agregado.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenModal(agregado)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agregado.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingId ? 'Editar Agregado' : 'Novo Agregado'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  placeholder="Nome do motorista"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
                <input
                  type="text"
                  required
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  placeholder="ABC-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Caminhão</label>
                <select
                  value={formData.tipo_caminhao}
                  onChange={(e) => setFormData({ ...formData, tipo_caminhao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                >
                  <option value="3/4">3/4</option>
                  <option value="Toco">Toco</option>
                  <option value="Truck">Truck</option>
                  <option value="Carreta">Carreta</option>
                  <option value="Bitrem">Bitrem</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Consumo (km/l)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.consumo_medio}
                    onChange={(e) => setFormData({ ...formData, consumo_medio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor por KM (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_km}
                    onChange={(e) => setFormData({ ...formData, valor_km: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Ativo' | 'Inativo' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
