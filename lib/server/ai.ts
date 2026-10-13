type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { code?: number; status?: string; message?: string };
};

type TavilyResponse = {
  results?: Array<{ title?: string; url?: string; content?: string }>;
  error?: string;
  message?: string;
  detail?: string;
};

export class ProviderApiError extends Error {
  constructor(readonly provider: "Gemini" | "Tavily", readonly status: number, readonly code?: string, readonly detail?: string) {
    super(`${provider} API request failed (${status})${code ? ` ${code}` : ""}`);
    this.name = "ProviderApiError";
  }
}

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function getTavilyApiKey() {
  return process.env.TAVILY_API_KEY?.trim() || null;
}

export function aiConfigurationError(feature: "pesquisa" | "geração", missing: string[]) {
  const keys = missing.join(" e ");
  return `${feature[0].toUpperCase()}${feature.slice(1)} indisponível: falta configurar ${keys} na Vercel para o ambiente deste domínio. Salve as variáveis e publique um novo deploy. As chaves devem permanecer privadas, sem o prefixo NEXT_PUBLIC_.`;
}

export function providerRequestError(feature: "Pesquisa" | "Geração", error: unknown) {
  if (error instanceof ProviderApiError) {
    if (error.status === 401 || error.status === 403) {
      const provider = error.provider === "Gemini" ? "Google Gemini" : "Tavily";
      const keyName = error.provider === "Gemini" ? "GEMINI_API_KEY" : "TAVILY_API_KEY";
      const cause = error.detail ? ` Detalhe informado pelo serviço: ${error.detail}` : "";
      const guidance = error.provider === "Gemini"
        ? "Confira no Google AI Studio se a chave está ativa, se o projeto tem acesso à Gemini API e se a chave não tem restrição incompatível."
        : "Confira se a chave está ativa e se o projeto Tavily permite o endpoint de pesquisa.";
      return `${feature}: ${provider} recusou ${keyName} (HTTP ${error.status}${error.code ? `, ${error.code}` : ""}).${cause} ${guidance}`;
    }
    if (error.status === 404 && error.provider === "Gemini") {
      return `${feature}: o modelo Gemini não está disponível para esta chave/projeto. Configure GEMINI_MODEL como gemini-3.8-flash na Vercel e publique um novo deploy.`;
    }
    if (error.status === 429) {
      return error.provider === "Gemini"
        ? `${feature} bloqueada pelo limite gratuito da API Gemini. Aguarde a renovação do limite e confira as quotas do projeto Google AI Studio.`
        : `${feature} bloqueada porque o limite gratuito mensal do Tavily foi atingido. Aguarde a renovação dos créditos ou confira o painel Tavily.`;
    }
    return `${feature}: ${error.provider} recusou a solicitação (HTTP ${error.status}). Confira os limites e as configurações da API.`;
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return `${feature} excedeu o tempo limite. Tente novamente.`;
  }
  if (error instanceof TypeError) {
    return `${feature}: o servidor não conseguiu conectar ao serviço externo. Tente novamente e consulte os logs da função na Vercel.`;
  }
  return `${feature} falhou por um erro inesperado no servidor. Consulte os logs da função na Vercel.`;
}

export async function generateWithGemini(
  prompt: string,
  options: { systemInstruction?: string; json?: boolean; signal?: AbortSignal } = {},
) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const modelsToTry = model === "gemini-2.5-flash" ? [model, "gemini-3.8-flash"] : [model];

  for (let attempt = 0; attempt < modelsToTry.length; attempt += 1) {
    const selectedModel = modelsToTry[attempt];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: options.systemInstruction ? { parts: [{ text: options.systemInstruction }] } : undefined,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: options.json ? { responseMimeType: "application/json" } : undefined,
      }),
      signal: options.signal ?? AbortSignal.timeout(50_000),
    });

    const data = await response.json() as GeminiResponse;
    if (!response.ok) {
      const detail = data.error?.message?.replaceAll(apiKey, "[chave omitida]").replace(/\s+/g, " ").slice(0, 400);
      const error = new ProviderApiError("Gemini", response.status, data.error?.status, detail);
      if (attempt < modelsToTry.length - 1 && response.status === 404) continue;
      throw error;
    }
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned no text");
    return text;
  }

  throw new Error("Gemini returned no available model");
}

export async function searchWithTavily(query: string, signal?: AbortSignal) {
  const apiKey = getTavilyApiKey();
  if (!apiKey) throw new Error("TAVILY_API_KEY is not configured");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      topic: "general",
      search_depth: "basic",
      max_results: 8,
      include_raw_content: false,
      include_answer: false,
      include_domains: ["gov.br", "anac.gov.br", "decea.mil.br", "faa.gov", "easa.europa.eu", "boeing.com", "airbus.com", "embraer.com"],
    }),
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const data = await response.json() as TavilyResponse;
  if (!response.ok) {
    const detail = (data.detail ?? data.message ?? data.error)?.replaceAll(apiKey, "[chave omitida]").replace(/\s+/g, " ").slice(0, 400);
    throw new ProviderApiError("Tavily", response.status, undefined, detail);
  }

  return (data.results ?? [])
    .filter((result): result is { title: string; url: string; content: string } => Boolean(result.title && result.url && result.content))
    .map((result) => ({ title: result.title, url: result.url, content: result.content.slice(0, 2200) }));
}
