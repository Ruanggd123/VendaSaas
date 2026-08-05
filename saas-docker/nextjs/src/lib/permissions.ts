import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { normalizePlanId } from "@/lib/plans";
import {
  MODULES,
  MODULE_LABELS,
  PLAN_MODULES,
  getPlanModules,
  planHas,
  getPlanDetails,
  type ModuleId,
  type Plan,
} from "@/lib/plans";

export {
  MODULES,
  MODULE_LABELS,
  PLAN_MODULES,
  getPlanModules,
  planHas,
  getPlanDetails,
};
export type { ModuleId, Plan };

// Helper server-side para rotas de API: retorna null se autorizado ou um
// NextResponse de erro (401/403) se o plano do tenant não inclui o módulo.
export async function assertModule(module: ModuleId): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Super Admin e Parceiro (em degustação de 1h) têm acesso global à plataforma
  if (session.role === "superadmin" || session.role === "partner") {
    return null;
  }

  const plan = session.tenant_plan || "solo";
  if (!planHas(plan, module)) {
    return NextResponse.json(
      {
        error: `Seu plano atual não inclui o módulo "${MODULE_LABELS[module]}". Faça upgrade para liberar esse recurso.`,
        module,
        plan: normalizePlanId(plan),
      },
      { status: 403 }
    );
  }

  return null;
}