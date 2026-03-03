import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Carga } from '../types/database';
import { Plus, Edit2, Trash2, X, Loader2, CheckCircle, Package } from 'lucide-react';

export const Cargas = () => {
  const { user } = useAuth();
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Seca',
    peso: '',
    observacoes: '',
  });

  useEffect(() => {
    fetchCargas();
  }, [user]);

  const fetchCargas = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('cargas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCargas(data || []);
    } catch (error) {
      console.error('Erro ao buscar cargas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (carga?: Carga) => {
    if (carga) {
      setEditingId(carga.id);
      setFormData({
        nome: carga.nome,
        tipo: carga.tipo,
        peso: carga.peso.toString(),
        observacoes: carga.observacoes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        tipo: 'Seca',
        peso: '',
        observacoes: '',
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
        tipo: formData.tipo,
        peso: parseFloat(formData.peso),
        observacoes: formData.observacoes.trim() !== '' ? formData.observacoes : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('cargas')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        setSuccessMsg('Carga atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('cargas')
          .insert([payload]);
        if (error) throw error;
        setSuccessMsg('Carga cadastrada com sucesso!');
      }

      fetchCargas();
      handleCloseModal();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar carga. Verifique se a tabela foi criada no Supabase.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta carga?')) return;

    try {
      const { error } = await supabase
        .from('cargas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setSuccessMsg('Carga excluída com sucesso!');
      fetchCargas();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir carga.');
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
        <h1 className="text-2xl font-bold text-slate-900">Cadastro de Carga</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nova Carga
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
                <th className="px-6 py-4">Nome da Carga</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Peso Estimado (kg)</th>
                <th className="px-6 py-4">Observações</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma carga cadastrada.
                  </td>
                </tr>
              ) : (
                cargas.map((carga) => (
                  <tr key={carga.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      {carga.nome}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        carga.tipo === 'Perigosa' ? 'bg-red-100 text-red-800' :
                        carga.tipo === 'Refrigerada' ? 'bg-blue-100 text-blue-800' :
                        carga.tipo === 'Frágil' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {carga.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {carga.peso.toLocaleString('pt-BR')} kg
                    </td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-xs">
                      {carga.observacoes || '-'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenModal(carga)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(carga.id)}
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
                {editingId ? 'Editar Carga' : 'Nova Carga'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Carga</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  placeholder="Ex: Eletrônicos, Soja, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                >
                  <option value="Seca">Seca</option>
                  <option value="Refrigerada">Refrigerada</option>
                  <option value="Perigosa">Perigosa</option>
                  <option value="Frágil">Frágil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Peso Estimado (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.peso}
                  onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  placeholder="Ex: 12000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none resize-none h-24"
                  placeholder="Detalhes adicionais sobre a carga..."
                />
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
