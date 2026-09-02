import React, { useState } from 'react';
import { Button, message, Pagination } from 'antd';
import axios from 'axios';
import styles from '../styles/PaymentHistory.module.css';
import sharedStyles from '../styles/Common.module.css';
import { useAuth } from "../authContext";

export function PaymentHistory({ apioSubscriptionId, paymentId, stripeSubscriptionId, createdGte, createdLte }) {
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState(null);
    const [storeInfo, setStoreInfo] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const ITEMS_PER_PAGE = 5;
    const { tokens } = useAuth();

    const isStripe = Boolean(stripeSubscriptionId);
    const subscriptionId = stripeSubscriptionId || apioSubscriptionId || paymentId;
    const API_BASE_URL = process.env.REACT_APP_BACKEND_HOST;

    const handleViewPayments = async () => {
        if (!subscriptionId) {
            message.error('ID de suscripción no disponible');
            return;
        }

        setLoading(true);
        try {
            const url = isStripe
                ? `${API_BASE_URL}/api/v1/stripe/subscriptions/${encodeURIComponent(subscriptionId)}/transactions`
                : `${API_BASE_URL}/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/transactions`;

            const headers = {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            };

            // Patrón del repo: siempre se envía Bearer token al backend
            if (!tokens?.AccessToken) {
                message.error('Sesión expirada, por favor recarga la página');
                return;
            }
            headers.Authorization = `Bearer ${tokens.AccessToken}`;

            const params = {};
            if (isStripe) {
                if (typeof createdGte !== 'undefined') params.createdGte = createdGte;
                if (typeof createdLte !== 'undefined') params.createdLte = createdLte;
            }

            const response = await axios.get(url, { headers, params });

            const data = response.data?.data;
            if (Array.isArray(data?.transactions)) {
                const transactionData = data.transactions;
                setTransactions(transactionData);
                setTotalTransactions(transactionData.length);
                setCurrentPage(1);
                setStoreInfo(isStripe ? { store: data.store, storeDomain: data.storeDomain } : null);
                if (transactionData.length === 0) {
                    message.info('No hay transacciones disponibles');
                }
            } else {
                message.error('Formato de respuesta inesperado');
            }
        } catch (error) {
            if (error.response?.status === 401) {
                message.error('Sesión expirada, por favor recarga la página');
            } else if (error.response?.status === 404) {
                message.error(`No se encontraron transacciones para esta suscripción${isStripe ? ' (Stripe)' : ''}`);
            } else {
                message.error(`Error al obtener el historial de pagos${isStripe ? ' (Stripe)' : ''}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const getCurrentPageTransactions = () => {
        if (!transactions) return [];
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return transactions.slice(startIndex, endIndex);
    };

    const formatAmount = (amount, currency = 'CLP') => {
        if (amount === null || typeof amount === 'undefined') return '-';
        const numericAmount = Number(amount);
        if (Number.isNaN(numericAmount)) return '-';
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(numericAmount);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const getStatusPresentation = (rawStatus) => {
        const status = (rawStatus || '').toString().trim().toLowerCase();

        // Nota: Apio/Stripe pueden enviar variaciones; preferimos mapear explícitamente
        // para no mostrar todo lo no-completed como "Fallido".
        const map = {
            completed: { label: 'Completado', className: '' },
            success: { label: 'Completado', className: '' },
            paid: { label: 'Completado', className: '' },

            failed: { label: 'Fallido', className: styles.failed },
            error: { label: 'Fallido', className: styles.failed },

            canceled: { label: 'Cancelado', className: styles.failed },
            cancelled: { label: 'Cancelado', className: styles.failed },
            void: { label: 'Cancelado', className: styles.failed },

            reversed: { label: 'Revertido', className: styles.reversed },
            refunded: { label: 'Reembolsado', className: styles.reversed },

            pending: { label: 'Pendiente', className: styles.pending },
            processing: { label: 'Procesando', className: styles.pending },
            requires_action: { label: 'Requiere acción', className: styles.pending },
        };

        if (map[status]) return map[status];
        if (!status) return { label: 'Desconocido', className: styles.unknown };

        // Fallback: mostramos el status original para no ocultar nuevos estados del API
        return { label: status, className: styles.unknown };
    };

    const getStoreBadgeLabel = ({ isStripe, storeDomain }) => {
        if (!isStripe) return 'apio';
        if (!storeDomain) return 'stripe';

        const normalized = storeDomain.toString().trim().toLowerCase();
        if (normalized === 'soymomo.es') return 'stripe.soymomo.es';
        if (normalized === 'soymomo.us') return 'stripe.soymomo.us';

        return 'stripe';
    };

    return (
        <div className={sharedStyles.generalCard}>
            <div className={styles.structureContainer}>
                <div className={styles.textContainer}>
                    <div className={styles.titlesCont}>
                        <h1 className={sharedStyles.iconTitle}>
                            Historial de Pagos
                            {(() => {
                                const badge = getStoreBadgeLabel({ isStripe, storeDomain: storeInfo?.storeDomain });
                                return badge ? <span className={styles.storeBadge}>{badge}</span> : null;
                            })()}
                        </h1>
                    </div>
                    
                    <Button
                        onClick={handleViewPayments}
                        loading={loading}
                        className={styles.button}
                    >
                        Revisar Pagos
                    </Button>

                    {transactions && transactions.length > 0 && (
                        <div className={styles.transactionsList}>
                            {isStripe ? (
                                <div className={styles.transactionsHeader}>Invoices</div>
                            ) : null}
                            {getCurrentPageTransactions().map((transaction) => (
                                <div key={transaction.id} className={isStripe ? styles.transactionItemStripe : styles.transactionItem}>
                                    <div className={styles.transactionDate}>
                                        {formatDate(transaction.paymentAttemptDate)}
                                    </div>
                                    {isStripe ? (
                                        <div className={styles.transactionProduct}>
                                            {transaction.productName || '—'}
                                        </div>
                                    ) : null}
                                    <div className={styles.transactionAmount}>
                                        {formatAmount(
                                            isStripe ? (transaction.amountDecimal ?? transaction.amount) : transaction.amount,
                                            transaction.currency
                                        )}
                                    </div>
                                    {(() => {
                                        const { label, className } = getStatusPresentation(transaction.status);
                                        return (
                                            <div className={`${styles.transactionStatus} ${className || ''}`}>
                                                {label}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))}
                            <div className={styles.paginationContainer}>
                                <Pagination
                                    current={currentPage}
                                    total={totalTransactions}
                                    pageSize={ITEMS_PER_PAGE}
                                    onChange={handlePageChange}
                                    size="small"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 