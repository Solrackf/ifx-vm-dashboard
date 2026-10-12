# Contribuir al proyecto

## Flujo de trabajo

1. Crea una rama desde `main` para cada cambio.
2. Usa prefijos claros para las ramas: `feat/`, `fix/`, `docs/`, `refactor/` o `chore/`.
3. Mantén los cambios enfocados, ejecuta `npm run format:check` y `npm run build` antes de integrarlos.
4. Revisa `git diff` y `git status` antes de confirmar los cambios.

## Mensajes de commit

Usamos Conventional Commits, en inglés, con este formato:

```text
<type>(<scope>): <summary>
```

Tipos habituales: `feat`, `fix`, `docs`, `refactor`, `test`, `chore` y `build`. Ejemplos:

- `feat(api): add role-protected VM endpoints`
- `fix(web): restore VM state when an update fails`
- `docs: add local setup and usage guide`

El resumen debe describir el cambio de forma concreta y comenzar con minúscula. Evita commits que mezclen funcionalidades sin relación.

## Seguridad

- No confirmes `.env`, credenciales reales, tokens, bases de datos locales ni archivos generados.
- Actualiza `.env.example` cuando cambien las variables requeridas, usando únicamente valores ilustrativos.
