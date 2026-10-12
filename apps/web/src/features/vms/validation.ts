import type { VmInput } from '../../api';

export function validateVmField<K extends keyof VmInput>(key: K, value: VmInput[K]): string {
  if (key === 'name') {
    const name = String(value).trim();
    if (name.length < 2) return 'Usa al menos 2 caracteres.';
    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) {
      return 'Usa letras, números, espacios, puntos, guiones o guiones bajos.';
    }
  }

  if (key === 'cores' && (Number(value) < 1 || Number(value) > 128)) {
    return 'El valor debe estar entre 1 y 128.';
  }

  if (key === 'ram' && (Number(value) < 1 || Number(value) > 2048)) {
    return 'El valor debe estar entre 1 y 2.048 GB.';
  }

  if (key === 'disk' && (Number(value) < 1 || Number(value) > 10000)) {
    return 'El valor debe estar entre 1 y 10.000 GB.';
  }

  if (key === 'os' && String(value).trim().length < 2) {
    return 'Indica el sistema operativo.';
  }

  return '';
}
