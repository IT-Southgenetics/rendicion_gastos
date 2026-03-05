import { NewReportForm } from "@/components/reports/NewReportForm";

export default function NewReportPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Nueva rendición</h1>
        <p className="page-subtitle">
          Definí el período y comenzá a cargar gastos.
        </p>
      </div>
      <div className="card p-6">
        <NewReportForm />
      </div>
    </div>
  );
}
