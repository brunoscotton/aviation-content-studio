import Link from "next/link";
import { signIn } from "@/app/login/actions";
import { Plane, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Link href="/" className="login-brand" aria-label="Aviation Studio — voltar ao início">
          <span className="login-brand-mark"><Plane size={24} fill="currentColor" /></span>
          <span className="login-brand-copy"><b>Aviation<span>Studio</span></b><small>CONTENT WORKSPACE</small></span>
        </Link>

        <div className="login-eyebrow">ÁREA EDITORIAL PRIVADA</div>
        <h1 id="login-title">Entre no seu workspace</h1>
        <p className="login-intro">Use seu e-mail e senha para continuar no Aviation Studio.</p>

        {params.error && <div className="login-error" role="alert">E-mail ou senha inválidos. Confira seus dados e tente novamente.</div>}

        <form action={signIn} className="login-form">
          <label htmlFor="email">E-mail</label>
          <input type="email" id="email" name="email" required autoComplete="email" placeholder="voce@exemplo.com" />
          <label htmlFor="password">Senha</label>
          <input type="password" id="password" name="password" minLength={8} required autoComplete="current-password" placeholder="Digite sua senha" />
          <Button className="login-submit" type="submit">Entrar</Button>
        </form>

        <div className="login-security"><ShieldCheck size={18} /> Acesso privado protegido pelo Supabase Auth</div>
        <Link href="/" className="login-back">← Voltar à página inicial</Link>
      </section>

      <aside className="login-aside" aria-label="Sobre o Aviation Studio">
        <div className="login-art" aria-hidden="true"><span>✦</span><div><Plane size={58} /></div><i /></div>
        <div className="login-aside-copy">
          <div className="login-eyebrow">CONTEÚDO AERONÁUTICO RESPONSÁVEL</div>
          <h2>Clareza editorial.<br />Rigor técnico.</h2>
          <p>Pesquise com fontes. Escreva com intenção. Aprove com confiança.</p>
        </div>
        <div className="login-aside-footer">AVIATION CONTENT STUDIO <span>·</span> WORKSPACE PRIVADO</div>
      </aside>
    </main>
  );
}
