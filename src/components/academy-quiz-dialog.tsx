import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getQuizForLesson,
  getQuizForModule,
  submitQuizAttempt,
  type QuizForStudent,
} from "@/lib/academy-progress.functions";

type Target = { scope: "lesson"; lessonId: string } | { scope: "module"; moduleId: string };

export function AcademyQuizDialog({
  open,
  onOpenChange,
  target,
  contextTitle,
  onPassed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: Target | null;
  contextTitle: string;
  onPassed: () => void;
}) {
  const fetchLessonQuiz = useServerFn(getQuizForLesson);
  const fetchModuleQuiz = useServerFn(getQuizForModule);
  const submit = useServerFn(submitQuizAttempt);

  const [quiz, setQuiz] = useState<QuizForStudent | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ passed: boolean; correct: number; total: number; left: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    setLoading(true);
    setResult(null);
    setAnswers({});
    const promise =
      target.scope === "lesson"
        ? fetchLessonQuiz({ data: { lessonId: target.lessonId } })
        : fetchModuleQuiz({ data: { moduleId: target.moduleId } });
    promise
      .then((r) => setQuiz(r.quiz))
      .catch(() => setQuiz(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.scope, (target as never as { lessonId?: string })?.lessonId, (target as never as { moduleId?: string })?.moduleId]);

  const send = async () => {
    if (!quiz) return;
    if (quiz.questions.some((q) => !answers[q.id])) {
      toast.error("Responda todas as perguntas.");
      return;
    }
    setBusy(true);
    try {
      const res = await submit({
        data: {
          quizId: quiz.quizId,
          answers: quiz.questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] as string })),
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Erro ao enviar respostas");
      setResult({
        passed: res.passed,
        correct: res.correctCount ?? 0,
        total: res.totalCount ?? 0,
        left: res.attemptsLeft ?? 0,
      });
      if (res.passed) {
        toast.success("Quiz concluído! Aula liberada como concluída.");
        onPassed();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar respostas");
    } finally {
      setBusy(false);
    }
  };

  const attemptsLeft = quiz ? Math.max(0, quiz.maxAttempts - quiz.attemptsUsed) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quiz?.title ?? "Quiz"}</DialogTitle>
          <DialogDescription>
            {contextTitle} · é preciso acertar todas as perguntas. Você tem até {quiz?.maxAttempts ?? 3} tentativas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !quiz ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ainda não há quiz cadastrado aqui.
          </p>
        ) : quiz.passed || result?.passed ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium">Quiz aprovado. Conteúdo concluído!</p>
            <Button onClick={() => onOpenChange(false)}>Continuar</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              {quiz.questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border p-4">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {q.options.map((o) => (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                          answers[q.id] === o.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === o.id}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                        />
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {result && !result.passed && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>
                  Você acertou {result.correct} de {result.total}.{" "}
                  {result.left > 0
                    ? `Tentativas restantes: ${result.left}.`
                    : "Tentativas esgotadas — reveja a aula para liberar novas tentativas."}
                </span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Tentativas restantes: {result ? result.left : attemptsLeft}
              </span>
              <Button onClick={send} disabled={busy} className="gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar respostas
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
