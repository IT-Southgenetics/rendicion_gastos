import { NewAdvanceForm } from "@/components/advances/NewAdvanceForm";

export default function NewAdvancePage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Solicitar anticipo</h1>
        <p className="page-subtitle">
          Completa los datos del anticipo y envia la solicitud al aprobador asignado.
        </p>
      </div>
      <div className="card p-6">
        <NewAdvanceForm />
      </div>
    </div>
  );
}
