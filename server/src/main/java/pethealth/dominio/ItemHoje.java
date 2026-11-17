/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

public class ItemHoje {

    private final String id;
    private final String tipo;
    private final String titulo;
    private final String registro;

    public ItemHoje(String id, String tipo, String titulo, String registro) {
        this.id = id;
        this.tipo = tipo;
        this.titulo = titulo;
        this.registro = registro;
    }

    public String getId() {
        return this.id;
    }

    public String getTipo() {
        return this.tipo;
    }

    public String getTitulo() {
        return this.titulo;
    }

    public String getRegistro() {
        return this.registro;
    }
}
