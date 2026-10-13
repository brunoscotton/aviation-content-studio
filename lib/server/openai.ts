import { APIConnectionError, APIError, AuthenticationError, NotFoundError, PermissionDeniedError, RateLimitError } from "openai";

export function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function openAIConfigurationError(feature: "pesquisa" | "geração") {
  return `${feature[0].toUpperCase()}${feature.slice(1)} indisponível: a implantação em execução não recebeu OPENAI_API_KEY. Na Vercel, confirme o nome exato da variável, marque Production para o ambiente deste domínio e faça um novo deploy após salvar. A chave deve permanecer privada, sem o prefixo NEXT_PUBLIC_.`;
}

export function openAIRequestError(feature: "Pesquisa" | "Geração", error: unknown) {
  if (error instanceof APIConnectionError) {
    return `${feature}: o servidor não conseguiu conectar à API OpenAI. Tente novamente e consulte os logs da função na Vercel.`;
  }
  if (error instanceof AuthenticationError) {
    return `${feature} não autorizada: a OpenAI rejeitou a chave recebida pelo servidor (HTTP 401). Crie uma nova chave secreta na plataforma OpenAI e atualize OPENAI_API_KEY na Vercel.`;
  }
  if (error instanceof PermissionDeniedError) {
    return `${feature} sem permissão na OpenAI (HTTP 403). Confira se o projeto da chave tem acesso ao modelo e à ferramenta de pesquisa.`;
  }
  if (error instanceof NotFoundError) {
    return `${feature} não disponível: o modelo configurado não foi encontrado ou não está habilitado para este projeto OpenAI. Confira OPENAI_MODEL na Vercel.`;
  }
  if (error instanceof RateLimitError) {
    const code = error.code ? ` Código: ${error.code}.` : "";
    return `${feature} bloqueada por limite ou crédito da API OpenAI (HTTP 429). Confira o uso e os limites do projeto OpenAI.${code}`;
  }
  if (error instanceof APIError) {
    return `${feature} recusada pela API OpenAI (HTTP ${error.status ?? "desconhecido"}). Código: ${error.code ?? "não informado"}. ID da solicitação: ${error.requestID ?? "não informado"}.`;
  }
  return `${feature} falhou por um erro inesperado no servidor. Consulte os logs da função na Vercel.`;
}
