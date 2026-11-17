/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

import java.util.List;

import com.google.gson.annotations.SerializedName;

public class MedicamentoInfo {

    @SerializedName("_id")
    private String id;
    private String status;
    private String dataInicio;
    private String dataFim;
    private List<Integer> diasDaSemana;
    private List<String> horarios;
    private String medicamento;
    private String dose;

    public String getId() {
        return this.id;
    }

    public String getStatus() {
        return this.status;
    }

    public String getDataInicio() {
        return this.dataInicio;
    }

    public String getDataFim() {
        return this.dataFim;
    }

    public List<Integer> getDiasDaSemana() {
        return this.diasDaSemana;
    }

    public List<String> getHorarios() {
        return this.horarios;
    }

    public String getMedicamento() {
        return this.medicamento;
    }

    public String getDose() {
        return this.dose;
    }
}
