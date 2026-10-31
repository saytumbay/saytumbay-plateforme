import { SensorsPage } from "@/features/shared/SensorsTable";

export default function Sensors() {
  return <SensorsPage kinds={["sol", "passerelle"]} title="Capteurs" subtitle="Capteurs de sol des parcelles et passerelles LoRaWAN : état, batterie, signal." detailBase="/app/capteurs" addLabel="Ajouter un capteur" />;
}
