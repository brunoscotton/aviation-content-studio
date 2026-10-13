export function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function openAIConfigurationError(feature: "pesquisa" | "geração") {
  return `${feature[0].toUpperCase()}${feature.slice(1)} indisponível: a implantação em execução não recebeu OPENAI_API_KEY. Na Vercel, confirme o nome exato da variável, marque Production para o ambiente deste domínio e faça um novo deploy após salvar. A chave deve permanecer privada, sem o prefixo NEXT_PUBLIC_.`;
}
