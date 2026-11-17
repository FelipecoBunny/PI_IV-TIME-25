/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.protocolo;

public class PedidoParaSair extends Comunicado {

    public static final String TIPO = "PEDIDO_PARA_SAIR";

    public PedidoParaSair() {
        super(TIPO);
    }
}
