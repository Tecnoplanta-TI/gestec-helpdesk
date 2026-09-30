export function newPasswordValidationError(
  password: string,
  confirmation: string,
) {
  if (password.length < 8) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  if (password !== confirmation) {
    return "As senhas não coincidem.";
  }
  return null;
}
