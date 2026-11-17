/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

import com.google.gson.annotations.SerializedName;

public class VacinaInfo {

    @SerializedName("_id")
    private String id;
    private String status;
    private String proximaDose;
    private String titulo;

    public String getId() {
        return this.id;
    }

    public String getStatus() {
        return this.status;
    }

    public String getProximaDose() {
        return this.proximaDose;
    }

    public String getTitulo() {
        return this.titulo;
    }
}
