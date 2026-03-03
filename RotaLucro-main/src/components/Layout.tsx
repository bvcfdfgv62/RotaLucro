import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Truck, LayoutDashboard, PlusCircle, LogOut, Users, Package } from "lucide-react";

export const Layout = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Nova Viagem", href: "/nova-viagem", icon: PlusCircle },
    { name: "Agregados", href: "/agregados", icon: Users },
    { name: "Cargas", href: "/cargas", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center space-x-3">
          <Truck className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold tracking-tight">ROTA LUCRO</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <p className="text-xs text-slate-400 mb-1">Logado como</p>
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center space-x-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
