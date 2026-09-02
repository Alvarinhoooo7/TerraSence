import * as React from 'react';
import { useMemo, useState } from 'react';
import { Input } from 'antd';
import CardHeader from './CardHeader';
import styles from '../styles/TabletAppsCard.module.css';

const FILTERS = [
    { id: 'all', label: 'Todas', match: () => true },
    { id: 'installed', label: 'Instaladas', match: (app) => app.installed },
    { id: 'notInstalled', label: 'No instaladas', match: (app) => !app.installed },
    { id: 'allowed', label: 'Permitidas', match: (app) => app.allowed },
    { id: 'blocked', label: 'No permitidas', match: (app) => !app.allowed },
];

export default function TabletAppsCard({ apps = [], handleRefresh }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const visibleApps = useMemo(() => {
        const term = search.trim().toLowerCase();
        return apps
            .filter(FILTERS.find(({ id }) => id === filter)?.match ?? (() => true))
            .filter((app) => !term || (app.appName || '').toLowerCase().includes(term))
            .sort((a, b) => (a.appName || '').localeCompare(b.appName || ''));
    }, [apps, search, filter]);

    return (
        <CardHeader
            title="Aplicaciones"
            subtitle={`Tablet · ${apps.length} instaladas`}
            leftIcon="/images/tableIcons/cs-aplicationsTablet.svg"
            leftIconWidth={38}
            leftIconHeight={29}
            handleRefresh={handleRefresh}
        >
            <div className={styles.toolbar}>
                <Input.Search
                    placeholder="Filtrar por nombre"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    style={{ width: 260 }}
                />
                <div className={styles.filterGroup}>
                    {FILTERS.map(({ id, label }) => (
                        <button
                            key={id}
                            className={filter === id ? styles.filterActive : styles.filter}
                            onClick={() => setFilter(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <span className={styles.count}>{visibleApps.length} resultados</span>
            </div>

            {visibleApps.length === 0 ? (
                <p className={styles.empty}>No hay aplicaciones que coincidan.</p>
            ) : (
                <div className={styles.appGrid}>
                    {visibleApps.map((app) => (
                        <div key={app.key} className={styles.appRow}>
                            <span className={styles.appName} title={app.appName}>{app.appName}</span>
                            <div className={styles.badges}>
                                <span
                                    className={app.installed ? styles.badgeOn : styles.badgeOff}
                                    title={app.installed ? 'Instalada' : 'No instalada'}
                                >
                                    {app.installed ? 'Inst.' : 'No inst.'}
                                </span>
                                <span
                                    className={app.allowed ? styles.badgeAllowed : styles.badgeBlocked}
                                    title={app.allowed ? 'Permitida' : 'No permitida'}
                                >
                                    {app.allowed ? 'Permit.' : 'Bloq.'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardHeader>
    );
}
