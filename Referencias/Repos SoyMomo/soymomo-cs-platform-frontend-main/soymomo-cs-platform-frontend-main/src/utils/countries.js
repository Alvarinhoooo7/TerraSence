// Nombres de los paises donde hay APNs cargados. Es solo presentacion: si
// aparece uno nuevo en la base, el dropdown lo muestra igual con su codigo.
const COUNTRY_NAMES = {
    AR: 'Argentina',
    AT: 'Austria',
    BR: 'Brasil',
    CL: 'Chile',
    CO: 'Colombia',
    CR: 'Costa Rica',
    DE: 'Alemania',
    DK: 'Dinamarca',
    EC: 'Ecuador',
    ES: 'España',
    FI: 'Finlandia',
    FR: 'Francia',
    GB: 'Reino Unido',
    IT: 'Italia',
    MX: 'México',
    NL: 'Países Bajos',
    NO: 'Noruega',
    PE: 'Perú',
    PL: 'Polonia',
    PT: 'Portugal',
    SE: 'Suecia',
    US: 'Estados Unidos',
    UY: 'Uruguay',
};

export default function countryName(code) {
    return COUNTRY_NAMES[code] || code;
}
