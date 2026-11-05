export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Sessão inválida ou expirada. Faça login novamente." });
  }
  next();
}