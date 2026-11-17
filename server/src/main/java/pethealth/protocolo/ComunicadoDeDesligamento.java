package pethealth.protocolo;

public class ComunicadoDeDesligamento extends Comunicado {

    public static final String TIPO = "COMUNICADO_DESLIGAMENTO";

    public ComunicadoDeDesligamento() {
        super(TIPO);
    }
}
