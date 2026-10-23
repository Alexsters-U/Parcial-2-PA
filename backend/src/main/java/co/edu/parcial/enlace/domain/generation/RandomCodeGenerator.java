package co.edu.parcial.enlace.domain.generation;

import java.security.SecureRandom;

public final class RandomCodeGenerator implements CodeGenerator {
    private static final String ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private final SecureRandom random = new SecureRandom();

    @Override
    public String generate(String originalUrl) {
        StringBuilder code = new StringBuilder(8);
        for (int i = 0; i < 8; i++) code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        return code.toString();
    }
}
