import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Cache em memória dos municípios por UF (IBGE)
const cache = new Map<string, string[]>();

async function fetchMunicipios(uf: string): Promise<string[]> {
  if (cache.has(uf)) return cache.get(uf)!;
  const res = await fetch(
    `https://servicos.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
  );
  if (!res.ok) throw new Error("Falha ao carregar municípios");
  const data: Array<{ nome: string }> = await res.json();
  const list = data
    .map((m) => m.nome)
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  cache.set(uf, list);
  return list;
}

interface Props {
  uf: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function MunicipioSelect({ uf, value, onChange, placeholder = "Selecione o município", disabled, id }: Props) {
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uf) {
      setList([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    fetchMunicipios(uf)
      .then((l) => { if (!cancel) setList(l); })
      .catch(() => { if (!cancel) setList([]); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [uf]);

  const noUf = !uf;
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || noUf || loading}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={noUf ? "Selecione a UF primeiro" : loading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {loading && (
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando municípios...
          </div>
        )}
        {!loading && list.length === 0 && uf && (
          <div className="px-2 py-2 text-sm text-muted-foreground">Nenhum município encontrado.</div>
        )}
        {list.map((m) => (
          <SelectItem key={m} value={m}>{m}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
