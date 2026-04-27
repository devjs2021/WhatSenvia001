import Link from "next/link";
import { Shield, Lock, Eye, Trash2, Mail, FileText, ChevronLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* Header decorativo */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-50px] left-[-50px] h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <Link 
            href="/auth/login" 
            className="inline-flex items-center text-green-100 hover:text-white mb-8 transition-colors group"
          >
            <ChevronLeft className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Política de Privacidad</h1>
          <p className="text-green-50 text-lg max-w-2xl opacity-90">
            Bajo la responsabilidad de <strong>Angel David Avendaño</strong>, en What's Envia valoramos tu privacidad y nos comprometemos a proteger tus datos personales. 
            Esta política explica cómo recopilamos, usamos y gestionamos tu información.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
            <Shield className="h-4 w-4 text-green-300" />
            <span>Última actualización: 26 de Abril, 2026</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 -mt-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 md:p-12 space-y-12">
          
          {/* Sección 1: Recopilación */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold">1. Información que Recopilamos</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Para proporcionar nuestros servicios de mensajería masiva, recopilamos la siguiente información:
            </p>
            <ul className="grid md:grid-cols-2 gap-4 mt-4">
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">Datos de Cuenta</span>
                Nombre, dirección de correo electrónico y nombre de la empresa proporcionados al registrarse.
              </li>
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">Datos de WhatsApp</span>
                Información de sesión necesaria para vincular tu cuenta de WhatsApp y permitir el envío de mensajes.
              </li>
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">Listas de Contactos</span>
                Números de teléfono y nombres que subes a nuestra plataforma para realizar tus campañas.
              </li>
              <li className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="font-bold block text-gray-900 dark:text-white mb-1">Registros de Actividad</span>
                Historial de mensajes enviados, estados de entrega y métricas de interacción.
              </li>
            </ul>
          </section>

          {/* Sección 2: Uso */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">2. Cómo Usamos tu Información</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Utilizamos los datos recopilados exclusivamente para fines operativos y de mejora del servicio:
            </p>
            <div className="grid gap-3">
              {[
                "Proporcionar, operar y mantener nuestra plataforma de mensajería.",
                "Procesar y enviar tus campañas de mensajes de manera eficiente.",
                "Generar reportes y analíticas para que puedas medir el éxito de tus envíos.",
                "Enviar notificaciones administrativas y actualizaciones de seguridad.",
                "Prevenir fraudes y asegurar el cumplimiento de nuestros términos de servicio."
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 3: Seguridad */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold">3. Protección de Datos</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Implementamos medidas de seguridad robustas para proteger tu información contra acceso no autorizado, 
              alteración o divulgación. Esto incluye cifrado SSL/TLS, firewalls y controles de acceso restringido a nuestros servidores.
              <br /><br />
              <strong className="text-gray-900 dark:text-white">Nota importante:</strong> What's Envia NO vende, alquila ni comparte tus datos personales o los de tus contactos con terceros para fines comerciales o de marketing.
            </p>
          </section>

          {/* Sección 4: Eliminación de Datos - REQUERIMIENTO FACEBOOK */}
          <section className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-10 bg-red-50/50 dark:bg-red-900/10 -mx-8 px-8 py-10 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold">4. Instrucciones para la Eliminación de Datos</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              De acuerdo con las políticas de Meta (Facebook), proporcionamos un método claro para que los usuarios soliciten la eliminación de sus datos:
            </p>
            <div className="space-y-4 mt-4">
              <p className="text-gray-700 dark:text-gray-300">
                Puedes solicitar la eliminación total de tu cuenta y todos los datos asociados de las siguientes maneras:
              </p>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                    <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <span className="block font-bold text-lg">Contacto Directo</span>
                    <p className="text-gray-500 dark:text-gray-400">
                      Envía una solicitud a <span className="text-red-600 dark:text-red-400 font-medium">soporte@whatsenvia.com</span> o comunícate al <span className="text-red-600 dark:text-red-400 font-medium">+57 350 5193801</span>.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Una vez recibida la solicitud, procesaremos la eliminación definitiva en un plazo máximo de 72 horas hábiles. 
                Este proceso es irreversible y eliminará contactos, historial de mensajes y credenciales.
              </p>
            </div>
          </section>

          {/* Sección 5: Responsable y Contacto */}
          <section className="space-y-6 border-t border-gray-100 dark:border-gray-800 pt-10 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Responsable del Tratamiento de Datos</h2>
            <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
              <p className="font-semibold text-gray-900 dark:text-white text-lg">Angel David Avendaño</p>
              <p>Cll 133 #91-45, Bogotá, Colombia</p>
              <p>Teléfono: +57 350 5193801</p>
              <p>Email: soporte@whatsenvia.com</p>
            </div>
            <div className="pt-4">
              <a 
                href="mailto:soporte@whatsenvia.com" 
                className="inline-flex items-center justify-center px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all hover:scale-105"
              >
                Contactar Soporte
              </a>
            </div>
          </section>
        </div>
        
        <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
          © 2026 What's Envia. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
