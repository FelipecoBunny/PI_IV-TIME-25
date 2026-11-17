/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.protocolo;

import java.io.Serializable;

public class Comunicado implements Serializable {

    private final String tipo;

    public Comunicado(String tipo) {
        this.tipo = tipo;
    }

    public String getTipo() {
        return this.tipo;
    }
}
