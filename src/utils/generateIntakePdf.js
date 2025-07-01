import jsPDF from "jspdf";

export function generateIntakePdf(form) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Patientenaufnahmeformular", 20, 20);

  const fields = [
    ["Vorname", form.firstName],
    ["Nachname", form.lastName],
    ["Geburtsdatum", form.dob],
    ["Geschlecht", form.gender],
    ["Adresse", form.address],
    ["Telefon", form.phone],
    ["E-Mail", form.email],
    ["Versicherungsart", form.insurerType],
    ["Versicherer", form.insurer],
    ["Versichertennummer", form.insuranceNumber],
    ["Allergien", form.allergies],
    ["Medikamente", form.medications],
  ];

  let y = 30;
  fields.forEach(([label, value]) => {
    doc.setFontSize(12);
    doc.text(`${label}: ${value || "—"}`, 20, y);
    y += 10;
  });

  return doc;
}
