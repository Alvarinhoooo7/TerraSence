import React, { useState, useEffect } from 'react';
import CardHeader from './CardHeader';
import styles from '../styles/AppListCard.module.css';

export default function AppListCard({ apps, handleRefresh, watchStatusUpdatedAt }) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const smallScreen = width <= 1500;
      setIsSmallScreen(smallScreen);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatStatusDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <CardHeader
      title="Apps instaladas"
      subtitle="Aplicaciones del reloj"
      leftIcon="/images/cs-installedApps.svg"
      leftIconWidth={24}
      leftIconHeight={24}
      handleRefresh={handleRefresh}
    >
      {watchStatusUpdatedAt && (
        <div className={styles.updateInfo}>
          Actualizado: {formatStatusDate(watchStatusUpdatedAt)}
        </div>
      )}
      <div className={(!apps || apps.length === 0) ? `${styles.container} ${styles.emptyMessage}` : styles.container}>
        {(!apps || apps.length === 0) ? (
          <span>No hay apps encontradas.</span>
        ) : (
          <div className={`${styles.appsGrid} ${isSmallScreen ? styles.gridSingleColumn : styles.gridMultiColumn}`}>
            {[...apps]
              .sort((a, b) => {
                const nameA = (a.storeInfo?.name || a.packageName).toLowerCase();
                const nameB = (b.storeInfo?.name || b.packageName).toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .map((app) => (
              <div key={app.packageName} className={styles.appCard}>
                {app.storeInfo && app.storeInfo.image && app.storeInfo.image.url ? (
                  <img
                    src={app.storeInfo.image.url}
                    alt={app.storeInfo.name}
                    className={styles.appIcon}
                  />
                ) : (
                  <div className={styles.appIconPlaceholder} />
                )}
                <div className={styles.appContent}>
                  <div className={styles.appName}>
                    {app.storeInfo?.name || app.packageName}
                  </div>
                  <div className={styles.packageName}>
                    {app.packageName}
                  </div>
                  <div className={styles.versionInfo}>v{app.versionName} ({app.versionCode})</div>
                  <div className={styles.updateDate}>
                    Actualizado: {formatDate(app.lastUpdateTime)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardHeader>
  );
}
