// App/plugins/withNavigationBarContrast.js
/**
 * Con la app de borde a borde y navegación de tres botones, Android pinta un velo
 * semitransparente sobre la barra de navegación. El velo es oscuro y, sobre la barra
 * de pestañas clara del tema claro, se ve como una franja gris. Se desactiva: la barra
 * de pestañas ya reserva el área segura inferior con su propio fondo.
 */
const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

module.exports = function withNavigationBarContrast(config) {
  return withAndroidStyles(config, (mod) => {
    mod.modResults = AndroidConfig.Styles.assignStylesValue(mod.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'android:enforceNavigationBarContrast',
      value: 'false',
      targetApi: '29',
    });
    return mod;
  });
};
