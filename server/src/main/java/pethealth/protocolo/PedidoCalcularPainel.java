/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.protocolo;

import java.util.Collections;
import java.util.List;

import pethealth.dominio.ConsultaInfo;
import pethealth.dominio.MedicamentoInfo;
import pethealth.dominio.PetInfo;
import pethealth.dominio.RegistroMedicamentoInfo;
import pethealth.dominio.VacinaInfo;

public class PedidoCalcularPainel extends Comunicado {

    public static final String TIPO = "PEDIDO_CALCULAR_PAINEL";

    private PetInfo pet;
    private List<VacinaInfo> vaccines;
    private List<MedicamentoInfo> medications;
    private List<RegistroMedicamentoInfo> medicationLogs;
    private List<ConsultaInfo> consultations;
    private String hojeStr;

    public PedidoCalcularPainel() {
        super(TIPO);
    }

    public PetInfo getPet() {
        return this.pet;
    }

    public List<VacinaInfo> getVaccines() {
        return this.vaccines != null ? this.vaccines : Collections.emptyList();
    }

    public List<MedicamentoInfo> getMedications() {
        return this.medications != null ? this.medications : Collections.emptyList();
    }

    public List<RegistroMedicamentoInfo> getMedicationLogs() {
        return this.medicationLogs != null ? this.medicationLogs : Collections.emptyList();
    }

    public List<ConsultaInfo> getConsultations() {
        return this.consultations != null ? this.consultations : Collections.emptyList();
    }

    public String getHojeStr() {
        return this.hojeStr;
    }
}
