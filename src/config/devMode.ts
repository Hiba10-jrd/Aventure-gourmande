
/**
 * Mode développeur.
 *
 * true  = accès direct à tous les niveaux
 * false = progression normale
 *
 * Fonctionne uniquement avec le serveur Vite
 * de développement, jamais en production.
 */
const ENABLE_DEV_MODE = true; // Mettre false pour tester la progression normale en développement.
export const DEV_MODE = import.meta.env.DEV && ENABLE_DEV_MODE;
