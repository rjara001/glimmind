import type { CustomTypeOptions, TypeOptions } from 'i18next';
type C = CustomTypeOptions;
const a: 1 = null as unknown as C;
const b: 2 = null as unknown as TypeOptions;
export default [a, b];
