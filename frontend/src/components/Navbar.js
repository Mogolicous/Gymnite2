import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User, Shield } from "lucide-react";
import { LOGO_URL } from "@/lib/brand";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const onLanding = location.pathname === "/";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl bg-[#050505]/70 border-b border-white/5"
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" data-testid="nav-logo">
          <img
            src={LOGO_URL}
            alt="GymNite"
            className="h-12 w-12 object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.45)]"
            data-testid="nav-logo-img"
          />
          <span className="text-lg font-semibold tracking-tight">
            Gym<span className="text-purple-400">Nite</span>
          </span>
        </Link>

        {onLanding && (
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#beneficios" className="hover:text-white transition-colors" data-testid="nav-beneficios">
              Beneficios
            </a>
            <a href="#horarios" className="hover:text-white transition-colors" data-testid="nav-horarios">
              Horarios
            </a>
            <a href="#sobre-nosotros" className="hover:text-white transition-colors" data-testid="nav-sobre-nosotros">
              Sobre Nosotros
            </a>
            <a href="#registrarme" className="hover:text-white transition-colors" data-testid="nav-registrarme">
              Registrarme
            </a>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && user.role ? (
            <>
              {user.role === "admin" ? (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
                  data-testid="nav-admin-link"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className="hidden sm:inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
                  data-testid="nav-dashboard-link"
                >
                  <User className="h-4 w-4" /> Mi Cuenta
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 hover:border-purple-500/50 px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
                data-testid="nav-logout-btn"
              >
                <LogOut className="h-4 w-4" /> Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
                data-testid="nav-login-link"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="gn-btn-primary text-sm"
                data-testid="nav-register-link"
              >
                Registrarme
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
