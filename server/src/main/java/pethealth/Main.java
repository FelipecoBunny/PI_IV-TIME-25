/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth;

import java.util.ArrayList;
import java.util.Scanner;

import pethealth.protocolo.ComunicadoDeDesligamento;
import pethealth.rede.AceitadoraDeConexao;
import pethealth.rede.Parceiro;

public class Main {

    public static final String PORTA_PADRAO = "4000";

    public static void main(String[] args) {
        if (args.length > 1) {
            System.err.println("Uso esperado: java pethealth.Main [porta]");
            return;
        }

        String porta = Main.PORTA_PADRAO;

        if (args.length == 1) {
            porta = args[0];
        }

        ArrayList<Parceiro> usuarios = new ArrayList<>();

        AceitadoraDeConexao aceitadoraDeConexao;
        try {
            aceitadoraDeConexao = new AceitadoraDeConexao(porta, usuarios);
            aceitadoraDeConexao.start();
        } catch (Exception erro) {
            System.err.println("Escolha uma porta apropriada e liberada para uso.");
            return;
        }

        System.out.println("Servidor PetHealth ativo na porta " + porta + ".");

        try (Scanner teclado = new Scanner(System.in)) {
            for (;;) {
                System.out.println("O servidor esta ativo. Para desativa-lo, use o comando \"desativar\"\n");
                System.out.print("> ");

                if (!teclado.hasNextLine()) {
                    break;
                }

                String comando = teclado.nextLine().trim();

                if (comando.toLowerCase().equals("desativar")) {
                    synchronized (usuarios) {
                        ComunicadoDeDesligamento comunicadoDeDesligamento = new ComunicadoDeDesligamento();
                        for (Parceiro usuario : usuarios) {
                            try {
                                usuario.receba(comunicadoDeDesligamento);
                                usuario.adeus();
                            } catch (Exception erro) {
                                // Ignora cliente já desconectado
                            }
                        }
                    }

                    System.out.println("O servidor está desativado.");
                    System.exit(0);
                } else {
                    System.err.println("Comando invalido. Use \"desativar\" para desativar o servidor.");
                }
            }
        }
    }
}
