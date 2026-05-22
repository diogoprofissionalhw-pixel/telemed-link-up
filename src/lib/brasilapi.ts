// Consulta de CNPJ via BrasilAPI (gratuita, sem API key).
// Docs: https://brasilapi.com.br/docs#tag/CNPJ
import { onlyDigits } from "./validators";

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string; // "ATIVA", "BAIXADA", "SUSPENSA", "INAPTA", "NULA"
  cnae_codigo: string;
  cnae_descricao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  is_health: boolean;
}

// CNAEs da Divisão 86 (Atividades de atenção à saúde humana) e correlatos.
// Aceita também 87 (assist. social com hospedagem) e 75 (veterinários — não), foco em 86/87/47.7 (farmácia).
function isHealthCnae(code: string): boolean {
  if (!code) return false;
  const c = onlyDigits(code);
  // Saúde humana: 86xx; Assistência social com hospedagem: 87xx; Farmácias: 4771-7
  return /^86/.test(c) || /^87/.test(c) || /^4771/.test(c) || /^4772/.test(c);
}

export async function lookupCNPJ(cnpj: string): Promise<CNPJData> {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) throw new Error("CNPJ deve ter 14 dígitos.");

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  if (res.status === 404) throw new Error("CNPJ não encontrado na Receita Federal.");
  if (!res.ok) throw new Error("Não foi possível consultar a Receita Federal. Tente novamente.");

  const j: any = await res.json();
  const situacao = String(j.descricao_situacao_cadastral ?? "").toUpperCase();
  const cnaeCodigo = String(j.cnae_fiscal ?? "");
  const cnaeDescricao = String(j.cnae_fiscal_descricao ?? "");
  const logradouro = [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(" ");

  return {
    cnpj: digits,
    razao_social: j.razao_social ?? "",
    nome_fantasia: j.nome_fantasia || null,
    situacao,
    cnae_codigo: cnaeCodigo,
    cnae_descricao: cnaeDescricao,
    logradouro,
    numero: j.numero ?? "",
    complemento: j.complemento ?? "",
    bairro: j.bairro ?? "",
    cep: j.cep ?? "",
    municipio: j.municipio ?? "",
    uf: j.uf ?? "",
    is_health: isHealthCnae(cnaeCodigo),
  };
}

export function formatAddress(d: CNPJData): string {
  const linha1 = [d.logradouro, d.numero, d.complemento].filter(Boolean).join(", ");
  const linha2 = [d.bairro, `${d.municipio}/${d.uf}`].filter(Boolean).join(" - ");
  const cep = d.cep ? ` - CEP ${d.cep}` : "";
  return [linha1, linha2].filter(Boolean).join(" • ") + cep;
}
