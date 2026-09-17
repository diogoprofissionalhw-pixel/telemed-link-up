import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { isMasterEmail } from "@/lib/master-access";
import { listAcademyCourses, type AcademyCourse } from "@/lib/academy.functions";
import { listStudentsProgress, type StudentProgressRow } from "@/lib/academy-progress.functions";

export const Route = createFileRoute("/academy/progresso")({
  head: () => ({
    meta: [
      { title: "Progresso dos alunos — Connect-Academy" },
      {
        name: "description",
        content: "Painel administrativo com o progresso e a conclusão dos alunos nas trilhas da Connect-Academy.",
      },
      { property: "og:title", content: "Progresso dos alunos — Connect-Academy" },
      { property: "og:description", content: "Acompanhe aulas concluídas, quizzes aprovados e conclusão das trilhas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user, loading } = useAuth();
  const isMaster = isMasterEmail(user?.email);
  const listCourses = useServerFn(listAcademyCourses);
  const listProgress = useServerFn(listStudentsProgress);

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [rows, setRows] = useState<StudentProgressRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCourses({ data: undefined as never })
      .then((r) => {
        setCourses(r.items);
        if (r.items[0]) setCourseId(r.items[0].id);
      })
      .catch(() => undefined);
  }, [listCourses]);

  useEffect(() => {
    if (!isMaster || !courseId) return;
    setBusy(true);
    listProgress({ data: { courseId } })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]))
      .finally(() => setBusy(false));
  }, [isMaster, courseId, listProgress]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!isMaster) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-xl font-bold">Área restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este painel está disponível apenas para a conta administradora.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/academy">
              <Button>Voltar à Academy</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royal">Progresso dos alunos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aulas concluídas, quizzes aprovados e conclusão de cada trilha.
            </p>
          </div>
          <BackButton to="/academy" label="Voltar à Academy" />
        </div>

        <div className="max-w-sm">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha a trilha" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6">
          {busy ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum aluno começou esta trilha ainda.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r) => (
                <li key={r.userId} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{r.name}</p>
                    {r.courseCompleted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <CheckCircle2 className="h-4 w-4" /> Trilha concluída
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.percent}% concluído</span>
                    )}
                  </div>
                  <Progress value={r.percent} className="mt-2 h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.lessonsCompleted} de {r.lessonsTotal} aulas · {r.quizzesPassed} quiz(zes) aprovado(s)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
