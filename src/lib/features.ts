/**
 * Chaves de recursos da plataforma.
 *
 * showPricing: quando `false`, a página "Planos e Preços" sai da navegação,
 * a rota /valores redireciona para a home e as janelas de planos não abrem.
 * Basta trocar para `true` para reativar tudo, sem nenhuma outra alteração.
 *
 * Backlog (próxima etapa, não implementado neste MVP):
 * - Emissão de certificado ao final do curso.
 * - Benefícios/vantagens exclusivos para alunos pagantes.
 */
export const features = {
  showPricing: false,
} as const;
