import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/yuri/PageHeader";
import { ProjectCard } from "@/components/yuri/ProjectCard";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/projetos/")({
  head: () => ({
    meta: [
      { title: "Projetos · YURI OS" },
      {
        name: "description",
        content:
          "Projetos ativos com objetivo, progresso, próximo marco, próxima ação e prazo.",
      },
      { property: "og:title", content: "Projetos · YURI OS" },
      {
        property: "og:description",
        content: "Projetos ativos com progresso, próximo marco e próxima ação.",
      },
    ],
  }),
  component: ProjetosPage,
});

function ProjetosPage() {
  const { projects } = useStore();

  return (
    <div>
      <PageHeader
        title="Projetos"
        subtitle={`${projects.length} projetos ativos`}
      />
      <div className="space-y-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
