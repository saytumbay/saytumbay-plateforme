import { SensorsPage } from "@/features/shared/SensorsTable";

export default function OnionSensors() {
  return <SensorsPage kinds={["stockage", "air"]} title="Sondes de stockage" subtitle="Une sonde au cœur de chaque rangée et une sonde d’ambiance par magasin." detailBase="/app/onion/capteurs" addLabel="Ajouter une sonde" />;
}
