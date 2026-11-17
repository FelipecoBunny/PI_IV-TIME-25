/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

import com.google.gson.annotations.SerializedName;

public class ConsultaInfo {

    @SerializedName("_id")
    private String id;
    private String status;
    private String data;
    private String motivo;
    private String horario;

    public String getId() {
        return this.id;
    }

    public String getStatus() {
        return this.status;
    }

    public String getData() {
        return this.data;
    }

    public String getMotivo() {
        return this.motivo;
    }

    public String getHorario() {
        return this.horario;
    }
}
