package pethealth;

public class Main {

    public static final String PORTA_PADRAO = "3000";

    public static void main(String[] args) {
        // Ação 1: processar args (só aceita a porta)
        if (args.length > 1) {
            System.err.println("Uso esperado: java pethealth.Main [porta]");
            return;
        }

        String porta = Main.PORTA_PADRAO;

        if (args.length == 1) {
            porta = args[0];
        }

        System.out.println("Servidor PetHealth - porta escolhida: " + porta);

        // Ação 2 (Etapa 2): criar ArrayList<Parceiro> usuarios
        // Ação 3 (Etapa 2): new AceitadoraDeConexao(porta, usuarios).start()
        // Tarefa 1 (Etapa 4): loop do comando "desativar"
    }
}
