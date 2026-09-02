import Parse from 'parse/node';

/**
 * Catalogo de APNs por operador. Lo mantiene el equipo a mano en Parse; la
 * plataforma solo lo lee para ofrecerlo en el dashboard.
 */
export default class APN extends Parse.Object {
  static className = 'APN';

  constructor() {
    super('APN');
  }

  /** Identificador legible y unico, ej. 'cl-entel-soymomo' */
  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  /** ISO-2, ej. 'CL' */
  get country(): string {
    return this.get('country');
  }

  set country(value: string) {
    this.set('country', value);
  }

  get carrier(): string {
    return this.get('carrier');
  }

  set carrier(value: string) {
    this.set('carrier', value);
  }

  /** Nombre visible del perfil, ej. 'SoyMomo Entel' */
  get name(): string {
    return this.get('name');
  }

  set name(value: string) {
    this.set('name', value);
  }

  /** El APN propiamente tal, ej. 'm2m.entel.cl' */
  get apn(): string {
    return this.get('apn');
  }

  set apn(value: string) {
    this.set('apn', value);
  }

  get mcc(): string {
    return this.get('mcc');
  }

  set mcc(value: string) {
    this.set('mcc', value);
  }

  get mnc(): string {
    return this.get('mnc');
  }

  set mnc(value: string) {
    this.set('mnc', value);
  }

  /** mcc + mnc, ej. '73001' */
  get numeric(): string {
    return this.get('numeric');
  }

  set numeric(value: string) {
    this.set('numeric', value);
  }

  /** Lista de tipos de Android separada por comas, ej. 'default,supl' */
  get type(): string {
    return this.get('type');
  }

  set type(value: string) {
    this.set('type', value);
  }

  /** Puede venir vacio: hay operadores que no piden credenciales */
  get user(): string {
    return this.get('user');
  }

  set user(value: string) {
    this.set('user', value);
  }

  get password(): string {
    return this.get('password');
  }

  set password(value: string) {
    this.set('password', value);
  }

  /** 'SOYMOMO' para nuestras SIM, 'EXTERNAL' para SIM del cliente */
  get simScope(): string {
    return this.get('simScope');
  }

  set simScope(value: string) {
    this.set('simScope', value);
  }

  get priority(): number {
    return this.get('priority');
  }

  set priority(value: number) {
    this.set('priority', value);
  }

  get enabled(): boolean {
    return this.get('enabled');
  }

  set enabled(value: boolean) {
    this.set('enabled', value);
  }

  get authType(): string {
    return this.get('authType');
  }

  set authType(value: string) {
    this.set('authType', value);
  }

  get protocol(): string {
    return this.get('protocol');
  }

  set protocol(value: string) {
    this.set('protocol', value);
  }

  get roamingProtocol(): string {
    return this.get('roamingProtocol');
  }

  set roamingProtocol(value: string) {
    this.set('roamingProtocol', value);
  }

  get mvnoType(): string {
    return this.get('mvnoType');
  }

  set mvnoType(value: string) {
    this.set('mvnoType', value);
  }

  get mvnoMatchData(): string {
    return this.get('mvnoMatchData');
  }

  set mvnoMatchData(value: string) {
    this.set('mvnoMatchData', value);
  }

  /** De donde salio el dato, ej. 'ENTEL_OFFICIAL'. Uso interno. */
  get source(): string {
    return this.get('source');
  }

  set source(value: string) {
    this.set('source', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }
}

APN.register();
