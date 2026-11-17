package pethealth.protocolo;

public class RespostaErro extends Comunicado {

    public static final String TIPO = "ERRO";
    private final String mensagem;

    public RespostaErro(String mensagem) {
        super(TIPO);
        this.mensagem = mensagem;
    }

    public String getMensagem() {
        return this.mensagem;
    }
}
