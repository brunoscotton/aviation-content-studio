import Link from "next/link";
import { signIn } from "@/app/login/actions";
import { Plane, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="login-page"><section className="login-card"><div className="login-brand"><div className="brand-mark"><Plane size={20} fill="currentColor"/></div><div><b>Aviation<span>Studio</span></b><small>CONTENT WORKSPACE</small></div></div><div className="eyebrow">ÁREA EDITORIAL PRIVADA</div><h1>Entre no seu workspace</h1><p>Use seu acesso do Supabase para continuar.</p>{params.error && <div className="login-error">E-mail ou senha inválidos. Confira seus dados e tente novamente.</div>}<form action={signIn}><label htmlFor="email">E-mail</label><input type="email" id="email" name="email" required autoComplete="email" placeholder="voce@exemplo.com"/><label htmlFor="password">Senha</label><input type="password" id="password" name="password" minLength={8} required autoComplete="current-password" placeholder="••••••••••"/><Button className="login-submit" type="submit">Entrar</Button></form><div className="login-security"><ShieldCheck size={15}/> Acesso privado protegido pelo Supabase Auth</div><Link href="/" className="login-back">← Voltar</Link></section><div className="login-aside"><div className="login-art"><span>✦</span><Plane size={50}/><i/></div><h2>Clareza editorial.<br/>Rigor técnico.</h2><p>Pesquise com fontes. Escreva com intenção. Aprove com confiança.</p></div></main>;
}
