import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getCompanyAcademyOverview,
  type CompanyStudentOverview,
} from "@/lib/academy-company.functions";

/**
 * Card do painel da empresa: progresso na Academy dos profissionais que a
 * própria empresa vinculou (equipe cadastrada no painel da Academy).
 */
export function AcademyTeamProgress() {
  const overviewFn = useServerFn(getCompanyAcademyOverview);
  const [items, setItems] = useState<CompanyStudentOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    overviewFn({ data: undefined as never })
      .then((r) => {
        if (active) setItems(r.items);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [overviewFn]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Connect-Academy
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Progresso dos alunos da sua equipe</h2>
        </div>
        <Link to="/academy/empresa">
          <Button size="sm" variant="outline" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> Gerenciar equipe
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Nenhum profissional cadastrado na sua equipe.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vincule profissionais no painel da Academy para acompanhar o progresso deles aqui.
          </p>
          <div className="mt-4 flex justify-center">
            <Link to="/academy/empresa">
              <Button size="sm">Cadastrar profissionais</Button>
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li
              key={s.doctorId}
              className="rounded-xl border bg-card p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.specialty ?? "Médico"}</p>
                </div>
                {s.lessonsTotal > 0 && s.lessonsCompleted === s.lessonsTotal ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Concluído
                  </span>
                ) : (
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">{s.percent}%</span>
                )}
              </div>
              <Progress value={s.percent} className="mt-2 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {s.lessonsCompleted} de {s.lessonsTotal} aulas · {s.quizzesPassed} quiz(zes) aprovado(s)
                {s.coursesCompleted > 0 && ` · ${s.coursesCompleted} trilha(s) concluída(s)`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
