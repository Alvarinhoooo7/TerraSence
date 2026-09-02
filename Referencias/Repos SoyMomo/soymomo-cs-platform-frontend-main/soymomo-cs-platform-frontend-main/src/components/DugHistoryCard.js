import styles from '../styles/DugHistoryCard.module.css';

export default function DugHistoryCard(Props) {
    return (
        <div className={styles.generalContainer}>
            <div className={styles.imageContainer}>
                <img src={Props.image} alt="Card" className={styles.image} />
            </div>
            <div className={styles.textContainer}>
                <p className={styles.category}>Categoria: {Props.category}</p>
                <p className={styles.date}>Detectado en {Props.app} el día {Props.date} a las {Props.time}</p>
            </div>
        </div>
    )
}