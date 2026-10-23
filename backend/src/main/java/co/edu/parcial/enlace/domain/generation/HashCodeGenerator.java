package co.edu.parcial.enlace.domain.generation;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class HashCodeGenerator implements CodeGenerator {
    @Override
    public String generate(String originalUrl) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(originalUrl.getBytes(StandardCharsets.UTF_8));
            // Base 36 alfanumérica. El relleno garantiza 9 caracteres incluso con ceros iniciales.
            String padded = "000000000" + new BigInteger(1, digest).toString(36);
            return padded.substring(padded.length() - 9);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no está disponible en este JRE.", e);
        }
    }
}
