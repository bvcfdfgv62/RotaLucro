import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Truck, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Verifique seu email para confirmar o cadastro!");
      }
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setError("Erro de conexão. Verifique se as variáveis de ambiente do Supabase estão configuradas corretamente no AI Studio.");
      } else {
        setError(err.message || "Ocorreu um erro durante a autenticação.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Digite seu email para recuperar a senha.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setMessage("Instruções de recuperação enviadas para o seu email.");
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setError("Erro de conexão. Verifique se as variáveis de ambiente do Supabase estão configuradas corretamente no AI Studio.");
      } else {
        setError(err.message || "Erro ao tentar recuperar senha.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-8 text-center text-white">
          <Truck className="w-16 h-16 mx-auto mb-4 text-blue-100" />
          <h1 className="text-3xl font-bold tracking-tight mb-2">RotaLucro</h1>
          <p className="text-blue-100 font-medium">
            SaaS Profissional para Transportadoras
          </p>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6 text-center">
            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "Entrar no Sistema"
              ) : (
                "Criar Conta Grátis"
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center space-y-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              {isLogin
                ? "Não tem uma conta? Cadastre-se"
                : "Já tem uma conta? Entre"}
            </button>

            {isLogin && (
              <button
                onClick={handleResetPassword}
                className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
              >
                Esqueceu sua senha?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
